import { requireRole } from "@/lib/auth";
import { VenueForm } from "@/components/venue-form";

export default async function OrganizerVenuesPage() {
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { data: venues } = await supabase
    .from("venues")
    .select("id,name,address,capacity,accessibility_notes,parking_info,website")
    .order("name", { ascending: true });

  return (
    <div className="grid">
      <section className="card">
        <h1>Manage Venues</h1>
        <p className="muted">Add and manage venues for your events.</p>
      </section>

      <VenueForm />

      <section className="card">
        <h2>Existing Venues</h2>
        {!venues?.length && <p>No venues yet.</p>}
        {venues?.map((venue) => (
          <article key={venue.id} className="card">
            <h3>{venue.name}</h3>
            <p>{venue.address}</p>
            {venue.capacity && <p className="muted">Capacity: {venue.capacity}</p>}
            {venue.accessibility_notes && <p className="muted">Accessibility: {venue.accessibility_notes}</p>}
            {venue.parking_info && <p className="muted">Parking: {venue.parking_info}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
