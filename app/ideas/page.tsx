import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IdeaForm } from "@/components/idea-form";
import { IdeaVote } from "@/components/idea-vote";
import { fmtDate } from "@/lib/format";

export default async function IdeasPage() {
  const session = await getCurrentSession();
  const supabase = await createSupabaseServerClient();

  // Fetch all ideas with vote counts
  const { data: allIdeas } = await supabase
    .from("ideas")
    .select("id,title,description,status,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch vote tallies for visible ideas
  const ideaIds = (allIdeas ?? []).map((i) => i.id);
  const { data: allVotes } = ideaIds.length
    ? await supabase.from("idea_votes").select("idea_id,value,user_id").in("idea_id", ideaIds)
    : { data: [] };

  const votesMap = new Map<string, { up: number; down: number; userVote: number | null }>();
  for (const idea of allIdeas ?? []) {
    const ideaVotes = (allVotes ?? []).filter((v) => v.idea_id === idea.id);
    const up = ideaVotes.filter((v) => v.value === 1).length;
    const down = ideaVotes.filter((v) => v.value === -1).length;
    const userVote = session ? ideaVotes.find((v) => v.user_id === session.user.id)?.value ?? null : null;
    votesMap.set(idea.id, { up, down, userVote });
  }

  return (
    <div className="grid">
      <section className="card hero">
        <span className="eyebrow">Community</span>
        <h1>Meetup Ideas</h1>
        <p>Share topics, workshop ideas, and speaker requests with the organizers.</p>
        {!session && (
          <p>
            <Link href="/auth/login?next=/ideas" className="button-link">
              Sign in to submit &amp; vote
            </Link>
          </p>
        )}
      </section>

      {session && <IdeaForm />}

      <section className="card">
        <h2>All Ideas</h2>
        {!allIdeas?.length && <p>No ideas yet. Be the first!</p>}
        {allIdeas?.map((idea) => {
          const votes = votesMap.get(idea.id) ?? { up: 0, down: 0, userVote: null };
          return (
            <article key={idea.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{idea.title}</h3>
                  <p className="muted" style={{ margin: "0.25rem 0" }}>
                    {idea.status} &middot; {fmtDate(idea.created_at)}
                  </p>
                  {idea.description && (
                    <p style={{ margin: "0.25rem 0", fontSize: "0.92rem" }}>
                      {idea.description.length > 200 ? idea.description.slice(0, 200) + "..." : idea.description}
                    </p>
                  )}
                </div>
                {session && (
                  <IdeaVote
                    ideaId={idea.id}
                    initialUpvotes={votes.up}
                    initialDownvotes={votes.down}
                    userVote={votes.userVote}
                  />
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
