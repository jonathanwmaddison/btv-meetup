import { requireAuth } from "@/lib/auth";
import { McpTokenManager } from "@/components/mcp-token-manager";
import { headers } from "next/headers";

export default async function IntegrationsPage() {
  const { supabase, user } = await requireAuth();
  const { data: tokens } = await supabase
    .from("mcp_tokens")
    .select("id,label,created_at,last_used_at,revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:8000";
  const derivedAppUrl = `${proto}://${host}`;
  const appUrl = envAppUrl || derivedAppUrl;
  const mcpUrl = `${appUrl}/api/mcp`;

  return <McpTokenManager mcpUrl={mcpUrl} initialTokens={tokens ?? []} />;
}
