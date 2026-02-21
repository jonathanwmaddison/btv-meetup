import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

type VenuePayload = {
  name?: string;
  address?: string;
  capacity?: number | null;
  accessibility_notes?: string | null;
  parking_info?: string | null;
  website?: string | null;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as VenuePayload;

  const updates: Record<string, string | number | null> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.address === "string") updates.address = body.address.trim();
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.accessibility_notes !== undefined) updates.accessibility_notes = body.accessibility_notes;
  if (body.parking_info !== undefined) updates.parking_info = body.parking_info;
  if (body.website !== undefined) updates.website = body.website;

  const { data, error } = await supabase.from("venues").update(updates).eq("id", venueId).select("id,name").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);

  const { error } = await supabase.from("venues").delete().eq("id", venueId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
