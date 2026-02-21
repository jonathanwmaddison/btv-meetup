import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function PATCH(request: Request) {
  const { supabase } = await requireRole(["admin"]);
  const body = (await request.json()) as { user_id?: string; role?: "member" | "organizer" | "admin" };

  if (!body.user_id || !body.role) {
    return NextResponse.json({ error: "user_id and role are required" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update({ role: body.role }).eq("id", body.user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
