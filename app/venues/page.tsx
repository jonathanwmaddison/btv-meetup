import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VenuesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id,name,address,capacity,accessibility_notes,parking_info,website")
    .order("name", { ascending: true });

  return (
    <>
      <section className="card hero">
        <span className="eyebrow">Community</span>
        <h1>Venue Directory</h1>
        <p className="muted">Burlington-area venues for tech meetups.</p>
      </section>

      {!venues?.length && (
        <section className="card">
          <p>No venues yet. Organizers can add venues when creating events.</p>
        </section>
      )}

      <div className="grid two">
        {venues?.map((venue) => (
          <article key={venue.id} className="card">
            <h3>{venue.name}</h3>
            <p>{venue.address}</p>
            {venue.capacity && <p className="muted">Capacity: {venue.capacity}</p>}
            {venue.accessibility_notes && <p className="muted">Accessibility: {venue.accessibility_notes}</p>}
            {venue.parking_info && <p className="muted">Parking: {venue.parking_info}</p>}
            {venue.website && (
              <p>
                <a href={venue.website} target="_blank" rel="noopener noreferrer">
                  Website
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
