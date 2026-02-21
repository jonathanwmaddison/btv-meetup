"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const baseUrl = envAppUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const debugRedirectTo = baseUrl ? `${baseUrl}/auth/callback` : "";
  const showDebug = process.env.NEXT_PUBLIC_DEBUG_AUTH === "1";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${baseUrl}/auth/callback`;

    if (next) {
      document.cookie = `btv_next=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email for the login link.");
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Sign in</h2>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit">Send magic link</button>
      {message && <p>{message}</p>}
      {error && <p>{error}</p>}
      {showDebug && debugRedirectTo && (
        <p className="muted" style={{ marginTop: "0.75rem", wordBreak: "break-all" }}>
          Debug redirect: <code>{debugRedirectTo}</code>
        </p>
      )}
    </form>
  );
}
