import { createHmac, timingSafeEqual } from "node:crypto";
import type { TemplateKey } from "./templates";
import { numberedContentVariables, sha256Text } from "./templates";
import { mapVendorStatus, type CommunicationStatus } from "./status";

export type WhatsAppProviderId = "stub" | "twilio" | "gupshup" | "meta";

export type WhatsAppTemplateSend = {
  toE164: string;
  templateKey: TemplateKey;
  language: string;
  variables: Record<string, string>;
  externalTemplateId: string;
  statusCallbackUrl: string;
};

export type WhatsAppSendResult = {
  ok: boolean;
  providerMessageId?: string;
  httpStatus?: number;
  error?: string;
  timedOut?: boolean;
  requestSha256: string;
  responseSha256?: string;
};

export type ProviderStatusUpdate = {
  providerMessageId: string;
  status: CommunicationStatus;
  eventTimestamp: string;
  errorCode?: string;
};

export type WebhookVerifyInput = {
  signature: string | null;
  url: string;
  rawBody: string;
  params: Record<string, string>;
  secret: string;
};

export interface WhatsAppProvider {
  id: WhatsAppProviderId;
  send(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult>;
  verifyWebhook(input: WebhookVerifyInput): boolean;
  parseStatus(body: unknown, params: Record<string, string>): ProviderStatusUpdate[];
}

function requestHash(input: WhatsAppTemplateSend): string {
  return sha256Text(
    `${input.templateKey}|${input.toE164.slice(-4)}|${input.externalTemplateId}`,
  );
}

export class StubWhatsAppProvider implements WhatsAppProvider {
  id = "stub" as const;

  async send(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult> {
    console.info(
      `[whatsapp:stub] template=${input.templateKey} to=******${input.toE164.slice(-4)}`,
    );
    return {
      ok: true,
      providerMessageId: `stub-${crypto.randomUUID()}`,
      httpStatus: 200,
      requestSha256: requestHash(input),
      responseSha256: sha256Text("stub"),
    };
  }

  verifyWebhook(): boolean {
    return false;
  }

  parseStatus(): ProviderStatusUpdate[] {
    return [];
  }
}

export type TwilioCredentials = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
  from: string;
};

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  id = "twilio" as const;

  constructor(private readonly credentials: TwilioCredentials) {}

  async send(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult> {
    const hash = requestHash(input);
    if (
      !this.credentials.accountSid ||
      !this.credentials.apiKeySid ||
      !this.credentials.apiKeySecret ||
      !this.credentials.from ||
      !input.externalTemplateId
    ) {
      return { ok: false, error: "configuration_error", httpStatus: 0, requestSha256: hash };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const body = new URLSearchParams({
        From: this.credentials.from.startsWith("whatsapp:")
          ? this.credentials.from
          : `whatsapp:${this.credentials.from}`,
        To: `whatsapp:${input.toE164}`,
        ContentSid: input.externalTemplateId,
        ContentVariables: JSON.stringify(
          numberedContentVariables(input.templateKey, input.variables),
        ),
      });
      if (input.statusCallbackUrl) body.set("StatusCallback", input.statusCallbackUrl);
      const auth = Buffer.from(
        `${this.credentials.apiKeySid}:${this.credentials.apiKeySecret}`,
      ).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
          signal: controller.signal,
        },
      );
      const text = await res.text();
      const responseSha256 = sha256Text(text.slice(0, 2000));
      let sid = "";
      try {
        sid = String((JSON.parse(text) as { sid?: string }).sid ?? "");
      } catch {
        sid = "";
      }
      if (!res.ok || !sid) {
        return {
          ok: false,
          httpStatus: res.status,
          error: `twilio_${res.status}`,
          requestSha256: hash,
          responseSha256,
        };
      }
      return {
        ok: true,
        providerMessageId: sid,
        httpStatus: res.status,
        requestSha256: hash,
        responseSha256,
      };
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "AbortError";
      return {
        ok: false,
        timedOut,
        error: timedOut ? "timeout" : "network_error",
        requestSha256: hash,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  verifyWebhook(input: WebhookVerifyInput): boolean {
    if (!input.secret || !input.signature) return false;
    return verifyTwilioRequest(input.secret, input.signature, input.url, input.params);
  }

  parseStatus(_body: unknown, params: Record<string, string>): ProviderStatusUpdate[] {
    const sid = params.MessageSid || params.SmsSid || "";
    const raw = params.MessageStatus || params.SmsStatus || "";
    const status = mapVendorStatus(raw);
    if (!sid || !status) return [];
    return [
      {
        providerMessageId: sid,
        status,
        eventTimestamp: params.Timestamp || params.DateUpdated || raw,
        errorCode: params.ErrorCode || undefined,
      },
    ];
  }
}

/**
 * Twilio signs webhooks with the account Auth Token.
 * Same construction as twilio.validateRequest (HMAC-SHA1 over URL + sorted params).
 */
export function verifyTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const keys = Object.keys(params).sort();
  let data = url;
  for (const key of keys) data += key + params[key];
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type GupshupCredentials = {
  apiKey: string;
  source: string;
  appName: string;
};

export class GupshupWhatsAppProvider implements WhatsAppProvider {
  id = "gupshup" as const;

  constructor(private readonly credentials: GupshupCredentials) {}

  async send(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult> {
    const hash = requestHash(input);
    if (!this.credentials.apiKey || !this.credentials.source || !input.externalTemplateId) {
      return { ok: false, error: "configuration_error", requestSha256: hash };
    }
    const params = numberedContentVariables(input.templateKey, input.variables);
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: this.credentials.source,
      destination: input.toE164.replace(/\D/g, ""),
      "src.name": this.credentials.appName,
      template: JSON.stringify({
        id: input.externalTemplateId,
        params: Object.keys(params)
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => params[key]),
      }),
    });
    try {
      const res = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
        method: "POST",
        headers: {
          apikey: this.credentials.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      let messageId = "";
      try {
        const json = JSON.parse(text) as { messageId?: string };
        messageId = json.messageId ?? "";
      } catch {
        messageId = "";
      }
      if (!res.ok || !messageId) {
        return {
          ok: false,
          httpStatus: res.status,
          error: `gupshup_${res.status}`,
          requestSha256: hash,
          responseSha256: sha256Text(text.slice(0, 500)),
        };
      }
      return {
        ok: true,
        providerMessageId: messageId,
        httpStatus: res.status,
        requestSha256: hash,
        responseSha256: sha256Text(messageId),
      };
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return { ok: false, timedOut, error: "network_error", requestSha256: hash };
    }
  }

  verifyWebhook(input: WebhookVerifyInput): boolean {
    if (!input.secret || !input.signature) return false;
    const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(input.signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  parseStatus(body: unknown, _params: Record<string, string> = {}): ProviderStatusUpdate[] {
    const record = (body ?? {}) as { messageId?: string; status?: string; timestamp?: string; errorCode?: string };
    const status = mapVendorStatus(String(record.status ?? ""));
    if (!record.messageId || !status) return [];
    return [
      {
        providerMessageId: record.messageId,
        status,
        eventTimestamp: String(record.timestamp ?? record.status),
        errorCode: record.errorCode,
      },
    ];
  }
}

export type MetaCredentials = {
  token: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
};

export class MetaWhatsAppProvider implements WhatsAppProvider {
  id = "meta" as const;

  constructor(private readonly credentials: MetaCredentials) {}

  async send(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult> {
    const hash = requestHash(input);
    if (!this.credentials.token || !this.credentials.phoneNumberId || !input.externalTemplateId) {
      return { ok: false, error: "configuration_error", requestSha256: hash };
    }
    const numbered = numberedContentVariables(input.templateKey, input.variables);
    const parameters = Object.keys(numbered)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({ type: "text", text: numbered[key] }));
    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${this.credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.credentials.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: input.toE164.replace(/\D/g, ""),
            type: "template",
            template: {
              name: input.externalTemplateId,
              language: { code: input.language || "en" },
              components: [{ type: "body", parameters }],
            },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const text = await res.text();
      let messageId = "";
      try {
        const json = JSON.parse(text) as { messages?: Array<{ id?: string }> };
        messageId = json.messages?.[0]?.id ?? "";
      } catch {
        messageId = "";
      }
      if (!res.ok || !messageId) {
        return {
          ok: false,
          httpStatus: res.status,
          error: `meta_${res.status}`,
          requestSha256: hash,
          responseSha256: sha256Text(text.slice(0, 500)),
        };
      }
      return {
        ok: true,
        providerMessageId: messageId,
        httpStatus: res.status,
        requestSha256: hash,
        responseSha256: sha256Text(messageId),
      };
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return { ok: false, timedOut, error: "network_error", requestSha256: hash };
    }
  }

  verifyWebhook(input: WebhookVerifyInput): boolean {
    if (!input.secret || !input.signature) return false;
    const expected = `sha256=${createHmac("sha256", input.secret).update(input.rawBody).digest("hex")}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(input.signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  parseStatus(body: unknown, _params: Record<string, string> = {}): ProviderStatusUpdate[] {
    const root = body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ code?: number }> }>;
          };
        }>;
      }>;
    };
    const updates: ProviderStatusUpdate[] = [];
    for (const entry of root.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const item of change.value?.statuses ?? []) {
          const status = mapVendorStatus(String(item.status ?? ""));
          if (!item.id || !status) continue;
          updates.push({
            providerMessageId: item.id,
            status,
            eventTimestamp: String(item.timestamp ?? item.status),
            errorCode: item.errors?.[0]?.code ? String(item.errors[0].code) : undefined,
          });
        }
      }
    }
    return updates;
  }
}

export function verifyMetaHub(mode: string, token: string, expected: string): boolean {
  return mode === "subscribe" && Boolean(expected) && token === expected;
}
