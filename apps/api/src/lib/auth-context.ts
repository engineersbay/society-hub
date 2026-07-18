import { and, eq } from "drizzle-orm";
import {
  accessExpiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  type AccessClaims,
} from "@society-hub/auth";
import type { Role, UserDto } from "@society-hub/types";
import { createHash } from "node:crypto";
import { Elysia } from "elysia";
import { env } from "../config";
import { db } from "../db/client";
import { flats, refreshTokens, residents, userRoles, users } from "../db/schema";
import { AppError } from "./errors";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function buildUserDto(
  userId: string,
  tenantId: string,
  role: Role,
): Promise<UserDto> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
    .limit(1);
  if (!user) throw new AppError(404, "user_not_found", "User not found");

  let flatId: string | null = null;
  let flatNumber: string | null = null;
  if (role === "resident") {
    const [res] = await db
      .select({
        flatId: residents.flatId,
        number: flats.number,
      })
      .from(residents)
      .innerJoin(flats, eq(flats.id, residents.flatId))
      .where(
        and(
          eq(residents.userId, userId),
          eq(residents.tenantId, tenantId),
          eq(residents.isDeleted, false),
        ),
      )
      .limit(1);
    flatId = res?.flatId ?? null;
    flatNumber = res?.number ?? null;
  }

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role,
    tenantId,
    flatId,
    flatNumber,
    hasPin: Boolean(user.pinHash),
  };
}

export async function issueTokens(userId: string, role: Role, tenantId: string, flatId?: string | null) {
  const accessToken = await signAccessToken(
    { sub: userId, role, tenantId, flatId: flatId ?? null },
    env.jwtSecret,
  );
  const jti = crypto.randomUUID();
  const refreshToken = await signRefreshToken(userId, jti, env.jwtSecret);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  await db.insert(refreshTokens).values({
    id: jti,
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: accessExpiresInSeconds(),
  };
}

export async function resolveMembership(userId: string) {
  const [roleRow] = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.isDeleted, false),
      ),
    )
    .limit(1);
  if (!roleRow) {
    throw new AppError(
      403,
      "not_onboarded",
      "Phone is not onboarded to any society",
    );
  }
  return roleRow;
}

export const authPlugin = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      return { auth: null as AccessClaims | null };
    }
    const token = header.slice("Bearer ".length);
    try {
      const claims = await verifyAccessToken(token, env.jwtSecret);
      return { auth: claims };
    } catch {
      return { auth: null as AccessClaims | null };
    }
  },
);

export function requireAuth(auth: AccessClaims | null): AccessClaims {
  if (!auth) throw new AppError(401, "unauthorized", "Authentication required");
  return auth;
}

export function requireRole(auth: AccessClaims, roles: Role[]) {
  if (!roles.includes(auth.role)) {
    throw new AppError(403, "forbidden", "Insufficient permissions");
  }
}
