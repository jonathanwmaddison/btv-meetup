import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { EmailJobsPanel } from "@/components/email-jobs-panel";
import Link from "next/link";

type DeliveryRow = {
  id: string;
  delivery_type: string;
  created_at: string;
  sent_at: string | null;
  event: Array<{ title: string; starts_at: string }>;
  recipient: Array<{ email: string | null }>;
};

export default async function AdminEmailJobsPage() {
  await requireRole(["admin"]);
  const supabase = createSupabaseAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [totalSentRes, reminderSentRes, waitlistSentRes, recentRes] = await Promise.all([
    supabase
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .not("sent_at", "is", null)
      .gte("sent_at", since24h),
    supabase
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("delivery_type", "event_reminder_24h")
      .not("sent_at", "is", null)
      .gte("sent_at", since24h),
    supabase
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("delivery_type", "waitlist_promoted")
      .not("sent_at", "is", null)
      .gte("sent_at", since24h),
    supabase
      .from("email_deliveries")
      .select(
        "id,delivery_type,created_at,sent_at,event:events!email_deliveries_event_id_fkey(title,starts_at),recipient:profiles!email_deliveries_user_id_fkey(email)"
      )
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  const totalSent24h = totalSentRes.count ?? 0;
  const remindersSent24h = reminderSentRes.count ?? 0;
  const waitlistSent24h = waitlistSentRes.count ?? 0;
  const recent = (recentRes.data ?? []) as DeliveryRow[];

  return (
    <div className="grid">
      <section className="card hero">
        <span className="eyebrow">Admin</span>
        <h1>Email Operations</h1>
        <p className="muted">Run reminder jobs manually and inspect recent delivery activity.</p>
        <p>
          <Link href="/admin/users">Manage users</Link>
        </p>
      </section>

      <EmailJobsPanel
        totalSent24h={totalSent24h}
        remindersSent24h={remindersSent24h}
        waitlistSent24h={waitlistSent24h}
      />

      <section className="card">
        <h2>Recent Email Deliveries</h2>
        {!recent.length && <p>No deliveries yet.</p>}
        {recent.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Recipient</th>
                <th>Event</th>
                <th>Event Time</th>
                <th>Created</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                (() => {
                  const event = row.event?.[0];
                  const recipient = row.recipient?.[0];
                  return (
                    <tr key={row.id}>
                      <td>{row.delivery_type}</td>
                      <td>{recipient?.email ?? "Unknown"}</td>
                      <td>{event?.title ?? "Unknown event"}</td>
                      <td>{fmtDate(event?.starts_at ?? null)}</td>
                      <td>{fmtDate(row.created_at)}</td>
                      <td>{row.sent_at ? fmtDate(row.sent_at) : "Pending"}</td>
                    </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
