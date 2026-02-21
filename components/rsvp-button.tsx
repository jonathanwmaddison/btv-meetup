"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RsvpButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await fetch("/api/rsvps", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event_id: eventId })
            });
            const body = await res.json();
            if (!res.ok) {
              setMessage(body.error ?? "Failed to RSVP");
              return;
            }
            setMessage(`RSVP saved (${body.status}).`);
            router.refresh();
          });
        }}
      >
        {pending ? "Saving..." : "RSVP"}
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
