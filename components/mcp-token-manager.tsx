"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TokenRecord = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Props = {
  mcpUrl: string;
  initialTokens: TokenRecord[];
};

function fmtDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function McpTokenManager({ mcpUrl, initialTokens }: Props) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("My Assistant");
  const [createdToken, setCreatedToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const activeCount = useMemo(() => tokens.filter((row) => !row.revoked_at).length, [tokens]);

  const mcpConfig = useMemo(() => {
    if (!createdToken) return "";
    return JSON.stringify(
      {
        mcpServers: {
          "BTV Meetup": {
            type: "http",
            url: mcpUrl,
            headers: {
              Authorization: `Bearer ${createdToken}`
            }
          }
        }
      },
      null,
      2
    );
  }, [createdToken, mcpUrl]);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setCreatedToken("");

    startTransition(async () => {
      const res = await fetch("/api/mcp/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label })
      });
      const body = (await res.json()) as { error?: string; token?: string; record?: TokenRecord };
      if (!res.ok || !body.record || !body.token) {
        setMessage(body.error ?? "Could not create token");
        return;
      }

      setCreatedToken(body.token);
      setTokens((prev) => [body.record!, ...prev]);
      setMessage("Token created. Copy it now; it will not be shown again.");
      router.refresh();
    });
  }

  function revokeToken(tokenId: string) {
    setMessage("");
    startTransition(async () => {
      const res = await fetch(`/api/mcp/tokens/${tokenId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not revoke token");
        return;
      }
      setTokens((prev) =>
        prev.map((row) => (row.id === tokenId ? { ...row, revoked_at: new Date().toISOString() } : row))
      );
      if (createdToken) {
        setCreatedToken("");
      }
      setMessage("Token revoked.");
      router.refresh();
    });
  }

  async function copyValue(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
    } catch {
      setMessage("Copy failed. Use manual copy.");
    }
  }

  function downloadConfig() {
    if (!mcpConfig) {
      setMessage("Create a token first.");
      return;
    }
    const blob = new Blob([mcpConfig], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btv-meetup-mcp.json";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Config downloaded.");
  }

  return (
    <div className="grid">
      <section className="card hero">
        <span className="eyebrow">AI</span>
        <h1>AI Integrations</h1>
        <p className="muted">Connect AI assistants to your attendee account via MCP.</p>
        <p>
          <strong>MCP endpoint:</strong> <code>{mcpUrl}</code>
        </p>
      </section>

      <section className="card">
        <h2>OAuth Setup (Recommended)</h2>
        <p className="muted">
          AI assistants that support OAuth can connect automatically — no token copy/paste needed.
        </p>
        <p>
          <strong>Authorization URL:</strong>{" "}
          <code>{mcpUrl.replace("/api/mcp", "/api/oauth/authorize")}</code>
        </p>
        <p>
          <strong>Token URL:</strong>{" "}
          <code>{mcpUrl.replace("/api/mcp", "/api/oauth/token")}</code>
        </p>
        <p>
          <strong>Registration URL:</strong>{" "}
          <code>{mcpUrl.replace("/api/mcp", "/api/oauth/register")}</code>
        </p>
        <p className="muted">
          Clients register via the registration endpoint, then redirect users to the authorization URL.
          Users approve access in their browser — the token is exchanged automatically.
        </p>
      </section>

      <section className="card">
        <h2>Claude Desktop (Paid) — Remote Connector</h2>
        <p className="muted">
          This is the fully automated path (OAuth, no manual token entry), but it requires a paid Claude plan.
        </p>
        <p>
          <strong>Connector URL:</strong> <code>{mcpUrl}</code>
        </p>
        <p className="muted">
          In Claude Desktop, add a custom connector and paste the URL above. Claude will open a browser window to
          complete OAuth.
        </p>
        <button type="button" onClick={() => copyValue(mcpUrl, "Connector URL copied.")}>
          Copy connector URL
        </button>
      </section>

      <section className="card">
        <h2>Quick Setup with Token</h2>
        <p className="muted">Active tokens: {activeCount}/5</p>
        <form onSubmit={onCreate}>
          <label htmlFor="mcp-label">Label</label>
          <input
            id="mcp-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="My Assistant"
          />
          <button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create token"}
          </button>
        </form>
        {createdToken && (
          <div className="card">
            <h3>One-time token</h3>
            <p className="muted">Store it now. For security, we only show this once.</p>
            <code>{createdToken}</code>
            <p style={{ marginTop: "0.5rem" }}>
              <button type="button" onClick={() => copyValue(createdToken, "Token copied.")}>
                Copy token
              </button>
            </p>
          </div>
        )}
      </section>

      {createdToken && (
        <section className="card">
          <h2>Claude Desktop (Free) — MCPB Install</h2>
          <p className="muted">
            Download the MCP bundle, then open it in Claude Desktop. You'll be prompted for the API URL and token.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <a href="/btv-meetup.mcpb" className="button-link" download>
              Download MCPB
            </a>
            <button type="button" onClick={() => copyValue(mcpUrl, "API URL copied.")}>
              Copy API URL
            </button>
            <button type="button" onClick={() => copyValue(createdToken, "Token copied.")}>
              Copy token
            </button>
          </div>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            API URL should look like: <code>{mcpUrl}</code>
          </p>
        </section>
      )}

      <section className="card">
        <h2>Manual Config</h2>
        <p className="muted">Copy or download a ready-to-use MCP config.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button type="button" onClick={() => copyValue(mcpUrl, "MCP URL copied.")}>
            Copy MCP URL
          </button>
          <button type="button" onClick={() => copyValue(mcpConfig, "Config copied.")} disabled={!mcpConfig}>
            Copy full config JSON
          </button>
          <button type="button" onClick={downloadConfig} disabled={!mcpConfig}>
            Download config file
          </button>
        </div>
        {!createdToken && <p className="muted" style={{ marginTop: "0.5rem" }}>Create a token first to enable config generation.</p>}
      </section>

      <section className="card">
        <h2>Available MCP Tools</h2>
        <p className="muted">Your AI assistant will have access to these capabilities:</p>
        <div className="grid two">
          <div>
            <h4>Everyone</h4>
            <ul>
              <li>Find upcoming events</li>
              <li>Get event details</li>
              <li>RSVP to events</li>
              <li>Cancel RSVPs</li>
              <li>View your RSVPs</li>
              <li>Submit meetup ideas</li>
              <li>Browse &amp; vote on ideas</li>
              <li>View your profile</li>
              <li>Export event to calendar</li>
              <li>Check in to events</li>
              <li>View event attendees</li>
            </ul>
          </div>
          <div>
            <h4>Organizers</h4>
            <ul>
              <li>Create events</li>
              <li>Update events</li>
              <li>View full attendee list</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Your Tokens</h2>
        {!tokens.length && <p>No MCP tokens yet.</p>}
        {tokens.map((token) => (
          <article key={token.id} className="card">
            <h3>{token.label}</h3>
            <p className="muted">Created: {fmtDate(token.created_at)}</p>
            <p className="muted">Last used: {fmtDate(token.last_used_at)}</p>
            <p className="muted">Status: {token.revoked_at ? "Revoked" : "Active"}</p>
            {!token.revoked_at && (
              <button type="button" className="secondary" onClick={() => revokeToken(token.id)} disabled={pending}>
                Revoke
              </button>
            )}
          </article>
        ))}
      </section>

      {message && (
        <section className="card">
          <p>{message}</p>
        </section>
      )}
    </div>
  );
}
