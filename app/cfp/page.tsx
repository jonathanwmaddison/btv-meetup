import { getCurrentSession } from "@/lib/auth";
import { CfpForm } from "@/components/cfp-form";

export default async function CfpPage() {
  const session = await getCurrentSession();

  return (
    <>
      <section className="card hero">
        <span className="eyebrow">Speak</span>
        <h1>Call for Proposals</h1>
        <p className="muted">Want to give a talk at a BTV meetup? Submit your proposal here.</p>
      </section>

      {session ? (
        <CfpForm />
      ) : (
        <section className="card">
          <p>
            <a href="/auth/login?next=/cfp">Sign in</a> to submit a talk proposal.
          </p>
        </section>
      )}
    </>
  );
}
