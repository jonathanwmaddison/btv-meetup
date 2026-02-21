function escapeIcs(value: string) {
  return value.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

type IcsEvent = {
  uid: string;
  title: string;
  description?: string | null;
  venue: string;
  starts_at: string;
  ends_at?: string | null;
};

export function generateIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BTV Meetup//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@btv-meetup`,
    `DTSTART:${toIcsDate(event.starts_at)}`,
  ];

  if (event.ends_at) {
    lines.push(`DTEND:${toIcsDate(event.ends_at)}`);
  }

  lines.push(`SUMMARY:${escapeIcs(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }

  lines.push(`LOCATION:${escapeIcs(event.venue)}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
