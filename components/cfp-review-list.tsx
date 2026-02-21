"use client";

import { useState, useTransition } from "react";

type Submission = {
  id: string;
  title: string;
  abstract: string;
  status: string;
  created_at: string;
  user_id: string;
  event_id: string | null;
  speaker_id: string | null;
};

type Props = {
  submissions: Submission[];
};

export function CfpReviewList({ submissions: initial }: Props) {
  const [submissions, setSubmissions] = useState(initial);
  const [pending, startTransition] = useTransition();

  function updateStatus(id: string, status: string) {
    startTransition(async () => {
      const res = await fetch(`/api/cfp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      }
    });
  }

  return (
    <>
      {!submissions.length && (
        <section className="card">
          <p>No submissions yet.</p>
        </section>
      )}
      {submissions.map((sub) => (
        <article key={sub.id} className="card">
          <h3>{sub.title}</h3>
          <p>{sub.abstract}</p>
          <p className="muted">
            Status: <strong>{sub.status}</strong> &middot; Submitted: {new Date(sub.created_at).toLocaleDateString()}
          </p>
          {sub.status === "pending" && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => updateStatus(sub.id, "approved")} disabled={pending}>
                Approve
              </button>
              <button type="button" className="secondary" onClick={() => updateStatus(sub.id, "rejected")} disabled={pending}>
                Reject
              </button>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
