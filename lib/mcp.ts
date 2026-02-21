import { createHash, randomBytes } from "crypto";

const MCP_TOKEN_PREFIX = "btvmcp_";

export function generateMcpToken() {
  return `${MCP_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getBearerToken(value: string | null) {
  if (!value) {
    return null;
  }
  if (!value.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = value.slice("bearer ".length).trim();
  return token.length ? token : null;
}
