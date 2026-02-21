import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/dashboard", "/organizer", "/admin", "/settings", "/oauth/authorize"];

export async function middleware(request: NextRequest) {
  // If a code param arrives on a non-callback route, redirect to the callback
  // handler so the code gets exchanged for a session. This happens when
  // Supabase falls back to site_url instead of the requested emailRedirectTo.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (protectedPrefixes.some((prefix) => path.startsWith(prefix)) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
