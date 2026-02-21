import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBearerToken, hashMcpToken } from "@/lib/mcp";
import { generateIcs } from "@/lib/ics";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type ToolCallParams = {
  name?: string;
  arguments?: Record<string, unknown>;
};

const SERVER_INFO = {
  name: "btv-meetup-mcp",
  version: "2.0.0"
};

const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function rpcResult(id: JsonRpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

function asTextResult(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function getAppUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envUrl) {
    try {
      const host = new URL(envUrl).hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        return envUrl;
      }
    } catch {
      // fall through to header-derived URL
    }
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8000";
  return `${proto}://${host}`;
}

function getSessionId(request: Request) {
  return request.headers.get("mcp-session-id") ?? randomUUID();
}

function unauthorizedResponse(request: Request, id: JsonRpcId) {
  const appUrl = getAppUrl(request);
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code: -32001, message: "Unauthorized. Provide a valid MCP bearer token." } },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata=\"${appUrl}/.well-known/oauth-protected-resource\"`
      }
    }
  );
}

function getTokenFromRequest(request: Request) {
  const bearer = getBearerToken(request.headers.get("authorization"));
  if (bearer) {
    return bearer;
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (apiKey) {
    return apiKey;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  return null;
}

async function getUserIdFromToken(request: Request) {
  const rawToken = getTokenFromRequest(request);
  if (!rawToken) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const tokenHash = hashMcpToken(rawToken);
  const { data: tokenRow } = await admin
    .from("mcp_tokens")
    .select("id,user_id,revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .single();

  if (!tokenRow) {
    return null;
  }

  await admin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
  return tokenRow.user_id as string;
}

async function getUserRole(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data } = await admin.from("profiles").select("role").eq("id", userId).single();
  return (data?.role ?? "member") as string;
}

function parsePositiveLimit(input: unknown, fallback: number, max: number) {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback;
  }
  const bounded = Math.max(1, Math.min(Math.floor(input), max));
  return bounded;
}

const TOOLS = [
  {
    name: "find_upcoming_events",
    description: "List upcoming published meetup events.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 20 },
        query: { type: "string", description: "Optional search against title, description, and venue." }
      }
    }
  },
  {
    name: "get_event_details",
    description: "Get details and capacity snapshot for one event.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  },
  {
    name: "rsvp_to_event",
    description: "RSVP the current user to an event (going/waitlist assigned automatically).",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  },
  {
    name: "cancel_my_rsvp",
    description: "Cancel one of the current user's RSVPs.",
    inputSchema: {
      type: "object",
      required: ["rsvp_id"],
      properties: { rsvp_id: { type: "string" } }
    }
  },
  {
    name: "my_upcoming_rsvps",
    description: "List the current user's active upcoming RSVPs.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", minimum: 1, maximum: 20 } }
    }
  },
  {
    name: "submit_meetup_idea",
    description: "Submit a new meetup idea for organizers.",
    inputSchema: {
      type: "object",
      required: ["title", "description"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 160 },
        description: { type: "string", minLength: 10, maxLength: 2000 }
      }
    }
  },
  {
    name: "browse_meetup_ideas",
    description: "Browse recently submitted meetup ideas from the community.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 30 },
        status: {
          type: "string",
          enum: ["pending", "approved", "implemented", "rejected"],
          description: "Optional status filter."
        }
      }
    }
  },
  {
    name: "get_my_profile",
    description: "Get the current user's profile including role and email.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "vote_on_idea",
    description: "Upvote (+1) or downvote (-1) a meetup idea.",
    inputSchema: {
      type: "object",
      required: ["idea_id", "value"],
      properties: {
        idea_id: { type: "string" },
        value: { type: "number", enum: [1, -1], description: "1 for upvote, -1 for downvote" }
      }
    }
  },
  {
    name: "get_event_attendees",
    description: "Get a privacy-respecting attendee list for an event (first names and counts).",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  },
  {
    name: "export_event_to_calendar",
    description: "Export an event as an ICS calendar file string.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  },
  {
    name: "check_in_to_event",
    description: "Check in to an event (day-of attendance confirmation).",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  },
  {
    name: "create_event",
    description: "Create a new event (organizer/admin only).",
    inputSchema: {
      type: "object",
      required: ["title", "starts_at", "venue", "capacity"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        starts_at: { type: "string", description: "ISO 8601 datetime" },
        ends_at: { type: "string", description: "ISO 8601 datetime" },
        venue: { type: "string" },
        capacity: { type: "number", minimum: 1 },
        status: { type: "string", enum: ["draft", "published"], description: "Defaults to draft" }
      }
    }
  },
  {
    name: "update_event",
    description: "Update an existing event (organizer/admin only).",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        starts_at: { type: "string" },
        ends_at: { type: "string" },
        venue: { type: "string" },
        capacity: { type: "number", minimum: 1 },
        status: { type: "string", enum: ["draft", "published", "cancelled"] }
      }
    }
  },
  {
    name: "view_attendee_list",
    description: "Get full attendee list with emails for an event (organizer/admin only).",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: { event_id: { type: "string" } }
    }
  }
];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as JsonRpcRequest;
  const id = body.id ?? null;

  if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(id, -32600, "Invalid JSON-RPC request");
  }

  if (body.method === "initialize") {
    const params = (body.params ?? {}) as { protocolVersion?: string };
    const requestedVersion = params.protocolVersion;
    const protocolVersion = requestedVersion && SUPPORTED_PROTOCOLS.includes(requestedVersion)
      ? requestedVersion
      : SUPPORTED_PROTOCOLS[0];
    const response = rpcResult(id, {
      protocolVersion,
      serverInfo: SERVER_INFO,
      capabilities: { tools: { list: true, call: true } }
    });
    response.headers.set("mcp-session-id", getSessionId(request));
    return response;
  }

  if (body.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }

  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return unauthorizedResponse(request, id);
  }

  if (body.method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }

  if (body.method !== "tools/call") {
    return rpcError(id, -32601, "Method not found");
  }

  const params = (body.params ?? {}) as ToolCallParams;
  const toolName = params.name;
  const args = params.arguments ?? {};
  const admin = createSupabaseAdminClient();

  if (!toolName) {
    return rpcError(id, -32602, "Missing tool name");
  }

  // ─── find_upcoming_events ───
  if (toolName === "find_upcoming_events") {
    const limit = parsePositiveLimit(args.limit, 10, 20);
    const query = typeof args.query === "string" ? args.query.trim() : "";
    let requestBuilder = admin
      .from("events")
      .select("id,title,description,starts_at,ends_at,venue,capacity,status")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (query) {
      requestBuilder = requestBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%`);
    }

    const { data, error } = await requestBuilder;
    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ events: data ?? [] }));
  }

  // ─── get_event_details ───
  if (toolName === "get_event_details") {
    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const [{ data: event, error: eventError }, { data: rsvps, error: rsvpError }] = await Promise.all([
      admin
        .from("events")
        .select("id,title,description,starts_at,ends_at,venue,capacity,status")
        .eq("id", eventId)
        .eq("status", "published")
        .single(),
      admin.from("rsvps").select("status").eq("event_id", eventId)
    ]);

    if (eventError) {
      return rpcError(id, -32010, eventError.message);
    }
    if (!event) {
      return rpcError(id, -32004, "Event not found");
    }
    if (rsvpError) {
      return rpcError(id, -32010, rsvpError.message);
    }

    const going = (rsvps ?? []).filter((row) => row.status === "going").length;
    const waitlist = (rsvps ?? []).filter((row) => row.status === "waitlist").length;
    return rpcResult(id, asTextResult({ event, capacity: { going, waitlist, max: event.capacity } }));
  }

  // ─── rsvp_to_event ───
  if (toolName === "rsvp_to_event") {
    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const { data, error } = await admin
      .from("rsvps")
      .upsert({ event_id: eventId, user_id: userId, status: "going" }, { onConflict: "event_id,user_id" })
      .select("id,event_id,status,updated_at")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ rsvp: data }));
  }

  // ─── cancel_my_rsvp ───
  if (toolName === "cancel_my_rsvp") {
    const rsvpId = typeof args.rsvp_id === "string" ? args.rsvp_id : "";
    if (!rsvpId) {
      return rpcError(id, -32602, "rsvp_id is required");
    }

    const { data: row, error: findError } = await admin.from("rsvps").select("id,user_id,status").eq("id", rsvpId).single();
    if (findError) {
      return rpcError(id, -32010, findError.message);
    }
    if (!row || row.user_id !== userId) {
      return rpcError(id, -32004, "RSVP not found for current user");
    }

    const { error } = await admin.from("rsvps").update({ status: "cancelled" }).eq("id", rsvpId).eq("user_id", userId);
    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ ok: true, rsvp_id: rsvpId, status: "cancelled" }));
  }

  // ─── my_upcoming_rsvps ───
  if (toolName === "my_upcoming_rsvps") {
    const limit = parsePositiveLimit(args.limit, 10, 20);
    const { data, error } = await admin
      .from("rsvps")
      .select("id,status,event:events!rsvps_event_id_fkey(id,title,starts_at,venue,status)")
      .eq("user_id", userId)
      .in("status", ["going", "waitlist"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ rsvps: data ?? [] }));
  }

  // ─── submit_meetup_idea ───
  if (toolName === "submit_meetup_idea") {
    const title = typeof args.title === "string" ? args.title.trim() : "";
    const description = typeof args.description === "string" ? args.description.trim() : "";
    if (!title || !description) {
      return rpcError(id, -32602, "title and description are required");
    }

    const { data, error } = await admin
      .from("ideas")
      .insert({ user_id: userId, title: title.slice(0, 160), description: description.slice(0, 2000) })
      .select("id,title,status,created_at")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ idea: data }));
  }

  // ─── browse_meetup_ideas ───
  if (toolName === "browse_meetup_ideas") {
    const limit = parsePositiveLimit(args.limit, 10, 30);
    const status =
      args.status === "pending" || args.status === "approved" || args.status === "implemented" || args.status === "rejected"
        ? args.status
        : null;

    let query = admin
      .from("ideas")
      .select("id,title,description,status,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return rpcError(id, -32010, error.message);
    }

    return rpcResult(id, asTextResult({ ideas: data ?? [] }));
  }

  // ─── get_my_profile ───
  if (toolName === "get_my_profile") {
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,name,role,created_at")
      .eq("id", userId)
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ profile: data }));
  }

  // ─── vote_on_idea ───
  if (toolName === "vote_on_idea") {
    const ideaId = typeof args.idea_id === "string" ? args.idea_id : "";
    const value = args.value;
    if (!ideaId || (value !== 1 && value !== -1)) {
      return rpcError(id, -32602, "idea_id and value (1 or -1) are required");
    }

    const { data, error } = await admin
      .from("idea_votes")
      .upsert(
        { idea_id: ideaId, user_id: userId, value: value as number },
        { onConflict: "idea_id,user_id" }
      )
      .select("id,value")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }

    // Also return current vote tally
    const { data: votes } = await admin.from("idea_votes").select("value").eq("idea_id", ideaId);
    const upvotes = (votes ?? []).filter((v) => v.value === 1).length;
    const downvotes = (votes ?? []).filter((v) => v.value === -1).length;

    return rpcResult(id, asTextResult({ vote: data, tally: { upvotes, downvotes, net: upvotes - downvotes } }));
  }

  // ─── get_event_attendees ───
  if (toolName === "get_event_attendees") {
    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const { data: rsvps, error } = await admin
      .from("rsvps")
      .select("status, profile:profiles!rsvps_user_id_fkey(name)")
      .eq("event_id", eventId)
      .in("status", ["going", "waitlist"])
      .order("created_at", { ascending: true });

    if (error) {
      return rpcError(id, -32010, error.message);
    }

    const attendees = (rsvps ?? []).map((r) => {
      const profile = r.profile as unknown as { name: string | null };
      const name = profile?.name ?? "Anonymous";
      // Privacy: only show first name
      const firstName = name.split(" ")[0] || "Anonymous";
      return { first_name: firstName, status: r.status };
    });

    const going = attendees.filter((a) => a.status === "going").length;
    const waitlisted = attendees.filter((a) => a.status === "waitlist").length;

    return rpcResult(id, asTextResult({ attendees, summary: { going, waitlisted, total: going + waitlisted } }));
  }

  // ─── export_event_to_calendar ───
  if (toolName === "export_event_to_calendar") {
    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const { data: event, error } = await admin
      .from("events")
      .select("id,title,description,starts_at,ends_at,venue")
      .eq("id", eventId)
      .eq("status", "published")
      .single();

    if (error || !event) {
      return rpcError(id, -32004, "Event not found");
    }

    const ics = generateIcs({
      uid: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      starts_at: event.starts_at,
      ends_at: event.ends_at
    });

    return rpcResult(id, asTextResult({ ics_content: ics, filename: `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics` }));
  }

  // ─── check_in_to_event ───
  if (toolName === "check_in_to_event") {
    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const { data, error } = await admin
      .from("checkins")
      .upsert(
        { event_id: eventId, user_id: userId },
        { onConflict: "event_id,user_id" }
      )
      .select("id,checked_in_at")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ checkin: data }));
  }

  // ─── create_event (organizer only) ───
  if (toolName === "create_event") {
    const role = await getUserRole(admin, userId);
    if (role !== "organizer" && role !== "admin") {
      return rpcError(id, -32003, "Organizer or admin role required");
    }

    const title = typeof args.title === "string" ? args.title.trim() : "";
    const startsAt = typeof args.starts_at === "string" ? args.starts_at : "";
    const venue = typeof args.venue === "string" ? args.venue.trim() : "";
    const capacity = typeof args.capacity === "number" ? args.capacity : 0;

    if (!title || !startsAt || !venue || capacity < 1) {
      return rpcError(id, -32602, "title, starts_at, venue, and capacity >= 1 are required");
    }

    const { data, error } = await admin
      .from("events")
      .insert({
        title,
        description: typeof args.description === "string" ? args.description : null,
        starts_at: startsAt,
        ends_at: typeof args.ends_at === "string" ? args.ends_at : null,
        venue,
        capacity,
        status: args.status === "published" ? "published" : "draft",
        created_by: userId
      })
      .select("id,title,status,starts_at")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ event: data }));
  }

  // ─── update_event (organizer only) ───
  if (toolName === "update_event") {
    const role = await getUserRole(admin, userId);
    if (role !== "organizer" && role !== "admin") {
      return rpcError(id, -32003, "Organizer or admin role required");
    }

    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const updates: Record<string, string | number | null> = {};
    if (typeof args.title === "string") updates.title = (args.title as string).trim();
    if (typeof args.description === "string") updates.description = args.description as string;
    if (typeof args.starts_at === "string") updates.starts_at = args.starts_at as string;
    if (typeof args.ends_at === "string") updates.ends_at = args.ends_at as string;
    if (typeof args.venue === "string") updates.venue = (args.venue as string).trim();
    if (typeof args.capacity === "number" && (args.capacity as number) >= 1) updates.capacity = args.capacity as number;
    if (args.status === "draft" || args.status === "published" || args.status === "cancelled") {
      updates.status = args.status as string;
    }

    const { data, error } = await admin
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select("id,title,status")
      .single();

    if (error) {
      return rpcError(id, -32010, error.message);
    }
    return rpcResult(id, asTextResult({ event: data }));
  }

  // ─── view_attendee_list (organizer only) ───
  if (toolName === "view_attendee_list") {
    const role = await getUserRole(admin, userId);
    if (role !== "organizer" && role !== "admin") {
      return rpcError(id, -32003, "Organizer or admin role required");
    }

    const eventId = typeof args.event_id === "string" ? args.event_id : "";
    if (!eventId) {
      return rpcError(id, -32602, "event_id is required");
    }

    const { data, error } = await admin
      .from("rsvps")
      .select("id,status,created_at,profile:profiles!rsvps_user_id_fkey(name,email)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      return rpcError(id, -32010, error.message);
    }

    const attendees = (data ?? []).map((r) => {
      const profile = r.profile as unknown as { name: string | null; email: string | null };
      return { name: profile?.name ?? "", email: profile?.email ?? "", status: r.status, rsvp_date: r.created_at };
    });

    return rpcResult(id, asTextResult({ attendees }));
  }

  return rpcError(id, -32601, `Unknown tool: ${toolName}`);
}

export async function GET() {
  return NextResponse.json({
    server: SERVER_INFO,
    endpoint: "/api/mcp",
    transport: "JSON-RPC over HTTP POST",
    auth: "Authorization: Bearer <access_token> OR x-api-key header OR ?token=<access_token>",
    oauth: {
      authorization_endpoint: "/api/oauth/authorize",
      token_endpoint: "/api/oauth/token",
      registration_endpoint: "/api/oauth/register"
    },
    setup_path: "/settings/integrations",
    tools: TOOLS.map((t) => t.name)
  });
}
