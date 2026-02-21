import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";

export default async function DashboardPage() {
  const { supabase, user } = await requireAuth();

  const [{ data: myRsvps }, { data: myIdeas }] = await Promise.all([
    supabase
      .from("rsvps")
      .select("id,status,event:events!rsvps_event_id_fkey(id,title,starts_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("ideas").select("id,title,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)
  ]);

  return (
    <div className="grid two">
      <section className="card">
        <h2>My RSVPs</h2>
        <p>
          <Link href="/dashboard/rsvps">Manage RSVPs</Link>
        </p>
        {!myRsvps?.length && <p>None yet.</p>}
        {myRsvps?.map((row) => (
          <p key={row.id}>
            {(row.event as { title?: string })?.title ?? "Event"} - {row.status} - {fmtDate((row.event as { starts_at?: string })?.starts_at ?? null)}
          </p>
        ))}
      </section>

      <section className="card">
        <h2>My ideas</h2>
        <p>
          <Link href="/ideas">Submit idea</Link>
        </p>
        {!myIdeas?.length && <p>No ideas yet.</p>}
        {myIdeas?.map((idea) => (
          <p key={idea.id}>
            {idea.title} - {idea.status}
          </p>
        ))}
      </section>
    </div>
  );
}
