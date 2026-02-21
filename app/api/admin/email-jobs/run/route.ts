import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { runSendRemindersJob, runSendRsvpUpdatesJob } from "@/lib/email-jobs";

type RunPayload = {
  job?: "send-reminders" | "send-rsvp-updates";
};

export async function POST(request: Request) {
  await requireRole(["admin"]);
  const body = (await request.json()) as RunPayload;

  if (!body.job) {
    return NextResponse.json({ error: "job is required" }, { status: 400 });
  }

  try {
    const result =
      body.job === "send-reminders"
        ? await runSendRemindersJob(request.url)
        : await runSendRsvpUpdatesJob(request.url);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
