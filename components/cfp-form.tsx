"use client";

import { FormEvent, useState, useTransition } from "react";

export function CfpForm() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const res = await fetch("/api/cfp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, abstract })
      });
      const body = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not submit proposal");
        return;
      }
      setTitle("");
      setAbstract("");
      setMessage("Proposal submitted! Organizers will review it.");
    });
  }

  return (
    <section className="card">
      <h2>Submit a Talk</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="cfp-title">Talk Title</label>
        <input
          id="cfp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Building Real-Time Apps with WebSockets"
          required
        />
        <label htmlFor="cfp-abstract">Abstract</label>
        <textarea
          id="cfp-abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder="Describe your talk, what attendees will learn, and why it matters..."
          required
        />
        <button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit Proposal"}
        </button>
      </form>
      {message && <p style={{ marginTop: "0.75rem" }}>{message}</p>}
    </section>
  );
}
