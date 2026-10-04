import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { maskPhone, normalizePhoneE164 } from "./phone";
import {
  backoffMs,
  canTransition,
  classifySendFailure,
  idempotencyKey,
  mapVendorStatus,
} from "./status";
import { validateTemplateVariables } from "./templates";
import { decryptSecret, encryptSecret } from "./secrets";
import {
  GupshupWhatsAppProvider,
  MetaWhatsAppProvider,
  verifyTwilioRequest,
} from "./providers";

describe("phone normalization", () => {
  test("maps a 10-digit Indian mobile to E.164", () => {
    expect(normalizePhoneE164("9876543210")).toEqual({ ok: true, e164: "+919876543210" });
  });

  test("keeps an explicit E.164 number", () => {
    expect(normalizePhoneE164("+14155552671")).toEqual({ ok: true, e164: "+14155552671" });
  });

  test("rejects an ambiguous short number", () => {
    expect(normalizePhoneE164("12345")).toEqual({ ok: false, error: "invalid_recipient" });
  });

  test("masks all but the last four digits", () => {
    expect(maskPhone("+919876543210")).toBe("******3210");
  });
});

describe("communication status", () => {
  test("allows queued to processing and rejects delivered to queued", () => {
    expect(canTransition("queued", "processing")).toBe(true);
    expect(canTransition("delivered", "queued")).toBe(false);
    expect(canTransition("accepted", "delivered")).toBe(true);
  });

  test("retries only 429 and 5xx when no message id was returned", () => {
    expect(classifySendFailure({ httpStatus: 429, timedOut: false }).outcome).toBe("retry");
    expect(classifySendFailure({ httpStatus: 503, timedOut: false }).retryable).toBe(true);
    expect(classifySendFailure({ httpStatus: 400, timedOut: false }).retryable).toBe(false);
    expect(
      classifySendFailure({ httpStatus: null, timedOut: true }).category,
    ).toBe("timeout_uncertain");
    expect(classifySendFailure({ httpStatus: null, timedOut: true }).retryable).toBe(false);
  });

  test("maps vendor statuses into Society Hub states", () => {
    expect(mapVendorStatus("queued")).toBe("accepted");
    expect(mapVendorStatus("delivered")).toBe("delivered");
    expect(mapVendorStatus("read")).toBe("read");
    expect(mapVendorStatus("nope")).toBeNull();
  });

  test("builds a stable idempotency key", () => {
    expect(
      idempotencyKey({
        tenantId: "t1",
        businessEntityId: "p1",
        businessEventType: "payment_credited",
        recipientE164: "+919876543210",
        templateKey: "payment_credited_v1",
      }),
    ).toBe("t1:p1:payment_credited:+919876543210:payment_credited_v1");
  });

  test("backoff grows and stays capped", () => {
    expect(backoffMs(0)).toBeGreaterThanOrEqual(2_000);
    expect(backoffMs(8)).toBeLessThanOrEqual(60_000);
  });
});

describe("templates", () => {
  test("rejects a payment template that is missing amount", () => {
    const result = validateTemplateVariables("payment_credited_v1", { receiptNumber: "R1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(["amount"]);
  });

  test("accepts a complete bill template", () => {
    expect(validateTemplateVariables("bill_ready_v1", { amount: "₹10", period: "2026-10" })).toEqual({
      ok: true,
      version: "1",
    });
  });
});

describe("integration secrets", () => {
  test("round-trips a secret and does not echo it in ciphertext", () => {
    const cipher = encryptSecret("super-secret-token", "test-key-material");
    expect(cipher).not.toContain("super-secret-token");
    expect(decryptSecret(cipher, "test-key-material")).toBe("super-secret-token");
  });
});

describe("provider webhooks", () => {
  test("rejects a Twilio signature that does not match the auth token", () => {
    const params = { MessageSid: "SM123", MessageStatus: "delivered" };
    expect(verifyTwilioRequest("token", "not-the-signature", "https://api.example/hook", params)).toBe(
      false,
    );
    const url = "https://api.example/hook";
    const data = `${url}MessageSidSM123MessageStatusdelivered`;
    const good = createHmac("sha1", "token").update(data).digest("base64");
    expect(verifyTwilioRequest("token", good, url, params)).toBe(true);
  });

  test("parses a Gupshup delivered callback once", () => {
    const provider = new GupshupWhatsAppProvider({ apiKey: "k", source: "1", appName: "app" });
    expect(
      provider.parseStatus({ messageId: "g1", status: "delivered", timestamp: "10" }, {}),
    ).toEqual([
      {
        providerMessageId: "g1",
        status: "delivered",
        eventTimestamp: "10",
        errorCode: undefined,
      },
    ]);
  });

  test("parses a Meta status fixture", () => {
    const provider = new MetaWhatsAppProvider({
      token: "t",
      phoneNumberId: "1",
      appSecret: "s",
      verifyToken: "v",
    });
    const updates = provider.parseStatus({
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "wamid.1", status: "read", timestamp: "99" }] } },
          ],
        },
      ],
    });
    expect(updates).toEqual([
      {
        providerMessageId: "wamid.1",
        status: "read",
        eventTimestamp: "99",
        errorCode: undefined,
      },
    ]);
  });

  test("rejects an invalid Gupshup signature", () => {
    const provider = new GupshupWhatsAppProvider({ apiKey: "k", source: "1", appName: "app" });
    expect(
      provider.verifyWebhook({
        signature: "00",
        url: "",
        rawBody: "{}",
        params: {},
        secret: "k",
      }),
    ).toBe(false);
  });
});
