"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CancelRsvpButton({ rsvpId }: { rsvpId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        className="secondary"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await fetch(`/api/rsvps/${rsvpId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "cancelled" })
            });
            if (!res.ok) {
              const body = await res.json();
              setMessage(body.error ?? "Could not cancel");
              return;
            }
            setMessage("RSVP cancelled");
            router.refresh();
          });
        }}
      >
        {pending ? "Cancelling..." : "Cancel"}
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
