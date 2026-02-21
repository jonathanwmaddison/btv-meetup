"use client";

import { useState, useTransition } from "react";

type Props = {
  ideaId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  userVote: number | null;
};

export function IdeaVote({ ideaId, initialUpvotes, initialDownvotes, userVote }: Props) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [pending, startTransition] = useTransition();

  function vote(value: number) {
    startTransition(async () => {
      if (currentVote === value) {
        // Remove vote
        await fetch(`/api/ideas/${ideaId}/vote`, { method: "DELETE" });
        if (value === 1) setUpvotes((v) => v - 1);
        else setDownvotes((v) => v - 1);
        setCurrentVote(null);
      } else {
        const res = await fetch(`/api/ideas/${ideaId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value })
        });
        if (res.ok) {
          if (currentVote === 1) setUpvotes((v) => v - 1);
          if (currentVote === -1) setDownvotes((v) => v - 1);
          if (value === 1) setUpvotes((v) => v + 1);
          else setDownvotes((v) => v + 1);
          setCurrentVote(value);
        }
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.9rem" }}>
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        style={{
          padding: "0.2rem 0.5rem",
          fontSize: "0.85rem",
          background: currentVote === 1 ? "var(--brand)" : "transparent",
          color: currentVote === 1 ? "#fff" : "var(--ink)",
          border: "1px solid var(--line)"
        }}
      >
        +{upvotes}
      </button>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={pending}
        style={{
          padding: "0.2rem 0.5rem",
          fontSize: "0.85rem",
          background: currentVote === -1 ? "#354055" : "transparent",
          color: currentVote === -1 ? "#fff" : "var(--ink)",
          border: "1px solid var(--line)"
        }}
      >
        -{downvotes}
      </button>
    </span>
  );
}
