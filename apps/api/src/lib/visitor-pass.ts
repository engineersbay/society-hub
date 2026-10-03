import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { hashPin, verifyPin } from "@society-hub/auth";
import { env } from "../config";

const PASS_PREFIX = "shv1";

/** In-memory OTP verify attempt limiter (per passToken). */
const otpVerifyAttempts = new Map<string, { count: number; windowStart: number }>();
const OTP_VERIFY_MAX = 8;
const OTP_VERIFY_WINDOW_MS = 15 * 60_000;

function passSecret() {
  return process.env.VISITOR_PASS_SECRET || env.jwtSecret;
}

export function assertOtpVerifyAllowed(passToken: string) {
  const now = Date.now();
  const cur = otpVerifyAttempts.get(passToken);
  if (!cur || now - cur.windowStart > OTP_VERIFY_WINDOW_MS) {
    otpVerifyAttempts.set(passToken, { count: 0, windowStart: now });
    return;
  }
  if (cur.count >= OTP_VERIFY_MAX) {
    throw new Error("otp_rate_limited");
  }
}

export function recordOtpVerifyFailure(passToken: string) {
  const now = Date.now();
  const cur = otpVerifyAttempts.get(passToken);
  if (!cur || now - cur.windowStart > OTP_VERIFY_WINDOW_MS) {
    otpVerifyAttempts.set(passToken, { count: 1, windowStart: now });
    return;
  }
  cur.count += 1;
}

export function clearOtpVerifyAttempts(passToken: string) {
  otpVerifyAttempts.delete(passToken);
}

export function generateVisitorOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function hashVisitorOtp(otp: string) {
  return hashPin(otp);
}

export async function verifyVisitorOtp(otp: string, hash: string) {
  return verifyPin(otp, hash);
}

export function signVisitorQrPayload(tenantId: string, passToken: string): string {
  const body = `${tenantId}.${passToken}`;
  const sig = createHmac("sha256", passSecret()).update(body).digest("base64url");
  return `${PASS_PREFIX}.${body}.${sig}`;
}

export function parseVisitorQrPayload(
  payload: string,
): { tenantId: string; passToken: string } | null {
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PASS_PREFIX) return null;
  const [, tenantId, passToken, sig] = parts as [string, string, string, string];
  if (!tenantId || !passToken || !sig) return null;
  const body = `${tenantId}.${passToken}`;
  const expected = createHmac("sha256", passSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { tenantId, passToken };
}

/** Default expiry: 4h from expectedAt or now; clamp max 24h from now. */
export function defaultPassExpiresAt(expectedAt: string | null | undefined, now = new Date()): Date {
  const base = expectedAt ? new Date(expectedAt.includes("T") ? expectedAt : expectedAt.replace(" ", "T") + "Z") : now;
  const start = Number.isNaN(base.getTime()) || base < now ? now : base;
  const expires = new Date(start.getTime() + 4 * 3600_000);
  const max = new Date(now.getTime() + 24 * 3600_000);
  return expires > max ? max : expires;
}

export function toMysqlDatetime(d: Date) {
  return d.toISOString().replace("T", " ").replace("Z", "");
}
