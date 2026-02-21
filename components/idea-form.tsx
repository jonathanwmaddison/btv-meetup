"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function IdeaForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });

      if (!res.ok) {
        const body = await res.json();
        setMessage(body.error ?? "Failed to submit idea");
        return;
      }

      setMessage("Idea submitted");
      setTitle("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Submit meetup idea</h2>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        rows={5}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit"}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
