import { Elysia } from "elysia";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  hashPin,
  verifyPin,
  verifyRefreshToken,
} from "@society-hub/auth";
import {
  googleAuthSchema,
  loginPinSchema,
  refreshSchema,
  requestOtpSchema,
  setPinSchema,
  verifyOtpSchema,
} from "@society-hub/validation";
import { env } from "../../config";
import { db } from "../../db/client";
import { otpChallenges, refreshTokens, users } from "../../db/schema";
import { AppError } from "../../lib/errors";
import {
  authPlugin,
  buildUserDto,
  hashToken,
  issueTokens,
  requireAuth,
  resolveMembership,
} from "../../lib/auth-context";

function nowMysql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

export const authRoutes = new Elysia({ prefix: "/v1/auth" })
  .use(authPlugin)
  .post("/otp/request", async ({ body }) => {
    const parsed = requestOtpSchema.parse(body);
    const code = env.devAuth ? env.devOtpCode : String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await Bun.password.hash(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    await db.insert(otpChallenges).values({
      id: crypto.randomUUID(),
      phone: parsed.phone,
      codeHash,
      expiresAt,
    });

    // MSG91 integration later; in DEV return code for local/mobile testing
    return {
      ok: true as const,
      ...(env.devAuth ? { devCode: code } : {}),
    };
  })
  .post("/otp/verify", async ({ body }) => {
    const parsed = verifyOtpSchema.parse(body);
    const [challenge] = await db
      .select()
      .from(otpChallenges)
      .where(
        and(
          eq(otpChallenges.phone, parsed.phone),
          isNull(otpChallenges.consumedAt),
          gt(otpChallenges.expiresAt, nowMysql()),
        ),
      )
      .orderBy(desc(otpChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      throw new AppError(400, "otp_invalid", "OTP expired or not found");
    }

    const ok =
      (env.devAuth && parsed.code === env.devOtpCode) ||
      (await Bun.password.verify(parsed.code, challenge.codeHash));
    if (!ok) {
      await db
        .update(otpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(otpChallenges.id, challenge.id));
      throw new AppError(400, "otp_invalid", "Invalid OTP");
    }

    await db
      .update(otpChallenges)
      .set({ consumedAt: nowMysql() })
      .where(eq(otpChallenges.id, challenge.id));

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, parsed.phone), eq(users.isDeleted, false)))
      .limit(1);
    if (!user) {
      throw new AppError(403, "not_onboarded", "Phone is not onboarded");
    }

    const membership = await resolveMembership(user.id);
    const dto = await buildUserDto(user.id, membership.tenantId, membership.role);
    const tokens = await issueTokens(
      user.id,
      membership.role,
      membership.tenantId,
      dto.flatId,
    );
    return { user: dto, tokens };
  })
  .post("/google", async ({ body }) => {
    const parsed = googleAuthSchema.parse(body);
    // Production: verify Google ID token via tokeninfo / jose JWKS.
    // DEV_AUTH: accept idToken shaped as `dev:<phone>` for local web/mobile.
    if (!env.devAuth) {
      throw new AppError(
        501,
        "google_not_configured",
        "Google SSO not configured yet; enable DEV_AUTH for local testing",
      );
    }
    if (!parsed.idToken.startsWith("dev:")) {
      throw new AppError(
        400,
        "invalid_google_token",
        "DEV Google token must be 'dev:<phone>'",
      );
    }
    const phone = parsed.idToken.slice("dev:".length);
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), eq(users.isDeleted, false)))
      .limit(1);
    if (!user) {
      throw new AppError(403, "not_onboarded", "Phone is not onboarded");
    }
    const membership = await resolveMembership(user.id);
    const dto = await buildUserDto(user.id, membership.tenantId, membership.role);
    const tokens = await issueTokens(
      user.id,
      membership.role,
      membership.tenantId,
      dto.flatId,
    );
    return { user: dto, tokens };
  })
  .post("/pin/login", async ({ body }) => {
    const parsed = loginPinSchema.parse(body);
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.phone, parsed.phone), eq(users.isDeleted, false)))
      .limit(1);
    if (!user?.pinHash) {
      throw new AppError(400, "pin_not_set", "PIN not set for this user");
    }
    const ok = await verifyPin(parsed.pin, user.pinHash);
    if (!ok) throw new AppError(401, "pin_invalid", "Invalid PIN");

    const membership = await resolveMembership(user.id);
    const dto = await buildUserDto(user.id, membership.tenantId, membership.role);
    const tokens = await issueTokens(
      user.id,
      membership.role,
      membership.tenantId,
      dto.flatId,
    );
    return { user: dto, tokens };
  })
  .post("/pin", async ({ body, auth }) => {
    const claims = requireAuth(auth);
    const parsed = setPinSchema.parse(body);
    const pinHash = await hashPin(parsed.pin);
    await db
      .update(users)
      .set({ pinHash, pinUpdatedAt: nowMysql() })
      .where(eq(users.id, claims.sub));
    return { ok: true as const };
  })
  .post("/refresh", async ({ body }) => {
    const parsed = refreshSchema.parse(body);
    let payload;
    try {
      payload = await verifyRefreshToken(parsed.refreshToken, env.jwtSecret);
    } catch {
      throw new AppError(401, "invalid_refresh", "Invalid refresh token");
    }

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, payload.jti))
      .limit(1);
    if (!stored || stored.revokedAt) {
      throw new AppError(401, "invalid_refresh", "Refresh token revoked");
    }
    if (hashToken(parsed.refreshToken) !== stored.tokenHash) {
      throw new AppError(401, "invalid_refresh", "Invalid refresh token");
    }

    await db
      .update(refreshTokens)
      .set({ revokedAt: nowMysql() })
      .where(eq(refreshTokens.id, stored.id));

    const membership = await resolveMembership(payload.sub);
    const dto = await buildUserDto(
      payload.sub,
      membership.tenantId,
      membership.role,
    );
    return issueTokens(
      payload.sub,
      membership.role,
      membership.tenantId,
      dto.flatId,
    );
  })
  .post("/logout", async ({ body, auth }) => {
    requireAuth(auth);
    const parsed = refreshSchema.parse(body);
    try {
      const payload = await verifyRefreshToken(parsed.refreshToken, env.jwtSecret);
      await db
        .update(refreshTokens)
        .set({ revokedAt: nowMysql() })
        .where(eq(refreshTokens.id, payload.jti));
    } catch {
      /* ignore */
    }
    return { ok: true as const };
  })
  .get("/me", async ({ auth }) => {
    const claims = requireAuth(auth);
    return buildUserDto(claims.sub, claims.tenantId, claims.role);
  });
