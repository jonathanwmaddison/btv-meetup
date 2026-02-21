import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

type PrefsPayload = {
  email_new_events?: boolean;
  email_rsvp_updates?: boolean;
  email_weekly_digest?: boolean;
  email_cfp_updates?: boolean;
};

export async function GET() {
  const { supabase, user } = await requireAuth();

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    // Return defaults
    return NextResponse.json({
      email_new_events: true,
      email_rsvp_updates: true,
      email_weekly_digest: false,
      email_cfp_updates: true
    });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as PrefsPayload;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        email_new_events: body.email_new_events ?? true,
        email_rsvp_updates: body.email_rsvp_updates ?? true,
        email_weekly_digest: body.email_weekly_digest ?? false,
        email_cfp_updates: body.email_cfp_updates ?? true
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
