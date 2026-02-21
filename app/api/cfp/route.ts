import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

type CfpPayload = {
  event_id?: string | null;
  speaker_id?: string | null;
  title?: string;
  abstract?: string;
};

export async function GET(request: Request) {
  const { supabase, user } = await requireAuth();
  const url = new URL(request.url);
  const eventId = url.searchParams.get("event_id");

  let query = supabase
    .from("cfp_submissions")
    .select("id,title,abstract,status,event_id,speaker_id,user_id,created_at")
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  // Non-organizers only see their own
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "member";
  if (role === "member") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as CfpPayload;

  if (!body.title || !body.abstract) {
    return NextResponse.json({ error: "title and abstract are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cfp_submissions")
    .insert({
      event_id: body.event_id ?? null,
      speaker_id: body.speaker_id ?? null,
      user_id: user.id,
      title: body.title.trim(),
      abstract: body.abstract.trim()
    })
    .select("id,title,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
