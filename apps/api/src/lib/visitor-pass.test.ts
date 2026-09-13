import { describe, expect, test } from "bun:test";
import {
  defaultPassExpiresAt,
  parseVisitorQrPayload,
  signVisitorQrPayload,
} from "./visitor-pass";

describe("visitor-pass", () => {
  test("signs and verifies QR payload", () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const passToken = "22222222-2222-2222-2222-222222222222";
    const payload = signVisitorQrPayload(tenantId, passToken);
    expect(payload.startsWith("shv1.")).toBe(true);
    expect(parseVisitorQrPayload(payload)).toEqual({ tenantId, passToken });
    expect(parseVisitorQrPayload(payload + "x")).toBeNull();
  });

  test("default expiry is about 4 hours from now when no expectedAt", () => {
    const now = new Date("2030-01-01T10:00:00.000Z");
    const exp = defaultPassExpiresAt(null, now);
    expect(exp.getTime() - now.getTime()).toBe(4 * 3600_000);
  });
});
