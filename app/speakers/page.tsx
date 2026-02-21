import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SpeakersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: speakers } = await supabase
    .from("speakers")
    .select("id,name,bio,website")
    .order("name", { ascending: true });

  return (
    <>
      <section className="card hero">
        <span className="eyebrow">Community</span>
        <h1>Speakers</h1>
        <p className="muted">People who have spoken or want to speak at BTV meetups.</p>
      </section>

      {!speakers?.length && (
        <section className="card">
          <p>No speaker profiles yet. Submit a talk proposal to get listed!</p>
        </section>
      )}

      <div className="grid two">
        {speakers?.map((speaker) => (
          <article key={speaker.id} className="card">
            <h3>{speaker.name}</h3>
            {speaker.bio && <p className="muted">{speaker.bio}</p>}
            {speaker.website && (
              <p>
                <a href={speaker.website} target="_blank" rel="noopener noreferrer">
                  Website
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
