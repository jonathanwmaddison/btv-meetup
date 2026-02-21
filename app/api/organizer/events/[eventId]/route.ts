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

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as EventPayload;

  const updates: Record<string, string | number | null> = {};

  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.starts_at === "string") updates.starts_at = body.starts_at;
  if (body.ends_at === null || typeof body.ends_at === "string") updates.ends_at = body.ends_at;
  if (typeof body.venue === "string") updates.venue = body.venue.trim();
  if (typeof body.capacity === "number" && body.capacity >= 1) updates.capacity = body.capacity;
  if (body.status) updates.status = body.status;

  const { data, error } = await supabase.from("events").update(updates).eq("id", eventId).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
