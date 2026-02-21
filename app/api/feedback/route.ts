import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

type FeedbackPayload = {
  event_id?: string;
  rating?: number;
  comment?: string | null;
};

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as FeedbackPayload;

  if (!body.event_id || (body.rating !== 1 && body.rating !== -1)) {
    return NextResponse.json({ error: "event_id and rating (1 or -1) are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .upsert(
      {
        event_id: body.event_id,
        user_id: user.id,
        rating: body.rating,
        comment: body.comment?.trim().slice(0, 2000) ?? null
      },
      { onConflict: "event_id,user_id" }
    )
    .select("id,rating,comment")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
