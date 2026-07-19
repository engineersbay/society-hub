import { env } from "../../config";

export type EmailSendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSendResult = {
  ok: boolean;
  provider: "resend" | "stub";
  messageId?: string;
  error?: string;
};

export interface EmailAdapter {
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

export class StubEmailAdapter implements EmailAdapter {
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    console.info(
      `[email:stub] to=${input.to} subject=${input.subject} body=${input.text.slice(0, 120)}…`,
    );
    return { ok: true, provider: "stub", messageId: `stub-email-${Date.now()}` };
  }
}

/** Minimal Resend adapter — replace with queued worker later. */
export class ResendEmailAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false,
          provider: "resend",
          error: `Resend ${res.status}: ${text.slice(0, 200)}`,
        };
      }
      const json = (await res.json()) as { id?: string };
      return { ok: true, provider: "resend", messageId: json.id };
    } catch (err) {
      return {
        ok: false,
        provider: "resend",
        error: err instanceof Error ? err.message : "Resend send failed",
      };
    }
  }
}

export function createEmailAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const from =
    process.env.RESEND_FROM ?? "SocietyHub <noreply@societyhub.local>";
  if (apiKey) {
    return new ResendEmailAdapter(apiKey, from);
  }
  if (!env.devAuth) {
    console.warn(
      "[email] RESEND_API_KEY not set — using stub adapter (messages not delivered)",
    );
  }
  return new StubEmailAdapter();
}
