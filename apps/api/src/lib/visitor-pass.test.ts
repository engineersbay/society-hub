import { describe, expect, test } from "bun:test";
import {
  assertOtpVerifyAllowed,
  clearOtpVerifyAttempts,
  defaultPassExpiresAt,
  generateVisitorOtp,
  hashVisitorOtp,
  parseVisitorQrPayload,
  recordOtpVerifyFailure,
  signVisitorQrPayload,
  toMysqlDatetime,
  verifyVisitorOtp,
} from "./visitor-pass";

describe("visitor-pass", () => {
  test("signs and verifies QR payload", () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const passToken = "22222222-2222-2222-2222-222222222222";
    const payload = signVisitorQrPayload(tenantId, passToken);
    expect(payload.startsWith("shv1.")).toBe(true);
    expect(parseVisitorQrPayload(payload)).toEqual({ tenantId, passToken });
    expect(parseVisitorQrPayload(payload + "x")).toBeNull();
    expect(parseVisitorQrPayload("nope")).toBeNull();
    expect(parseVisitorQrPayload("shv1.a.b")).toBeNull();
  });

  test("default expiry is about 4 hours from now when no expectedAt", () => {
    const now = new Date("2030-01-01T10:00:00.000Z");
    const exp = defaultPassExpiresAt(null, now);
    expect(exp.getTime() - now.getTime()).toBe(4 * 3600_000);
  });

  test("default expiry uses expectedAt and clamps past/invalid to now", () => {
    const now = new Date("2030-01-01T10:00:00.000Z");
    const fromExpected = defaultPassExpiresAt("2030-01-01T12:00:00.000Z", now);
    expect(fromExpected.toISOString()).toBe("2030-01-01T16:00:00.000Z");

    const mysqlStyle = defaultPassExpiresAt("2030-01-01 12:00:00", now);
    expect(mysqlStyle.toISOString()).toBe("2030-01-01T16:00:00.000Z");

    const past = defaultPassExpiresAt("2020-01-01T00:00:00.000Z", now);
    expect(past.getTime() - now.getTime()).toBe(4 * 3600_000);

    const invalid = defaultPassExpiresAt("not-a-date", now);
    expect(invalid.getTime() - now.getTime()).toBe(4 * 3600_000);
  });

  test("toMysqlDatetime formats UTC", () => {
    expect(toMysqlDatetime(new Date("2030-01-01T10:00:00.000Z"))).toBe(
      "2030-01-01 10:00:00.000",
    );
  });

  test("OTP generate, hash, and verify", async () => {
    const otp = generateVisitorOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const hash = await hashVisitorOtp(otp);
    expect(await verifyVisitorOtp(otp, hash)).toBe(true);
    expect(await verifyVisitorOtp("000000", hash)).toBe(false);
  });

  test("OTP verify attempt limiter", () => {
    const token = `tok-${Date.now()}`;
    assertOtpVerifyAllowed(token);
    for (let i = 0; i < 8; i++) {
      recordOtpVerifyFailure(token);
    }
    expect(() => assertOtpVerifyAllowed(token)).toThrow("otp_rate_limited");
    clearOtpVerifyAttempts(token);
    assertOtpVerifyAllowed(token);
  });
});
