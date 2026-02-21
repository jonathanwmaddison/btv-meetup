import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ rsvpId: string }> }) {
  const { rsvpId } = await params;
  const { supabase, user } = await requireAuth();
  const body = (await request.json()) as { status?: "cancelled" };

  if (body.status !== "cancelled") {
    return NextResponse.json({ error: "Only cancelled status is allowed" }, { status: 400 });
  }

  const { data: target } = await supabase.from("rsvps").select("id,user_id").eq("id", rsvpId).single();

  if (!target) {
    return NextResponse.json({ error: "RSVP not found" }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isOrganizer = profile?.role === "organizer" || profile?.role === "admin";

  if (target.user_id !== user.id && !isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("rsvps").update({ status: "cancelled" }).eq("id", rsvpId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
