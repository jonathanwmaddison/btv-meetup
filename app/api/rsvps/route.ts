import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { fmtDate } from "@/lib/format";

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as { event_id?: string };

  if (!body.event_id) {
    return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rsvps")
    .upsert({ event_id: body.event_id, user_id: user.id, status: "going" }, { onConflict: "event_id,user_id" })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const [{ data: event }, { data: prefs }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,starts_at,venue")
      .eq("id", body.event_id)
      .single(),
    supabase
      .from("notification_preferences")
      .select("email_rsvp_updates")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (event && user.email && (prefs?.email_rsvp_updates ?? true)) {
    const eventUrl = new URL(`/events/${event.id}`, request.url).toString();
    const calendarUrl = new URL(`/api/events/${event.id}/calendar`, request.url).toString();
    const statusText = data.status === "waitlist" ? "waitlist" : "going";

    const subject =
      data.status === "waitlist"
        ? `Waitlist confirmed: ${event.title}`
        : `RSVP confirmed: ${event.title}`;

    const text = [
      `Your RSVP is set to: ${statusText}.`,
      "",
      `Event: ${event.title}`,
      `When: ${fmtDate(event.starts_at)}`,
      `Where: ${event.venue}`,
      "",
      `Event details: ${eventUrl}`,
      `Add to calendar: ${calendarUrl}`,
      "",
      "Manage reminder emails in Settings > Notifications."
    ].join("\n");

    try {
      await sendEmail({
        to: user.email,
        subject,
        text
      });
    } catch (sendErr) {
      console.error("Failed to send RSVP email", sendErr);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
