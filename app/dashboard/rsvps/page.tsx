import { requireAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { CancelRsvpButton } from "@/components/cancel-rsvp-button";

export default async function RsvpsPage() {
  const { supabase, user } = await requireAuth();

  const { data: rows } = await supabase
    .from("rsvps")
    .select("id,status,event:events!rsvps_event_id_fkey(id,title,starts_at,venue)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <section className="card">
      <h1>My RSVPs</h1>
      {!rows?.length && <p>No RSVPs yet.</p>}
      {rows?.map((row) => (
        <article key={row.id} className="card">
          <h3>{(row.event as { title?: string })?.title ?? "Event"}</h3>
          <p>{fmtDate((row.event as { starts_at?: string })?.starts_at ?? null)}</p>
          <p>Status: {row.status}</p>
          {row.status !== "cancelled" ? <CancelRsvpButton rsvpId={row.id} /> : <p className="muted">Cancelled</p>}
        </article>
      ))}
    </section>
  );
}
