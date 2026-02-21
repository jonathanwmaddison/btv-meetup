"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RoleForm({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role })
      });

      if (!res.ok) {
        const body = await res.json();
        setMessage(body.error ?? "Failed");
        return;
      }

      setMessage("Updated");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="member">member</option>
        <option value="organizer">organizer</option>
        <option value="admin">admin</option>
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
      {message && <small>{message}</small>}
    </form>
  );
}
