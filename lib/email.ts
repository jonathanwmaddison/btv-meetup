type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SendEmailResult = {
  sent: boolean;
  skipped: boolean;
  message: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      skipped: true,
      message: "Email not configured (missing RESEND_API_KEY or EMAIL_FROM)."
    };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }

  return { sent: true, skipped: false, message: "Sent" };
}
