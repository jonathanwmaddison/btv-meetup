import { requireRole } from "@/lib/auth";

function toCsv(rows: { email: string | null; name: string | null; status: string }[]) {
  const lines = ["name,email,status", ...rows.map((r) => `${r.name ?? ""},${r.email ?? ""},${r.status}`)];
  return lines.join("\n");
}

export default async function AttendeesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { data: rows } = await supabase
    .from("rsvps")
    .select("status, profile:profiles!rsvps_user_id_fkey(name,email)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const attendees =
    rows?.map((row) => {
      const profile = row.profile as unknown as { name: string | null; email: string | null };
      return {
        name: profile?.name ?? null,
        email: profile?.email ?? null,
        status: row.status
      };
    }) ?? [];

  const csv = encodeURIComponent(toCsv(attendees));

  return (
    <section className="card">
      <h1>Attendees</h1>
      <p>
        <a href={`data:text/csv;charset=utf-8,${csv}`} download={`event-${eventId}-attendees.csv`}>
          Download CSV
        </a>
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map((row, idx) => (
            <tr key={`${row.email}-${idx}`}>
              <td>{row.name ?? ""}</td>
              <td>{row.email ?? ""}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
