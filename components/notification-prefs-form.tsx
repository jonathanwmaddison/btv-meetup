"use client";

import { useState, useTransition } from "react";

type Prefs = {
  email_new_events: boolean;
  email_rsvp_updates: boolean;
  email_weekly_digest: boolean;
  email_cfp_updates: boolean;
};

type Props = {
  initial: Prefs;
};

export function NotificationPrefsForm({ initial }: Props) {
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof Prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs)
      });
      if (res.ok) {
        setMessage("Preferences saved.");
      } else {
        setMessage("Could not save preferences.");
      }
    });
  }

  const options: { key: keyof Prefs; label: string; description: string }[] = [
    { key: "email_new_events", label: "New Events", description: "Get notified when new events are published" },
    {
      key: "email_rsvp_updates",
      label: "RSVP Updates & Reminders",
      description: "Get waitlist promotions and 24-hour event reminders"
    },
    { key: "email_weekly_digest", label: "Weekly Digest", description: "Receive a weekly summary of upcoming events" },
    { key: "email_cfp_updates", label: "CFP Updates", description: "Get notified about talk proposal status changes" }
  ];

  return (
    <div className="grid">
      <section className="card hero">
        <span className="eyebrow">Settings</span>
        <h1>Notification Preferences</h1>
        <p className="muted">Choose which email notifications you receive.</p>
      </section>

      <section className="card">
        {options.map((opt) => (
          <label
            key={opt.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0",
              borderBottom: "1px solid var(--line)",
              cursor: "pointer",
              fontWeight: 400
            }}
          >
            <input
              type="checkbox"
              checked={prefs[opt.key]}
              onChange={() => toggle(opt.key)}
              style={{ width: "auto", marginBottom: 0 }}
            />
            <div>
              <strong>{opt.label}</strong>
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{opt.description}</p>
            </div>
          </label>
        ))}

        <button type="button" onClick={save} disabled={pending} style={{ marginTop: "1rem" }}>
          {pending ? "Saving..." : "Save Preferences"}
        </button>
        {message && <p style={{ marginTop: "0.5rem" }}>{message}</p>}
      </section>
    </div>
  );
}
