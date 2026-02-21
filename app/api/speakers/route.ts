import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SpeakerPayload = {
  name?: string;
  bio?: string | null;
  website?: string | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("speakers")
    .select("id,name,bio,website,user_id,created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ speakers: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as SpeakerPayload;

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("speakers")
    .insert({
      name: body.name.trim(),
      bio: body.bio?.trim() ?? null,
      website: body.website?.trim() ?? null,
      user_id: user.id
    })
    .select("id,name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
