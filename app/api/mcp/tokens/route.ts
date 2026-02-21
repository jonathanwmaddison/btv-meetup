import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateMcpToken, hashMcpToken } from "@/lib/mcp";

type CreateTokenBody = { label?: string };

export async function GET() {
  const { supabase, user } = await requireAuth();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id,label,created_at,last_used_at,revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireAuth();
  const body = (await request.json().catch(() => ({}))) as CreateTokenBody;

  const { count } = await supabase
    .from("mcp_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "You already have 5 active MCP tokens. Revoke one before creating another." }, { status: 400 });
  }

  const rawToken = generateMcpToken();
  const tokenHash = hashMcpToken(rawToken);
  const label = body.label?.trim().slice(0, 80) || "Personal MCP token";

  const { data, error } = await supabase
    .from("mcp_tokens")
    .insert({ user_id: user.id, label, token_hash: tokenHash })
    .select("id,label,created_at,last_used_at,revoked_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ token: rawToken, record: data }, { status: 201 });
}
