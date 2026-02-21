"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type EventDefaults = {
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  venue?: string;
  capacity?: number;
  status?: "draft" | "published" | "cancelled";
};

type EventStatus = NonNullable<EventDefaults["status"]>;

export function EventForm({
  endpoint,
  method,
  defaults,
  submitLabel
}: {
  endpoint: string;
  method: "POST" | "PATCH";
  defaults?: EventDefaults;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState(defaults?.title ?? "");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [startsAt, setStartsAt] = useState(defaults?.starts_at ? defaults.starts_at.slice(0, 16) : "");
  const [endsAt, setEndsAt] = useState(defaults?.ends_at ? defaults.ends_at.slice(0, 16) : "");
  const [venue, setVenue] = useState(defaults?.venue ?? "");
  const [capacity, setCapacity] = useState(String(defaults?.capacity ?? 20));
  const [status, setStatus] = useState<EventStatus>(defaults?.status ?? "draft");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const body = {
        title,
        description,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        venue,
        capacity: Number(capacity),
        status
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Save failed");
        return;
      }

      setMessage("Saved");
      router.push("/organizer/events");
      router.refresh();
    });
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label htmlFor="description">Description</label>
      <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="grid two">
        <div>
          <label htmlFor="startsAt">Starts at</label>
          <input
            id="startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="endsAt">Ends at</label>
          <input id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>

      <div className="grid two">
        <div>
          <label htmlFor="venue">Venue</label>
          <input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="capacity">Capacity</label>
          <input
            id="capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />
        </div>
      </div>

      <label htmlFor="status">Status</label>
      <select id="status" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
        <option value="draft">draft</option>
        <option value="published">published</option>
        <option value="cancelled">cancelled</option>
      </select>

      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
