import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateIcs } from "@/lib/ics";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("id,title,description,starts_at,ends_at,venue,status")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const ics = generateIcs({
    uid: event.id,
    title: event.title,
    description: event.description,
    venue: event.venue,
    starts_at: event.starts_at,
    ends_at: event.ends_at
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`
    }
  });
}
