import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

type RecurrencePayload = {
  frequency?: "weekly" | "biweekly" | "monthly";
  count?: number;
};

function addInterval(date: Date, frequency: string): Date {
  const next = new Date(date);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "biweekly") {
    next.setDate(next.getDate() + 14);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, user } = await requireRole(["organizer", "admin"]);
  const body = (await request.json()) as RecurrencePayload;

  const freq = body.frequency ?? "monthly";
  const count = Math.min(Math.max(body.count ?? 3, 1), 12);

  // Get parent event
  const { data: parent, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchError || !parent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Update parent with recurrence info
  await supabase.from("events").update({
    recurrence_freq: freq,
    recurrence_count: count
  }).eq("id", eventId);

  // Generate child events
  const created: string[] = [];
  let currentStart = new Date(parent.starts_at);
  const duration = parent.ends_at
    ? new Date(parent.ends_at).getTime() - new Date(parent.starts_at).getTime()
    : null;

  for (let i = 0; i < count; i++) {
    currentStart = addInterval(currentStart, freq);
    const childEnd = duration ? new Date(currentStart.getTime() + duration).toISOString() : null;

    const { data, error } = await supabase
      .from("events")
      .insert({
        title: parent.title,
        description: parent.description,
        starts_at: currentStart.toISOString(),
        ends_at: childEnd,
        venue: parent.venue,
        venue_id: parent.venue_id,
        capacity: parent.capacity,
        status: "draft",
        created_by: user.id,
        parent_event_id: eventId
      })
      .select("id")
      .single();

    if (!error && data) {
      created.push(data.id);
    }
  }

  return NextResponse.json({ parent_id: eventId, created_event_ids: created, count: created.length }, { status: 201 });
}
