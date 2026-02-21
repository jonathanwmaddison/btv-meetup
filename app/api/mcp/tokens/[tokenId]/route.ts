import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function DELETE(_: Request, { params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  const { supabase, user } = await requireAuth();

  const { data: existing } = await supabase
    .from("mcp_tokens")
    .select("id,user_id,revoked_at")
    .eq("id", tokenId)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (existing.revoked_at) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", tokenId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
