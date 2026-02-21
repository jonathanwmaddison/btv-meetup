import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("id,title,starts_at,venue")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5);
  const nextEvent = events?.[0] ?? null;

  return (
    <div className="grid">
      <section className="card hero">
        <p className="eyebrow">Burlington, VT and beyond</p>
        <h1>Find the meetup, RSVP, and get a reminder</h1>
        <p className="muted">
          The Burlington and beyond AI code/software/tooling meetup hub. Pick an event, RSVP in one click, and add it to your calendar.
        </p>
        <div className="hero-actions">
          <Link className="button-link" href="/events">
            See upcoming meetups
          </Link>
          <Link className="button-link ghost" href="/settings/notifications">
            Set reminder emails
          </Link>
        </div>
        <div className="metrics-grid">
          <article className="metric">
            <p className="metric-value">{events?.length ?? 0}</p>
            <p className="metric-label">Upcoming events</p>
          </article>
          <article className="metric">
            <p className="metric-value">1 click</p>
            <p className="metric-label">RSVP and save your spot</p>
          </article>
          <article className="metric">
            <p className="metric-value">.ics export</p>
            <p className="metric-label">Works with Google, Apple, Outlook</p>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>How it works</h2>
        <p>1. Open an event and RSVP.</p>
        <p>2. Add the event to your calendar with one click.</p>
        <p>3. Turn on reminder emails in Notification Settings.</p>
      </section>

      <section className="card">
        <h2>Next meetup</h2>
        {!nextEvent && <p>No published events yet.</p>}
        {nextEvent && (
          <article className="card event-preview">
            <div>
              <h3>{nextEvent.title}</h3>
              <p className="muted">{fmtDate(nextEvent.starts_at)}</p>
              <p>{nextEvent.venue}</p>
            </div>
            <Link href={`/events/${nextEvent.id}`} className="button-link">
              RSVP + calendar
            </Link>
          </article>
        )}
      </section>

      <section className="card">
        <h2>All upcoming</h2>
        <p className="muted">Published events in start-date order.</p>
        {!events?.length && <p>No published events yet.</p>}
        {events?.map((event) => (
          <article key={event.id} className="card event-preview">
            <div>
              <h3>{event.title}</h3>
              <p className="muted">{fmtDate(event.starts_at)}</p>
              <p>{event.venue}</p>
            </div>
            <Link href={`/events/${event.id}`}>View event</Link>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Optional: AI assistant via MCP</h2>
        <p className="muted">
          If you like the MCP idea, connect an assistant to browse Burlington and beyond AI meetup events, RSVP, and manage actions on your behalf.
        </p>
        <Link href="/settings/integrations">Open integrations</Link>
      </section>
    </div>
  );
}
