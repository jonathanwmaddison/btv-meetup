import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await params;
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as { value?: number };

  if (body.value !== 1 && body.value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("idea_votes")
    .upsert(
      { idea_id: ideaId, user_id: user.id, value: body.value },
      { onConflict: "idea_id,user_id" }
    )
    .select("id,value")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await params;
  const { supabase, user } = await requireAuth();

  const { error } = await supabase
    .from("idea_votes")
    .delete()
    .eq("idea_id", ideaId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
