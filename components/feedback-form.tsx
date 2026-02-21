"use client";

import { useState, useTransition } from "react";

type Props = {
  eventId: string;
};

export function FeedbackForm({ eventId }: Props) {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(rating: number) {
    setMessage("");
    startTransition(async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, rating, comment: comment || null })
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not submit feedback");
        return;
      }
      setMessage("Thanks for your feedback!");
    });
  }

  return (
    <div className="card">
      <h3>How was this event?</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        rows={2}
        maxLength={2000}
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button type="button" onClick={() => submit(1)} disabled={pending}>
          Thumbs Up
        </button>
        <button type="button" className="secondary" onClick={() => submit(-1)} disabled={pending}>
          Thumbs Down
        </button>
      </div>
      {message && <p className="muted" style={{ marginTop: "0.5rem" }}>{message}</p>}
    </div>
  );
}
