import { NextResponse } from "next/server";

function getAppUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envUrl) return envUrl;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8000";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const appUrl = getAppUrl(request);
  return NextResponse.json({
    status: "ok",
    app_url: appUrl,
    mcp_endpoint: `${appUrl}/api/mcp`,
    oauth_authorize: `${appUrl}/api/oauth/authorize`,
    oauth_token: `${appUrl}/api/oauth/token`,
    oauth_register: `${appUrl}/api/oauth/register`,
    time: new Date().toISOString()
  });
}
