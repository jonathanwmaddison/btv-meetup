import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: "upcoming" | "past" }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("events").select("id,title,starts_at,venue,status").eq("status", "published").order("starts_at");

  if (tab === "upcoming") {
    query = query.gte("starts_at", new Date().toISOString());
  } else {
    query = query.lt("starts_at", new Date().toISOString());
  }

  const { data: events } = await query;

  return (
    <div className="grid">
      <section className="card hero">
        <span className="eyebrow">Burlington and Beyond AI Meetup</span>
        <h1>Upcoming and past events</h1>
        <p className="muted">AI, code, software, and tooling sessions for the Burlington community and beyond.</p>
        <p>
          <Link href="/events?tab=upcoming">Upcoming</Link> | <Link href="/events?tab=past">Past</Link>
        </p>
      </section>

      {events?.map((event) => (
        <article key={event.id} className="card">
          <h2>{event.title}</h2>
          <p>{fmtDate(event.starts_at)}</p>
          <p>{event.venue}</p>
          <Link href={`/events/${event.id}`}>Details</Link>
        </article>
      ))}

      {!events?.length && <p>No events found.</p>}
    </div>
  );
}
