import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ cfpId: string }> }) {
  const { cfpId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as { status?: string };

  if (body.status !== "approved" && body.status !== "rejected" && body.status !== "pending") {
    return NextResponse.json({ error: "status must be pending, approved, or rejected" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cfp_submissions")
    .update({ status: body.status })
    .eq("id", cfpId)
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
