import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OAuthConsentForm } from "@/components/oauth-consent-form";

type Props = {
  searchParams: Promise<{
    client_id?: string;
    client_name?: string;
    redirect_uri?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    resource?: string;
  }>;
};

export default async function OAuthAuthorizePage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const entries = Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0);
    const qs = new URLSearchParams(entries).toString();
    redirect(`/auth/login?next=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  }

  if (!params.client_id || !params.redirect_uri) {
    return (
      <section className="card">
        <h1>Invalid Request</h1>
        <p>Missing required OAuth parameters.</p>
      </section>
    );
  }

  return (
    <OAuthConsentForm
      clientId={params.client_id}
      clientName={params.client_name ?? params.client_id}
      redirectUri={params.redirect_uri}
      state={params.state ?? ""}
      codeChallenge={params.code_challenge ?? ""}
      codeChallengeMethod={params.code_challenge_method ?? ""}
      resource={params.resource ?? ""}
      userEmail={user.email ?? ""}
    />
  );
}
