import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { fmtDate } from "@/lib/format";

const REMINDER_DELIVERY_TYPE = "event_reminder_24h";
const RSVP_UPDATE_DELIVERY_TYPE = "waitlist_promoted";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  venue: string;
  status?: "draft" | "published" | "cancelled";
};

type RsvpRow = {
  user_id: string;
};

type PrefsRow = {
  user_id: string;
  email_rsvp_updates: boolean;
};

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
};

type ChangeRow = {
  event_id: string;
  user_id: string;
};

export type EmailJobResult = {
  ok: boolean;
  job: "send-reminders" | "send-rsvp-updates";
  sent: number;
  skipped: number;
  failed: number;
  processed: number;
  details?: Record<string, unknown>;
};

export async function runSendRemindersJob(baseUrl: string): Promise<EmailJobResult> {
  const supabase = createSupabaseAdminClient();

  const now = Date.now();
  const windowStartIso = new Date(now + 23 * 60 * 60 * 1000).toISOString();
  const windowEndIso = new Date(now + 25 * 60 * 60 * 1000).toISOString();

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id,title,starts_at,venue")
    .eq("status", "published")
    .gte("starts_at", windowStartIso)
    .lt("starts_at", windowEndIso);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const event of (events ?? []) as EventRow[]) {
    const { data: rsvps, error: rsvpsError } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("event_id", event.id)
      .eq("status", "going");

    if (rsvpsError) {
      failed += 1;
      continue;
    }

    const userIds = ((rsvps ?? []) as RsvpRow[]).map((row) => row.user_id);
    if (!userIds.length) {
      continue;
    }

    const [{ data: prefs }, { data: profiles }] = await Promise.all([
      supabase
        .from("notification_preferences")
        .select("user_id,email_rsvp_updates")
        .in("user_id", userIds),
      supabase
        .from("profiles")
        .select("id,email,name")
        .in("id", userIds)
    ]);

    const prefsMap = new Map<string, boolean>();
    for (const pref of (prefs ?? []) as PrefsRow[]) {
      prefsMap.set(pref.user_id, pref.email_rsvp_updates);
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      processed += 1;

      if (!profile.email) {
        skipped += 1;
        continue;
      }

      const wantsUpdates = prefsMap.get(profile.id) ?? true;
      if (!wantsUpdates) {
        skipped += 1;
        continue;
      }

      const { data: deliveryRow, error: deliveryErr } = await supabase
        .from("email_deliveries")
        .insert({
          delivery_type: REMINDER_DELIVERY_TYPE,
          user_id: profile.id,
          event_id: event.id
        })
        .select("id")
        .single();

      if (deliveryErr) {
        if (deliveryErr.code === "23505") {
          skipped += 1;
          continue;
        }
        failed += 1;
        continue;
      }

      const eventUrl = new URL(`/events/${event.id}`, baseUrl).toString();
      const calendarUrl = new URL(`/api/events/${event.id}/calendar`, baseUrl).toString();
      const greeting = profile.name ? `Hi ${profile.name},` : "Hi,";
      const text = [
        greeting,
        "",
        "Reminder: your meetup starts in about 24 hours.",
        "",
        `Event: ${event.title}`,
        `When: ${fmtDate(event.starts_at)}`,
        `Where: ${event.venue}`,
        "",
        `Event details: ${eventUrl}`,
        `Add to calendar: ${calendarUrl}`
      ].join("\n");

      try {
        const result = await sendEmail({
          to: profile.email,
          subject: `Reminder: ${event.title} is tomorrow`,
          text
        });

        if (result.sent) {
          await supabase
            .from("email_deliveries")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", deliveryRow.id);
          sent += 1;
        } else {
          await supabase.from("email_deliveries").delete().eq("id", deliveryRow.id);
          skipped += 1;
        }
      } catch (sendErr) {
        console.error("Reminder email failed", sendErr);
        await supabase.from("email_deliveries").delete().eq("id", deliveryRow.id);
        failed += 1;
      }
    }
  }

  return {
    ok: true,
    job: "send-reminders",
    sent,
    skipped,
    failed,
    processed,
    details: {
      event_count: events?.length ?? 0,
      window_start: windowStartIso,
      window_end: windowEndIso
    }
  };
}

export async function runSendRsvpUpdatesJob(baseUrl: string): Promise<EmailJobResult> {
  const supabase = createSupabaseAdminClient();
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: changes, error: changesError } = await supabase
    .from("rsvp_status_history")
    .select("event_id,user_id")
    .eq("old_status", "waitlist")
    .eq("new_status", "going")
    .gte("changed_at", sinceIso)
    .order("changed_at", { ascending: true })
    .limit(500);

  if (changesError) {
    throw new Error(changesError.message);
  }

  const uniquePairs = new Map<string, ChangeRow>();
  for (const row of (changes ?? []) as ChangeRow[]) {
    uniquePairs.set(`${row.event_id}:${row.user_id}`, row);
  }
  const dedupedChanges = Array.from(uniquePairs.values());

  if (!dedupedChanges.length) {
    return { ok: true, job: "send-rsvp-updates", processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const eventIds = Array.from(new Set(dedupedChanges.map((row) => row.event_id)));
  const userIds = Array.from(new Set(dedupedChanges.map((row) => row.user_id)));
  const minStartTime = Date.now() - 2 * 60 * 60 * 1000;

  const [{ data: events }, { data: profiles }, { data: prefs }] = await Promise.all([
    supabase.from("events").select("id,title,starts_at,venue,status").in("id", eventIds),
    supabase.from("profiles").select("id,email,name").in("id", userIds),
    supabase
      .from("notification_preferences")
      .select("user_id,email_rsvp_updates")
      .in("user_id", userIds)
  ]);

  const eventMap = new Map<string, EventRow>();
  for (const event of (events ?? []) as EventRow[]) {
    eventMap.set(event.id, event);
  }

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of (profiles ?? []) as ProfileRow[]) {
    profileMap.set(profile.id, profile);
  }

  const prefsMap = new Map<string, boolean>();
  for (const pref of (prefs ?? []) as PrefsRow[]) {
    prefsMap.set(pref.user_id, pref.email_rsvp_updates);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of dedupedChanges) {
    const event = eventMap.get(row.event_id);
    const profile = profileMap.get(row.user_id);

    if (!event || !profile?.email) {
      skipped += 1;
      continue;
    }

    if (event.status !== "published") {
      skipped += 1;
      continue;
    }
    if (new Date(event.starts_at).getTime() < minStartTime) {
      skipped += 1;
      continue;
    }

    const wantsUpdates = prefsMap.get(profile.id) ?? true;
    if (!wantsUpdates) {
      skipped += 1;
      continue;
    }

    const { data: deliveryRow, error: deliveryErr } = await supabase
      .from("email_deliveries")
      .insert({
        delivery_type: RSVP_UPDATE_DELIVERY_TYPE,
        user_id: profile.id,
        event_id: event.id
      })
      .select("id")
      .single();

    if (deliveryErr) {
      if (deliveryErr.code === "23505") {
        skipped += 1;
        continue;
      }
      failed += 1;
      continue;
    }

    const eventUrl = new URL(`/events/${event.id}`, baseUrl).toString();
    const calendarUrl = new URL(`/api/events/${event.id}/calendar`, baseUrl).toString();
    const greeting = profile.name ? `Hi ${profile.name},` : "Hi,";
    const text = [
      greeting,
      "",
      "Good news: you were moved from the waitlist to confirmed.",
      "",
      `Event: ${event.title}`,
      `When: ${fmtDate(event.starts_at)}`,
      `Where: ${event.venue}`,
      "",
      `Event details: ${eventUrl}`,
      `Add to calendar: ${calendarUrl}`
    ].join("\n");

    try {
      const result = await sendEmail({
        to: profile.email,
        subject: `You are in: ${event.title}`,
        text
      });

      if (result.sent) {
        await supabase
          .from("email_deliveries")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", deliveryRow.id);
        sent += 1;
      } else {
        await supabase.from("email_deliveries").delete().eq("id", deliveryRow.id);
        skipped += 1;
      }
    } catch (sendErr) {
      console.error("RSVP update email failed", sendErr);
      await supabase.from("email_deliveries").delete().eq("id", deliveryRow.id);
      failed += 1;
    }
  }

  return {
    ok: true,
    job: "send-rsvp-updates",
    sent,
    skipped,
    failed,
    processed: dedupedChanges.length
  };
}
