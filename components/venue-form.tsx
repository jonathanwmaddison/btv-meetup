"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VenueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [parking, setParking] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          capacity: capacity ? parseInt(capacity) : null,
          accessibility_notes: accessibility || null,
          parking_info: parking || null,
          website: website || null
        })
      });
      const body = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Could not create venue");
        return;
      }
      setName("");
      setAddress("");
      setCapacity("");
      setAccessibility("");
      setParking("");
      setWebsite("");
      setMessage("Venue created!");
      router.refresh();
    });
  }

  return (
    <section className="card">
      <h2>Add Venue</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="v-name">Name</label>
        <input id="v-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Generator" />

        <label htmlFor="v-address">Address</label>
        <input id="v-address" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="123 Main St, Burlington VT" />

        <div className="grid two">
          <div>
            <label htmlFor="v-capacity">Capacity (optional)</label>
            <input id="v-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div>
            <label htmlFor="v-website">Website (optional)</label>
            <input id="v-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <label htmlFor="v-accessibility">Accessibility Notes (optional)</label>
        <input id="v-accessibility" value={accessibility} onChange={(e) => setAccessibility(e.target.value)} placeholder="Wheelchair accessible, elevator available" />

        <label htmlFor="v-parking">Parking Info (optional)</label>
        <input id="v-parking" value={parking} onChange={(e) => setParking(e.target.value)} placeholder="Free street parking, garage next door" />

        <button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Add Venue"}
        </button>
      </form>
      {message && <p style={{ marginTop: "0.5rem" }}>{message}</p>}
    </section>
  );
}
