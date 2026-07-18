import { and, eq } from "drizzle-orm";
import {
  accessExpiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  type AccessClaims,
} from "@society-hub/auth";
import type { Role, UserDto } from "@society-hub/types";
import { Elysia } from "elysia";
import { env } from "../config";
import { db } from "../db/client";
import {
  flats,
  refreshTokens,
  residents,
  societies,
  userRoles,
  users,
} from "../db/schema";
import { AppError } from "./errors";
import { hashToken } from "./auth-helpers";

export {
  hashToken,
  isStaffRole,
  requireAuth,
  requireRole,
} from "./auth-helpers";

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
    username: user.username,
    role,
    tenantId,
    flatId,
    flatNumber,
    hasPin: Boolean(user.pinHash),
  };
}

export async function issueTokens(
  userId: string,
  role: Role,
  tenantId: string,
  flatId?: string | null,
) {
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

export async function listMemberships(userId: string) {
  const rows = await db
    .select({
      tenantId: userRoles.tenantId,
      role: userRoles.role,
      societyName: societies.name,
    })
    .from(userRoles)
    .innerJoin(societies, eq(societies.id, userRoles.tenantId))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.isDeleted, false),
        eq(societies.isDeleted, false),
      ),
    );
  return rows;
}

export async function resolveMembership(userId: string) {
  const [roleRow] = await db
    .select()
    .from(userRoles)
    .where(
      and(eq(userRoles.userId, userId), eq(userRoles.isDeleted, false)),
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
