import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";
import { getCurrentSession } from "@/lib/auth";
import { RsvpButton } from "@/components/rsvp-button";
import { FeedbackForm } from "@/components/feedback-form";
import { CheckinButton } from "@/components/checkin-button";
import Link from "next/link";

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const session = await getCurrentSession();
  const currentUserId = session?.user.id;

  const [{ data: event }, { data: rsvps }, { data: myRsvp }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,description,starts_at,ends_at,venue,capacity,status")
      .eq("id", eventId)
      .single(),
    supabase.from("rsvps").select("status").eq("event_id", eventId),
    currentUserId
      ? supabase
          .from("rsvps")
          .select("status")
          .eq("event_id", eventId)
          .eq("user_id", currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  if (!event) {
    notFound();
  }

  const going = rsvps?.filter((r) => r.status === "going").length ?? 0;
  const waitlist = rsvps?.filter((r) => r.status === "waitlist").length ?? 0;
  const isPast = new Date(event.starts_at) < new Date();

  return (
    <>
      <article className="card hero">
        <span className="eyebrow">Burlington and Beyond AI Meetup Event</span>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <p>
          <strong>When:</strong> {fmtDate(event.starts_at)} {event.ends_at ? `to ${fmtDate(event.ends_at)}` : ""}
        </p>
        <p>
          <strong>Where:</strong> {event.venue}
        </p>
        <p>
          <strong>Capacity:</strong> {going}/{event.capacity} going, {waitlist} waitlisted
        </p>
        {!isPast && (
          <section className="card" style={{ marginTop: "0.75rem" }}>
            <h2 style={{ marginBottom: "0.4rem" }}>Your plan</h2>
            <p className="muted" style={{ marginBottom: "0.65rem" }}>1. RSVP. 2. Add calendar invite. 3. Turn on reminders.</p>
            {session ? (
              <>
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>RSVP status:</strong> {myRsvp?.status ?? "not RSVP'd yet"}
                </p>
                <RsvpButton eventId={event.id} />
                <p style={{ marginTop: "0.75rem", marginBottom: "0.45rem" }}>
                  <Link href={`/api/events/${eventId}/calendar`} className="button-link ghost" style={{ display: "inline-flex", fontSize: "0.9rem" }}>
                    Add to Calendar (.ics)
                  </Link>
                </p>
                <p style={{ marginBottom: "0.65rem" }}>
                  <Link href="/settings/notifications">Reminder settings</Link>
                </p>
                <CheckinButton eventId={event.id} />
              </>
            ) : (
              <p>
                <Link href="/auth/login">Sign in</Link> to RSVP and manage reminders. You can still{" "}
                <Link href={`/api/events/${eventId}/calendar`}>download the calendar invite</Link>.
              </p>
            )}
          </section>
        )}
      </article>

      {isPast && session && <FeedbackForm eventId={event.id} />}
    </>
  );
}
