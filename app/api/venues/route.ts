import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type VenuePayload = {
  name?: string;
  address?: string;
  capacity?: number | null;
  accessibility_notes?: string | null;
  parking_info?: string | null;
  website?: string | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id,name,address,capacity,accessibility_notes,parking_info,website,created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ venues: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as VenuePayload;

  if (!body.name || !body.address) {
    return NextResponse.json({ error: "name and address are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("venues")
    .insert({
      name: body.name.trim(),
      address: body.address.trim(),
      capacity: body.capacity ?? null,
      accessibility_notes: body.accessibility_notes ?? null,
      parking_info: body.parking_info ?? null,
      website: body.website ?? null,
      created_by: user.id
    })
    .select("id,name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
