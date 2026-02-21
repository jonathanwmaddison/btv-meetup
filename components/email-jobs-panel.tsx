"use client";

import { useState, useTransition } from "react";

type JobName = "send-reminders" | "send-rsvp-updates";

type RunResult = {
  ok?: boolean;
  job?: JobName;
  sent?: number;
  skipped?: number;
  failed?: number;
  processed?: number;
  error?: string;
};

type Props = {
  remindersSent24h: number;
  waitlistSent24h: number;
  totalSent24h: number;
};

export function EmailJobsPanel({ remindersSent24h, waitlistSent24h, totalSent24h }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<RunResult | null>(null);

  function runJob(job: JobName) {
    setMessage("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/email-jobs/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job })
        });

        const body = (await res.json()) as RunResult;
        setLastResult(body);
        if (!res.ok) {
          setMessage(body.error ?? "Job failed.");
          return;
        }
        setMessage("Job completed.");
      } catch {
        setMessage("Network error while running job.");
      }
    });
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Last 24 Hours</h2>
        <p>Total emails sent: {totalSent24h}</p>
        <p>24-hour reminders sent: {remindersSent24h}</p>
        <p>Waitlist promotions sent: {waitlistSent24h}</p>
      </section>

      <section className="card">
        <h2>Manual Runs</h2>
        <p className="muted">Use this for smoke tests or if a cron run was missed.</p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" onClick={() => runJob("send-reminders")} disabled={pending}>
            {pending ? "Running..." : "Run 24-hour reminders"}
          </button>
          <button type="button" className="secondary" onClick={() => runJob("send-rsvp-updates")} disabled={pending}>
            {pending ? "Running..." : "Run waitlist updates"}
          </button>
        </div>
        {message && <p style={{ marginTop: "0.7rem" }}>{message}</p>}
        {lastResult && (
          <p className="muted" style={{ marginTop: "0.4rem" }}>
            Result: processed {lastResult.processed ?? 0}, sent {lastResult.sent ?? 0}, skipped {lastResult.skipped ?? 0}, failed{" "}
            {lastResult.failed ?? 0}.
          </p>
        )}
      </section>
    </div>
  );
}
