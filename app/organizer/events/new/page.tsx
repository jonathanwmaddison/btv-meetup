import { requireRole } from "@/lib/auth";
import { EventForm } from "@/components/event-form";

export default async function NewEventPage() {
  await requireRole(["organizer", "admin"]);
  return (
    <section>
      <h1>New Event</h1>
      <EventForm endpoint="/api/organizer/events" method="POST" submitLabel="Create event" />
    </section>
  );
}
