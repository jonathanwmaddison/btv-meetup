import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateOAuthCode, hashOAuthCode } from "@/lib/oauth";
import { generateMcpToken, hashMcpToken } from "@/lib/mcp";

function getAppUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envUrl) return envUrl;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8000";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const responseType = url.searchParams.get("response_type");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const resource = url.searchParams.get("resource");

  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_id, redirect_uri, and response_type=code are required" },
      { status: 400 }
    );
  }

  if ((codeChallengeMethod && !codeChallenge) || (codeChallenge && codeChallengeMethod === "")) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "code_challenge_method requires code_challenge" },
      { status: 400 }
    );
  }

  if (codeChallengeMethod && !["S256", "plain"].includes(codeChallengeMethod)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unsupported code_challenge_method" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id,client_name,redirect_uris")
    .eq("client_id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "invalid_client", error_description: "Unknown client_id" }, { status: 400 });
  }

  const allowedUris = client.redirect_uris as string[];
  if (!allowedUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri not registered" },
      { status: 400 }
    );
  }

  // Check if the user is authenticated
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with a return URL back here
    const loginUrl = new URL("/auth/login", getAppUrl(request));
    loginUrl.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to consent page
  const consentUrl = new URL("/oauth/authorize", getAppUrl(request));
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("client_name", client.client_name);
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  if (state) consentUrl.searchParams.set("state", state);
  if (codeChallenge) consentUrl.searchParams.set("code_challenge", codeChallenge);
  if (codeChallengeMethod) consentUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
  if (resource) consentUrl.searchParams.set("resource", resource);
  return NextResponse.redirect(consentUrl);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.formData();
  const clientId = body.get("client_id") as string;
  const redirectUri = body.get("redirect_uri") as string;
  const state = body.get("state") as string | null;
  const action = body.get("action") as string;
  const codeChallenge = body.get("code_challenge") as string | null;
  const codeChallengeMethod = body.get("code_challenge_method") as string | null;
  const resource = body.get("resource") as string | null;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id,redirect_uris")
    .eq("client_id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  if (action === "deny") {
    const denyUrl = new URL(redirectUri);
    denyUrl.searchParams.set("error", "access_denied");
    if (state) denyUrl.searchParams.set("state", state);
    return NextResponse.redirect(denyUrl, 302);
  }

  // action === "approve": generate authorization code
  const code = generateOAuthCode();
  const codeHash = hashOAuthCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await admin.from("oauth_codes").insert({
    client_id: clientId,
    user_id: user.id,
    code_hash: codeHash,
    code_challenge: codeChallenge ?? null,
    code_challenge_method: codeChallengeMethod ?? (codeChallenge ? "plain" : null),
    resource: resource ?? null,
    redirect_uri: redirectUri,
    expires_at: expiresAt
  });

  // Also pre-create the MCP token so the token exchange is fast
  const rawToken = generateMcpToken();
  const tokenHash = hashMcpToken(rawToken);
  await admin.from("mcp_tokens").insert({
    user_id: user.id,
    label: `OAuth: ${clientId}`,
    token_hash: tokenHash,
    oauth_client_id: client.id
  });

  // Store the raw token temporarily keyed by code hash for token exchange
  // We encode it in the code itself: code|token (the client never sees the token part in the code)
  // Actually, let's use a simpler approach: store rawToken in oauth_codes as a transient field
  // But since we don't have that column, we'll use a different approach:
  // The token exchange endpoint will just find the most recent unrevoked token for this user+client

  const approveUrl = new URL(redirectUri);
  approveUrl.searchParams.set("code", code);
  if (state) approveUrl.searchParams.set("state", state);
  return NextResponse.redirect(approveUrl, 302);
}
