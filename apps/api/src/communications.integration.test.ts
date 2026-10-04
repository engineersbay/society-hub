import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createApp } from "./app";
import { db } from "./db/client";
import { communicationTransactions } from "./db/schema";
import {
  applyProviderStatus,
  enqueueWhatsApp,
  processDueCommunications,
} from "./lib/messaging/communication-service";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

async function passwordLogin(email: string, password: string) {
  const res = await fetch(`${base}/v1/auth/password/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as {
    user: { id: string; role: string };
    tokens: { accessToken: string };
  };
}

async function otpLogin(phone: string) {
  await fetch(`${base}/v1/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const verify = await fetch(`${base}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: "123456" }),
  });
  expect(verify.status).toBe(200);
  return (await verify.json()) as {
    user: { id: string; role: string };
    tokens: { accessToken: string };
  };
}

describe("whatsapp integration settings", () => {
  beforeAll(() => {
    process.env.INTEGRATION_CONFIG_KEY = "test-integration-key";
    process.env.DEV_AUTH = "true";
    const app = createApp().listen(0);
    server = app;
    const port = app.server?.port;
    if (!port) throw new Error("Failed to bind API");
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server?.stop(true);
  });

  test("platform admin can save Twilio settings and GET does not echo secrets", async () => {
    const admin = await passwordLogin("superadmin@societyhub.local", "Test@1234");
    const secret = "api-key-secret-value";
    const token = "auth-token-value";
    const saved = await fetch(`${base}/v1/manage/integrations/whatsapp`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "stub",
        twilio: {
          accountSid: "ACtest",
          apiKeySid: "SKtest",
          apiKeySecret: secret,
          authToken: token,
          whatsappFrom: "whatsapp:+14155552671",
        },
      }),
    });
    expect(saved.status).toBe(200);
    const body = (await saved.json()) as {
      provider: string;
      twilio: { apiKeySecretSet: boolean; authTokenSet: boolean; accountSid: string };
    };
    expect(body.provider).toBe("stub");
    expect(body.twilio.apiKeySecretSet).toBe(true);
    expect(body.twilio.authTokenSet).toBe(true);
    expect(body.twilio.accountSid).toBe("ACtest");
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(JSON.stringify(body)).not.toContain(token);
  });

  test("a resident cannot patch WhatsApp settings", async () => {
    const resident = await otpLogin("8888888888");
    const res = await fetch(`${base}/v1/manage/integrations/whatsapp`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${resident.tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider: "twilio" }),
    });
    expect(res.status).toBe(403);
  });

  test("an invalid Twilio callback is rejected", async () => {
    const res = await fetch(`${base}/v1/integrations/whatsapp/twilio/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid",
      },
      body: "MessageSid=SM1&MessageStatus=delivered",
    });
    expect(res.status).toBe(403);
  });

  test("staff cannot read another tenant communication", async () => {
    const staff = await otpLogin("9999999999");
    const me = await fetch(`${base}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${staff.tokens.accessToken}` },
    });
    const meBody = (await me.json()) as { user: { tenantId?: string }; tenantId?: string };
    const tenantId = meBody.tenantId ?? meBody.user.tenantId ?? "";
    const id = crypto.randomUUID();
    await db.insert(communicationTransactions).values({
      id,
      tenantId: "00000000-0000-4000-8000-00000000ffff",
      communicationReference: `SH-MSG-TEST-${id.slice(0, 6)}`,
      correlationId: "SH-COR-test",
      idempotencyKey: `cross-${id}`,
      channel: "whatsapp",
      provider: "stub",
      templateKey: "bill_ready_v1",
      templateVersion: "1",
      language: "en",
      recipientE164: "+919876543210",
      recipientLast4: "3210",
      status: "queued",
      businessEntityType: "bill",
      businessEntityId: id,
      businessEventType: "bill_ready",
      preferenceMode: "opt_in",
      requestedAt: new Date().toISOString().replace("T", " ").replace("Z", ""),
      contentSha256: "abc",
    });
    const res = await fetch(`${base}/v1/admin/communications/${id}`, {
      headers: { Authorization: `Bearer ${staff.tokens.accessToken}` },
    });
    expect(res.status).toBe(404);
    expect(tenantId).not.toBe("00000000-0000-4000-8000-00000000ffff");
    await db.delete(communicationTransactions).where(eq(communicationTransactions.id, id));
  });

  test("stub worker delivers once and a repeated event does not send again", async () => {
    const staff = await otpLogin("9999999999");
    const meRes = await fetch(`${base}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${staff.tokens.accessToken}` },
    });
    const me = (await meRes.json()) as { id: string; tenantId: string; phone: string | null };
    expect(me.phone).toBeTruthy();
    const entityId = crypto.randomUUID();
    const input = {
      tenantId: me.tenantId,
      userId: me.id,
      phone: me.phone ?? "",
      templateKey: "bill_ready_v1" as const,
      variables: { amount: "₹1.00", period: "2026-10" },
      businessEntityType: "bill",
      businessEntityId: entityId,
      businessEventType: "bill_ready_worker",
      preferenceMode: "explicit" as const,
    };
    const queued = await enqueueWhatsApp(input);
    expect(queued.ok).toBe(true);
    expect(queued.status).toBe("queued");
    await processDueCommunications(20);
    const [row] = await db
      .select()
      .from(communicationTransactions)
      .where(eq(communicationTransactions.id, queued.id ?? ""))
      .limit(1);
    expect(row?.status).toBe("delivered");
    expect(row?.provider).toBe("stub");
    const again = await enqueueWhatsApp(input);
    expect(again.duplicate).toBe(true);
    expect(again.id).toBe(queued.id);

    const optedOut = await enqueueWhatsApp({
      ...input,
      businessEntityId: crypto.randomUUID(),
      businessEventType: "bill_ready_opt_out",
      preferenceMode: "opt_in",
    });
    expect(optedOut.status).toBe("cancelled");
    expect(optedOut.ok).toBe(false);

    const callback = {
      provider: "stub" as const,
      update: {
        providerMessageId: row?.providerMessageId ?? "",
        status: "delivered" as const,
        eventTimestamp: "same",
      },
      payloadSha256: "hash",
    };
    expect(await applyProviderStatus(callback)).toBe("duplicate");
    expect(await applyProviderStatus(callback)).toBe("duplicate");
  });
});
