import { requireRole } from "@/lib/auth";
import { CfpReviewList } from "@/components/cfp-review-list";

export default async function OrganizerCfpPage() {
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { data: submissions } = await supabase
    .from("cfp_submissions")
    .select("id,title,abstract,status,created_at,user_id,event_id,speaker_id")
    .order("created_at", { ascending: false });

  return (
    <div className="grid">
      <section className="card">
        <h1>CFP Submissions</h1>
        <p className="muted">Review and manage talk proposals.</p>
      </section>

      <CfpReviewList submissions={submissions ?? []} />
    </div>
  );
}
