import { getCurrentSession } from "@/lib/auth";
import { CheckinButton } from "@/components/checkin-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function CheckinPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const session = await getCurrentSession();

  const { data: event } = await supabase
    .from("events")
    .select("id,title,venue,starts_at")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  return (
    <section className="card" style={{ maxWidth: 480, margin: "2rem auto", textAlign: "center" }}>
      <h1>Check In</h1>
      <h2>{event.title}</h2>
      <p className="muted">{event.venue}</p>
      {session ? (
        <CheckinButton eventId={event.id} />
      ) : (
        <p>
          <a href={`/auth/login?next=/events/${eventId}/checkin`}>Sign in</a> to check in.
        </p>
      )}
    </section>
  );
}
