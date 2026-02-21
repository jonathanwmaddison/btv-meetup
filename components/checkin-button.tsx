"use client";

import { useState, useTransition } from "react";

type Props = {
  eventId: string;
};

export function CheckinButton({ eventId }: Props) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onCheckin() {
    setMessage("");
    startTransition(async () => {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId })
      });
      const body = (await res.json()) as { error?: string; checked_in_at?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not check in");
        return;
      }
      setMessage("Checked in!");
    });
  }

  return (
    <div>
      <button type="button" onClick={onCheckin} disabled={pending}>
        {pending ? "Checking in..." : "Check In"}
      </button>
      {message && <p className="muted" style={{ marginTop: "0.25rem" }}>{message}</p>}
    </div>
  );
}
