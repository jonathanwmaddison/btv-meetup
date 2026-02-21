import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SEED_EMAIL = "organizer@btv.local";
const SEED_NAME = "BTV Organizer";

async function ensureOrganizer() {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("email", SEED_EMAIL)
    .single();

  if (existing?.id) {
    if (existing.role !== "organizer" && existing.role !== "admin") {
      await supabase.from("profiles").update({ role: "organizer" }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: user, error } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    email_confirm: true,
    user_metadata: { name: SEED_NAME }
  });

  if (error || !user?.user?.id) {
    throw new Error(error?.message ?? "Failed to create seed user");
  }

  const userId = user.user.id;
  await supabase.from("profiles").insert({ id: userId, email: SEED_EMAIL, name: SEED_NAME, role: "organizer" });
  return userId;
}

async function ensureVenues(createdBy) {
  const venues = [
    {
      name: "BTV Foundry",
      address: "123 Lake St, Burlington, VT",
      capacity: 120,
      accessibility_notes: "Elevator access, accessible restroom",
      parking_info: "Garage across the street",
      website: "https://example.com/venue/btv-foundry"
    },
    {
      name: "Pine Street Studio",
      address: "456 Pine St, Burlington, VT",
      capacity: 60,
      accessibility_notes: "Ramp access",
      parking_info: "Street parking",
      website: "https://example.com/venue/pine-street"
    }
  ];

  const created = [];
  for (const venue of venues) {
    const { data: existing } = await supabase
      .from("venues")
      .select("id,name")
      .eq("name", venue.name)
      .single();

    if (existing?.id) {
      created.push(existing);
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("venues")
      .insert({ ...venue, created_by: createdBy })
      .select("id,name")
      .single();

    if (error) throw new Error(error.message);
    created.push(inserted);
  }

  return created;
}

function daysFromNow(days, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysAgo(days, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function seedEvents(createdBy, venues) {
  const { data: existing } = await supabase
    .from("events")
    .select("id,title")
    .ilike("title", "Sample:%")
    .eq("created_by", createdBy);

  if (existing?.length) {
    const ids = existing.map((e) => e.id);
    await supabase.from("events").delete().in("id", ids);
  }

  const [venueA, venueB] = venues;
  const events = [
    {
      title: "Sample: Intro to MCP and OAuth",
      description: "Walkthrough of MCP tooling and OAuth flows with live demos.",
      starts_at: daysFromNow(3, 18).toISOString(),
      ends_at: daysFromNow(3, 20).toISOString(),
      venue: venueA?.name ?? "BTV Foundry",
      venue_id: venueA?.id ?? null,
      capacity: 80,
      status: "published",
      created_by: createdBy
    },
    {
      title: "Sample: Agents in Production",
      description: "Case studies on deploying agent workflows safely.",
      starts_at: daysFromNow(10, 18).toISOString(),
      ends_at: daysFromNow(10, 20).toISOString(),
      venue: venueB?.name ?? "Pine Street Studio",
      venue_id: venueB?.id ?? null,
      capacity: 60,
      status: "published",
      created_by: createdBy
    },
    {
      title: "Sample: Lightning Talks + Social",
      description: "Fast-paced 5-minute talks followed by networking.",
      starts_at: daysFromNow(17, 18).toISOString(),
      ends_at: daysFromNow(17, 20).toISOString(),
      venue: venueA?.name ?? "BTV Foundry",
      venue_id: venueA?.id ?? null,
      capacity: 100,
      status: "published",
      created_by: createdBy
    },
    {
      title: "Sample: Model Evaluation Night (Past)",
      description: "Lightning demos of eval harnesses and prompts.",
      starts_at: daysAgo(14, 18).toISOString(),
      ends_at: daysAgo(14, 20).toISOString(),
      venue: venueB?.name ?? "Pine Street Studio",
      venue_id: venueB?.id ?? null,
      capacity: 50,
      status: "published",
      created_by: createdBy
    },
    {
      title: "Sample: RAG in the Real World (Past)",
      description: "Lessons learned from production retrieval pipelines.",
      starts_at: daysAgo(30, 18).toISOString(),
      ends_at: daysAgo(30, 20).toISOString(),
      venue: venueA?.name ?? "BTV Foundry",
      venue_id: venueA?.id ?? null,
      capacity: 90,
      status: "published",
      created_by: createdBy
    }
  ];

  const { error } = await supabase.from("events").insert(events);
  if (error) throw new Error(error.message);
}

async function seedSpeakers() {
  const { data: existing } = await supabase
    .from("speakers")
    .select("id,name")
    .ilike("name", "Sample:%");

  if (existing?.length) {
    const ids = existing.map((s) => s.id);
    await supabase.from("speakers").delete().in("id", ids);
  }

  const speakers = [
    {
      name: "Sample: Alex Rivera",
      bio: "Platform engineer focused on AI infrastructure and developer experience.",
      website: "https://example.com/speakers/alex-rivera"
    },
    {
      name: "Sample: Priya Shah",
      bio: "Product leader building agentic workflows for customer support teams.",
      website: "https://example.com/speakers/priya-shah"
    }
  ];

  const { error } = await supabase.from("speakers").insert(speakers);
  if (error) throw new Error(error.message);
}

async function main() {
  const organizerId = await ensureOrganizer();
  const venues = await ensureVenues(organizerId);
  await seedEvents(organizerId, venues);
  await seedSpeakers();
  console.log("Seed complete: organizer, venues, sample events, speakers.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
