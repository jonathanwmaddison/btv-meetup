import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as { title?: string; description?: string };

  if (!body.title || !body.description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ideas")
    .insert({ user_id: user.id, title: body.title.trim(), description: body.description.trim() })
    .select("id,title,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
