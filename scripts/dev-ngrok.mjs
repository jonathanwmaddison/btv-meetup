import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const PORT = Number(process.env.PORT ?? 8000);
const NGROK_API = "http://127.0.0.1:4040/api/tunnels";
const ENV_FILE = ".env.local";
const SUPABASE_CONFIG = "supabase/config.toml";
const TUNNEL_URL = process.env.TUNNEL_URL?.replace(/\/+$/, "");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function upsertEnv(content, key, value) {
  const lines = content.split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    if (next.length && next[next.length - 1].trim() !== "") {
      next.push("");
    }
    next.push(`${key}=${value}`);
  }
  return next.join("\n");
}

function upsertTomlValue(content, key, value) {
  const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, `${key} = ${value}`);
  }
  if (content.includes("[auth]")) {
    return content.replace("[auth]", `[auth]\n${key} = ${value}`);
  }
  return `${content.trimEnd()}\n\n[auth]\n${key} = ${value}\n`;
}

function updateSupabaseConfig(appUrl) {
  if (!existsSync(SUPABASE_CONFIG)) return false;
  const fallbackRedirects = [
    appUrl,
    `${appUrl}/auth/callback`,
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8000/auth/callback",
    "http://localhost:8000",
    "http://localhost:8000/auth/callback"
  ];
  const redirectList = `[${fallbackRedirects.map((u) => `"${u}"`).join(", ")}]`;
  const content = readFileSync(SUPABASE_CONFIG, "utf8");
  let updated = upsertTomlValue(content, "site_url", `"${appUrl}"`);
  updated = upsertTomlValue(updated, "additional_redirect_urls", redirectList);
  if (updated !== content) {
    writeFileSync(SUPABASE_CONFIG, updated, "utf8");
    return true;
  }
  return false;
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: "inherit" });
    proc.on("exit", (code) => resolve(code ?? 0));
    proc.on("error", () => resolve(1));
  });
}

async function fetchNgrokUrl() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(NGROK_API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`ngrok api ${res.status}`);
      const data = await res.json();
      const tunnel = (data.tunnels ?? []).find((t) => t.public_url?.startsWith("https://"))
        ?? (data.tunnels ?? [])[0];
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {
      // ngrok not ready yet
    }
    await delay(500);
  }
  throw new Error("Timed out waiting for ngrok tunnel. Is ngrok running?");
}

let ngrok = null;
if (!TUNNEL_URL) {
  ngrok = spawn("ngrok", ["http", String(PORT)], { stdio: "inherit" });
  ngrok.on("error", (err) => {
    if (err?.code === "ENOENT") {
      log("ngrok CLI not found. Install it from https://ngrok.com/download and run again.");
    } else {
      log(`ngrok failed: ${err?.message ?? err}`);
    }
    process.exit(1);
  });
}

let nextProcess;

const shutdown = () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill("SIGINT");
  if (ngrok && !ngrok.killed) ngrok.kill("SIGINT");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  const publicUrl = TUNNEL_URL ?? (await fetchNgrokUrl());
  const cleanUrl = publicUrl.replace(/\/+$/, "");
  const envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const updated = upsertEnv(envContent, "NEXT_PUBLIC_APP_URL", cleanUrl);
  writeFileSync(ENV_FILE, updated, "utf8");
  const supabaseUpdated = updateSupabaseConfig(cleanUrl);

  log(`tunnel: ${cleanUrl}`);
  log(`Updated ${ENV_FILE} with NEXT_PUBLIC_APP_URL.`);
  if (supabaseUpdated) {
    log(`Updated ${SUPABASE_CONFIG} with site_url and additional_redirect_urls.`);
    const stopCode = await runCommand("supabase", ["stop"]);
    if (stopCode !== 0) {
      log("Supabase stop failed or not running. Attempting start anyway.");
    }
    const startCode = await runCommand("supabase", ["start"]);
    if (startCode !== 0) {
      log("Supabase start failed. Check the Supabase CLI output above.");
    }
  }

  nextProcess = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_APP_URL: cleanUrl }
  });

  nextProcess.on("exit", (code) => {
    if (!ngrok.killed) ngrok.kill("SIGINT");
    process.exit(code ?? 0);
  });
} catch (err) {
  log(err?.message ?? String(err));
  shutdown();
  process.exit(1);
}
