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
    resource: `${appUrl}/api/mcp`,
    authorization_servers: [appUrl],
    scopes_supported: ["mcp"],
    token_types_supported: ["Bearer"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${appUrl}/settings/integrations`
  });
}
