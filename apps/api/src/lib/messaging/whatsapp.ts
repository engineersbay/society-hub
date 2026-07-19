import { env } from "../../config";

export type WhatsAppSendInput = {
  toPhone: string;
  body: string;
};

export type WhatsAppSendResult = {
  ok: boolean;
  provider: "gupshup" | "stub";
  messageId?: string;
  error?: string;
};

export interface WhatsAppAdapter {
  send(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

/** Dev / missing-credentials adapter — logs and succeeds. */
export class StubWhatsAppAdapter implements WhatsAppAdapter {
  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    console.info(
      `[whatsapp:stub] to=${input.toPhone} body=${input.body.slice(0, 120)}…`,
    );
    return { ok: true, provider: "stub", messageId: `stub-${Date.now()}` };
  }
}

/**
 * Gupshup WhatsApp adapter. Swap for Meta WhatsApp Business API later by
 * implementing WhatsAppAdapter and selecting via env.
 *
 * Docs: https://docs.gupshup.io/docs/send-message-api
 */
export class GupshupWhatsAppAdapter implements WhatsAppAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly source: string,
    private readonly appName: string,
    private readonly endpoint = "https://api.gupshup.io/wa/api/v1/msg",
  ) {}

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const destination = input.toPhone.replace(/\D/g, "");
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: this.source,
      destination,
      message: JSON.stringify({ type: "text", text: input.body }),
      "src.name": this.appName,
    });

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          apikey: this.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false,
          provider: "gupshup",
          error: `Gupshup ${res.status}: ${text.slice(0, 200)}`,
        };
      }
      const json = (await res.json().catch(() => ({}))) as {
        messageId?: string;
      };
      return {
        ok: true,
        provider: "gupshup",
        messageId: json.messageId,
      };
    } catch (err) {
      return {
        ok: false,
        provider: "gupshup",
        error: err instanceof Error ? err.message : "Gupshup send failed",
      };
    }
  }
}

export function createWhatsAppAdapter(): WhatsAppAdapter {
  const apiKey = process.env.GUPSHUP_API_KEY ?? "";
  const source = process.env.GUPSHUP_SOURCE ?? "";
  const appName = process.env.GUPSHUP_APP_NAME ?? "";
  if (apiKey && source && appName) {
    return new GupshupWhatsAppAdapter(apiKey, source, appName);
  }
  if (!env.devAuth) {
    console.warn(
      "[whatsapp] GUPSHUP_* not set — using stub adapter (messages not delivered)",
    );
  }
  return new StubWhatsAppAdapter();
}
