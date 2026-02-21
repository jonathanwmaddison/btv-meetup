import { requireRole } from "@/lib/auth";
import { headers } from "next/headers";

export default async function EventCheckinsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);

  const [{ data: event }, { data: checkins }] = await Promise.all([
    supabase.from("events").select("id,title,venue,starts_at").eq("id", eventId).single(),
    supabase
      .from("checkins")
      .select("id,checked_in_at,profile:profiles!checkins_user_id_fkey(name,email)")
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true })
  ]);

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:8000";
  const appUrl = envAppUrl || `${proto}://${host}`;
  const checkinUrl = `${appUrl}/events/${eventId}/checkin`;

  if (!event) {
    return (
      <section className="card">
        <p>Event not found.</p>
      </section>
    );
  }

  const attendees = (checkins ?? []).map((c) => {
    const profile = c.profile as unknown as { name: string | null; email: string | null };
    return { name: profile?.name ?? "", email: profile?.email ?? "", checked_in_at: c.checked_in_at };
  });

  return (
    <div className="grid">
      <section className="card">
        <h1>Check-ins: {event.title}</h1>
        <p className="muted">{attendees.length} checked in</p>
      </section>

      <section className="card">
        <h2>Check-in Link</h2>
        <p className="muted">Share this link or display it as a QR code at the venue for attendees to check in:</p>
        <code style={{ display: "block", padding: "0.5rem", wordBreak: "break-all" }}>{checkinUrl}</code>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Tip: Use any QR code generator to create a printable QR code from this URL.
        </p>
      </section>

      <section className="card">
        <h2>Checked-in Attendees</h2>
        {!attendees.length && <p>No check-ins yet.</p>}
        {attendees.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Checked In At</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{new Date(a.checked_in_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
