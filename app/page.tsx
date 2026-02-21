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
        <h1>The AI meetup hub for Burlington</h1>
        <p className="muted" style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
          Find upcoming AI, code, and tooling meetups. RSVP in one click, get calendar invites, and never miss a session.
        </p>
        <div className="hero-actions">
          <Link className="button-link" href="/events">
            Browse events
          </Link>
          <Link className="button-link ghost" href="/ideas">
            Suggest a topic
          </Link>
        </div>
        <div className="metrics-grid">
          <article className="metric">
            <p className="metric-value">{events?.length ?? 0}</p>
            <p className="metric-label">Upcoming events</p>
          </article>
          <article className="metric">
            <p className="metric-value">1-click RSVP</p>
            <p className="metric-label">Save your spot instantly</p>
          </article>
          <article className="metric">
            <p className="metric-value">.ics export</p>
            <p className="metric-label">Google, Apple, Outlook</p>
          </article>
        </div>
      </section>

      {nextEvent && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Next meetup</p>
          <article className="event-preview" style={{ padding: 0 }}>
            <div>
              <h2 style={{ marginBottom: "0.3rem" }}>{nextEvent.title}</h2>
              <p className="muted" style={{ marginBottom: "0.15rem" }}>{fmtDate(nextEvent.starts_at)}</p>
              <p style={{ marginBottom: 0 }}>{nextEvent.venue}</p>
            </div>
            <Link href={`/events/${nextEvent.id}`} className="button-link">
              RSVP
            </Link>
          </article>
        </section>
      )}

      <section className="card">
        <h2>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "1.8rem", marginBottom: "0.3rem", fontFamily: "var(--font-heading), 'Instrument Serif', Georgia, serif" }}>1</p>
            <p style={{ marginBottom: 0 }}>Open an event and RSVP with one click.</p>
          </div>
          <div>
            <p style={{ fontSize: "1.8rem", marginBottom: "0.3rem", fontFamily: "var(--font-heading), 'Instrument Serif', Georgia, serif" }}>2</p>
            <p style={{ marginBottom: 0 }}>Download the .ics calendar invite.</p>
          </div>
          <div>
            <p style={{ fontSize: "1.8rem", marginBottom: "0.3rem", fontFamily: "var(--font-heading), 'Instrument Serif', Georgia, serif" }}>3</p>
            <p style={{ marginBottom: 0 }}>Turn on email reminders so you never forget.</p>
          </div>
        </div>
      </section>

      {events && events.length > 1 && (
        <section className="card">
          <h2>All upcoming</h2>
          <p className="muted">Published events in start-date order.</p>
          {events.map((event) => (
            <article key={event.id} className="card event-preview" style={{ marginBottom: "0.5rem" }}>
              <div>
                <h3 style={{ marginBottom: "0.15rem" }}>{event.title}</h3>
                <p className="muted" style={{ marginBottom: "0.1rem", fontSize: "0.9rem" }}>{fmtDate(event.starts_at)}</p>
                <p style={{ marginBottom: 0, fontSize: "0.9rem" }}>{event.venue}</p>
              </div>
              <Link href={`/events/${event.id}`}>View</Link>
            </article>
          ))}
        </section>
      )}

      <section className="card" style={{ borderLeft: "3px solid var(--accent-warm)" }}>
        <h2>AI assistant via MCP</h2>
        <p className="muted">
          Connect an assistant to browse events, RSVP, and manage your meetup activity programmatically.
        </p>
        <Link href="/settings/integrations" className="button-link ghost" style={{ marginTop: "0.3rem" }}>
          Open integrations
        </Link>
      </section>
    </div>
  );
}
