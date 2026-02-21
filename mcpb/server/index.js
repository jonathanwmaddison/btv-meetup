#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.BTV_MEETUP_API_URL;
const API_TOKEN = process.env.BTV_MEETUP_API_TOKEN;

if (!API_URL || !API_TOKEN) {
  console.error(
    "Missing BTV_MEETUP_API_URL or BTV_MEETUP_API_TOKEN environment variables."
  );
  process.exit(1);
}

// ── JSON-RPC helper ──

let rpcId = 0;

async function rpcCall(method, params) {
  rpcId += 1;
  const body = { jsonrpc: "2.0", id: rpcId, method, params };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();

  if (json.error) {
    const err = new Error(json.error.message ?? "Remote RPC error");
    err.code = json.error.code;
    throw err;
  }

  return json.result;
}

// ── Fetch the tool list from the remote server ──

let cachedTools = null;

async function getTools() {
  if (cachedTools) return cachedTools;

  try {
    const result = await rpcCall("tools/list", {});
    cachedTools = result.tools ?? [];
  } catch (err) {
    console.error("Failed to fetch tools from remote server:", err.message);
    cachedTools = [];
  }

  return cachedTools;
}

// ── MCP Server ──

const server = new Server(
  { name: "btv-meetup", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await getTools();
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await rpcCall("tools/call", { name, arguments: args ?? {} });
    return result;
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ── Start ──

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("BTV Meetup MCP server running via stdio");
