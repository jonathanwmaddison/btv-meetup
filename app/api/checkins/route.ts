import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as { event_id?: string };

  if (!body.event_id) {
    return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("checkins")
    .upsert(
      { event_id: body.event_id, user_id: user.id },
      { onConflict: "event_id,user_id" }
    )
    .select("id,checked_in_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
