import { NextResponse } from "next/server";

function getAppUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envUrl) {
    try {
      const host = new URL(envUrl).hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        return envUrl;
      }
    } catch {
      // fall through to header-derived URL
    }
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8000";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const appUrl = getAppUrl(request);
  return NextResponse.json({
    issuer: appUrl,
    authorization_endpoint: `${appUrl}/api/oauth/authorize`,
    token_endpoint: `${appUrl}/api/oauth/token`,
    registration_endpoint: `${appUrl}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["mcp"]
  });
}
