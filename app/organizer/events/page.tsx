import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

export default async function OrganizerEventsPage() {
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { data: events } = await supabase
    .from("events")
    .select("id,title,starts_at,status,venue")
    .order("starts_at", { ascending: false });

  return (
    <section className="card">
      <h1>Organizer Events</h1>
      <p>
        <Link href="/organizer/events/new">Create event</Link>
      </p>
      {!events?.length && <p>No events yet.</p>}
      {events?.map((event) => (
        <article className="card" key={event.id}>
          <h3>{event.title}</h3>
          <p>{fmtDate(event.starts_at)}</p>
          <p>
            {event.venue} - {event.status}
          </p>
          <p>
            <Link href={`/organizer/events/${event.id}/edit`}>Edit</Link> |{" "}
            <Link href={`/organizer/events/${event.id}/attendees`}>Attendees</Link>
          </p>
        </article>
      ))}
    </section>
  );
}
