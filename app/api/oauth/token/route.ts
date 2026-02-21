import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computePkceChallenge, hashOAuthCode, hashClientSecret } from "@/lib/oauth";

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  let grantType: string | null = null;
  let code: string | null = null;
  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let redirectUri: string | null = null;
  let codeVerifier: string | null = null;
  let resource: string | null = null;

  if (body) {
    grantType = body.get("grant_type") as string;
    code = body.get("code") as string;
    clientId = body.get("client_id") as string;
    clientSecret = body.get("client_secret") as string;
    redirectUri = body.get("redirect_uri") as string;
    codeVerifier = body.get("code_verifier") as string;
    resource = body.get("resource") as string;
  }

  // Also support JSON body
  if (!grantType) {
    const jsonBody = await request
      .clone()
      .json()
      .catch(() => ({})) as Record<string, string>;
    grantType = jsonBody.grant_type ?? null;
    code = jsonBody.code ?? null;
    clientId = jsonBody.client_id ?? null;
    clientSecret = jsonBody.client_secret ?? null;
    redirectUri = jsonBody.redirect_uri ?? null;
    codeVerifier = jsonBody.code_verifier ?? null;
    resource = jsonBody.resource ?? null;
  }

  if (grantType !== "authorization_code" || !code || !clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "grant_type=authorization_code, code, client_id, client_secret, and redirect_uri are required"
      },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  // Verify client credentials
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id,client_id,client_secret_hash")
    .eq("client_id", clientId)
    .single();

  if (!client || client.client_secret_hash !== hashClientSecret(clientSecret)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Verify authorization code
  const codeHash = hashOAuthCode(code);
  const { data: codeRow } = await admin
    .from("oauth_codes")
    .select("id,user_id,redirect_uri,expires_at,used_at,code_challenge,code_challenge_method,resource")
    .eq("code_hash", codeHash)
    .eq("client_id", clientId)
    .single();

  if (!codeRow) {
    return NextResponse.json({ error: "invalid_grant", error_description: "Unknown code" }, { status: 400 });
  }

  if (codeRow.used_at) {
    return NextResponse.json({ error: "invalid_grant", error_description: "Code already used" }, { status: 400 });
  }

  if (new Date(codeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "invalid_grant", error_description: "Code expired" }, { status: 400 });
  }

  if (codeRow.redirect_uri !== redirectUri) {
    return NextResponse.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
  }

  if (codeRow.resource && resource && codeRow.resource !== resource) {
    return NextResponse.json({ error: "invalid_grant", error_description: "resource mismatch" }, { status: 400 });
  }

  if (codeRow.code_challenge) {
    if (!codeVerifier) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "code_verifier is required" },
        { status: 400 }
      );
    }
    const method = codeRow.code_challenge_method ?? "plain";
    let expected = "";
    if (method === "S256") {
      expected = computePkceChallenge(codeVerifier);
    } else if (method === "plain") {
      expected = codeVerifier;
    } else {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Unsupported code_challenge_method" },
        { status: 400 }
      );
    }
    if (expected !== codeRow.code_challenge) {
      return NextResponse.json({ error: "invalid_grant", error_description: "code_verifier mismatch" }, { status: 400 });
    }
  }

  // Mark code as used
  await admin.from("oauth_codes").update({ used_at: new Date().toISOString() }).eq("id", codeRow.id);

  // Find the MCP token created during authorization
  const { data: tokenRow } = await admin
    .from("mcp_tokens")
    .select("id,token_hash")
    .eq("user_id", codeRow.user_id)
    .eq("oauth_client_id", client.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRow) {
    return NextResponse.json(
      { error: "server_error", error_description: "Token not found" },
      { status: 500 }
    );
  }

  // We can't return the original token since we only stored the hash.
  // The token was created during the authorize step. We need a way to pass it through.
  // Solution: return a new token and update the hash.
  const { generateMcpToken, hashMcpToken } = await import("@/lib/mcp");
  const newRawToken = generateMcpToken();
  const newTokenHash = hashMcpToken(newRawToken);

  await admin.from("mcp_tokens").update({ token_hash: newTokenHash }).eq("id", tokenRow.id);

  return NextResponse.json({
    access_token: newRawToken,
    token_type: "Bearer",
    scope: "mcp"
  });
}
