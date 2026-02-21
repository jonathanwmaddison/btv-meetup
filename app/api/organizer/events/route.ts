import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

type EventPayload = {
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string | null;
  venue?: string;
  capacity?: number;
  status?: "draft" | "published" | "cancelled";
};

export async function POST(request: Request) {
  const { supabase, user } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as EventPayload;

  if (!body.title || !body.starts_at || !body.venue || !body.capacity || body.capacity < 1) {
    return NextResponse.json({ error: "title, starts_at, venue, and capacity >= 1 are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      starts_at: body.starts_at,
      ends_at: body.ends_at ?? null,
      venue: body.venue.trim(),
      capacity: body.capacity,
      status: body.status ?? "draft",
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
