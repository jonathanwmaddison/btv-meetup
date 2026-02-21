"use client";

type Props = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  userEmail: string;
};

export function OAuthConsentForm({
  clientId,
  clientName,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
  resource,
  userEmail
}: Props) {
  return (
    <section className="card" style={{ maxWidth: 480, margin: "2rem auto" }}>
      <h1>Authorize {clientName}</h1>
      <p className="muted">
        <strong>{clientName}</strong> wants to access your BTV Meetup account as <strong>{userEmail}</strong>.
      </p>
      <p>This will allow the application to:</p>
      <ul>
        <li>View and RSVP to events on your behalf</li>
        <li>Submit and vote on meetup ideas</li>
        <li>View your profile and RSVPs</li>
        <li>Check in to events</li>
      </ul>
      <form action="/api/oauth/authorize" method="POST" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="state" value={state} />
        {codeChallenge && <input type="hidden" name="code_challenge" value={codeChallenge} />}
        {codeChallengeMethod && <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />}
        {resource && <input type="hidden" name="resource" value={resource} />}
        <button type="submit" name="action" value="approve">
          Authorize
        </button>
        <button type="submit" name="action" value="deny" className="secondary">
          Deny
        </button>
      </form>
    </section>
  );
}
