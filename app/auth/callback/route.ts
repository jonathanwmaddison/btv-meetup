import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const cookieNext = request.cookies.get("btv_next")?.value;
  const nextParam = request.nextUrl.searchParams.get("next");
  const candidate = (nextParam ?? cookieNext ?? "/dashboard").trim();
  const next = candidate.startsWith("/") ? candidate : "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const appUrl = envAppUrl
    ? envAppUrl
    : `${forwardedProto ?? "https"}://${forwardedHost ?? request.nextUrl.host}`;

  if (code) {
    const redirectUrl = new URL(next, appUrl);
    const response = NextResponse.redirect(redirectUrl);
    if (cookieNext) {
      response.cookies.set("btv_next", "", { path: "/", maxAge: 0 });
    }

    const supabase = createServerClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: Array<{
              name: string;
              value: string;
              options?: Parameters<typeof response.cookies.set>[2];
            }>
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/auth/login", request.url));
}
