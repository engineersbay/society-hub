import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createApp } from "./app";
import { signVisitorQrPayload } from "./lib/visitor-pass";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

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
  expect(verify.ok).toBe(true);
  return (await verify.json()) as {
    user: { id: string; role: string; flatId: string | null };
    tokens: { accessToken: string; refreshToken: string };
  };
}

describe("visitor pass integration", () => {
  beforeAll(() => {
    if (process.env.API_URL) {
      base = process.env.API_URL;
      return;
    }
    const app = createApp().listen(0);
    server = app;
    const port = app.server?.port;
    if (!port) throw new Error("Failed to bind in-process API");
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    server?.stop(true);
    server = null;
  });

  test("issue, preview, verify, revoke, and cross-tenant 404", async () => {
    const resident = await otpLogin("8888888888");
    const staff = await otpLogin("9999999999");
    const rAuth = {
      Authorization: `Bearer ${resident.tokens.accessToken}`,
      "Content-Type": "application/json",
    };
    const sAuth = {
      Authorization: `Bearer ${staff.tokens.accessToken}`,
      "Content-Type": "application/json",
    };

    const created = await fetch(`${base}/v1/visitors`, {
      method: "POST",
      headers: rAuth,
      body: JSON.stringify({
        visitorName: "Pass Guest",
        phone: "9876543210",
        purpose: "Visit",
      }),
    });
    expect(created.ok).toBe(true);
    const visitor = (await created.json()) as { id: string; passStatus: string };
    expect(visitor.passStatus).toBe("none");

    const noPhone = await fetch(`${base}/v1/visitors`, {
      method: "POST",
      headers: rAuth,
      body: JSON.stringify({ visitorName: "No Phone" }),
    });
    expect(noPhone.ok).toBe(true);
    const noPhoneBody = (await noPhone.json()) as { id: string };
    const issueNoPhone = await fetch(`${base}/v1/visitors/${noPhoneBody.id}/pass`, {
      method: "POST",
      headers: rAuth,
      body: JSON.stringify({}),
    });
    expect(issueNoPhone.status).toBe(400);

    const issued = await fetch(`${base}/v1/visitors/${visitor.id}/pass`, {
      method: "POST",
      headers: rAuth,
      body: JSON.stringify({ channels: ["sms", "whatsapp"] }),
    });
    expect(issued.ok).toBe(true);
    const pass = (await issued.json()) as {
      visitor: { passStatus: string; passToken: string };
      qrPayload: string;
      otp: string;
      expiresAt: string;
    };
    expect(pass.visitor.passStatus).toBe("issued");
    expect(pass.qrPayload.startsWith("shv1.")).toBe(true);
    expect(pass.otp).toMatch(/^\d{6}$/);

    const preview = await fetch(`${base}/v1/gate/pass/${pass.visitor.passToken}`, {
      headers: { Authorization: sAuth.Authorization },
    });
    expect(preview.ok).toBe(true);
    const previewBody = (await preview.json()) as { visitorName: string; passStatus: string };
    expect(previewBody.visitorName).toBe("Pass Guest");
    expect(previewBody.passStatus).toBe("issued");

    const badPreview = await fetch(
      `${base}/v1/gate/pass/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: sAuth.Authorization } },
    );
    expect(badPreview.status).toBe(404);

    const wrongOtp = await fetch(`${base}/v1/gate/verify`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({ passToken: pass.visitor.passToken, otp: "000000" }),
    });
    expect(wrongOtp.status).toBe(401);

    const foreignQr = signVisitorQrPayload(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      pass.visitor.passToken,
    );
    const crossTenant = await fetch(`${base}/v1/gate/verify`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({ qrPayload: foreignQr }),
    });
    expect(crossTenant.status).toBe(404);

    const verified = await fetch(`${base}/v1/gate/verify`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({ qrPayload: pass.qrPayload, otp: pass.otp }),
    });
    expect(verified.ok).toBe(true);
    const verifiedBody = (await verified.json()) as {
      passStatus: string;
      checkedInAt: string | null;
    };
    expect(verifiedBody.passStatus).toBe("used");
    expect(verifiedBody.checkedInAt).toBeTruthy();

    const reuse = await fetch(`${base}/v1/gate/verify`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({ qrPayload: pass.qrPayload }),
    });
    expect(reuse.status).toBe(409);

    const walkIn = await fetch(`${base}/v1/visitors`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({
        visitorName: "Walk-in",
        phone: "9123456780",
        flatId: resident.user.flatId,
        purpose: "Gate",
      }),
    });
    expect(walkIn.ok).toBe(true);
    const walkInBody = (await walkIn.json()) as { id: string };
    const walkPass = await fetch(`${base}/v1/visitors/${walkInBody.id}/pass`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({}),
    });
    expect(walkPass.ok).toBe(true);
    const walkPassBody = (await walkPass.json()) as {
      visitor: { id: string; passToken: string };
    };
    const revoked = await fetch(`${base}/v1/visitors/${walkInBody.id}/pass/revoke`, {
      method: "POST",
      headers: { Authorization: sAuth.Authorization },
    });
    expect(revoked.ok).toBe(true);
    const revokeBody = (await revoked.json()) as { passStatus: string };
    expect(revokeBody.passStatus).toBe("revoked");
    const verifyRevoked = await fetch(`${base}/v1/gate/verify`, {
      method: "POST",
      headers: sAuth,
      body: JSON.stringify({ passToken: walkPassBody.visitor.passToken }),
    });
    expect(verifyRevoked.status).toBe(409);
  });
});
