import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { EventForm } from "@/components/event-form";

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { data: event } = await supabase
    .from("events")
    .select("id,title,description,starts_at,ends_at,venue,capacity,status")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  return (
    <section>
      <h1>Edit Event</h1>
      <EventForm
        endpoint={`/api/organizer/events/${event.id}`}
        method="PATCH"
        defaults={{
          title: event.title,
          description: event.description ?? "",
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          venue: event.venue,
          capacity: event.capacity,
          status: event.status
        }}
        submitLabel="Save changes"
      />
    </section>
  );
}
