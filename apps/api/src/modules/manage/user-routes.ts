import { Elysia } from "elysia";
import { and, desc, eq, like, or, inArray } from "drizzle-orm";
import type {
  ActivityEventDto,
  PlatformUserDto,
  PlatformUserMembershipDto,
  Role,
} from "@society-hub/types";
import { db } from "../../db/client";
import { societies, userRoles, users } from "../../db/schema";
import { AppError } from "../../lib/errors";
import {
  latestActivityAtForUsers,
  listPlatformActivity,
  listUserActivity,
} from "../../lib/audit";
import {
  authPlugin,
  normalizeRole,
  requireAuth,
  requirePlatform,
} from "../../lib/auth-context";

function toActivityDto(
  row: Awaited<ReturnType<typeof listUserActivity>>[number],
): ActivityEventDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    societyName: row.societyName,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    action: row.action,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    meta: row.meta,
    createdAt: row.createdAt,
  };
}

async function membershipsForUsers(
  userIds: string[],
): Promise<Map<string, PlatformUserMembershipDto[]>> {
  const map = new Map<string, PlatformUserMembershipDto[]>();
  if (userIds.length === 0) return map;

  const rows = await db
    .select({
      userId: userRoles.userId,
      tenantId: userRoles.tenantId,
      role: userRoles.role,
      societyName: societies.name,
    })
    .from(userRoles)
    .innerJoin(societies, eq(societies.id, userRoles.tenantId))
    .where(
      and(
        eq(userRoles.isDeleted, false),
        eq(societies.isDeleted, false),
        inArray(userRoles.userId, userIds),
      ),
    );

  for (const row of rows) {
    const list = map.get(row.userId) ?? [];
    list.push({
      tenantId: row.tenantId,
      societyName: row.societyName,
      role: normalizeRole(row.role as Role),
    });
    map.set(row.userId, list);
  }
  return map;
}

async function buildPlatformUser(userId: string): Promise<PlatformUserDto> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
    .limit(1);
  if (!user) throw new AppError(404, "not_found", "User not found");

  const memberships = await membershipsForUsers([userId]);
  const last = await latestActivityAtForUsers([userId]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    username: user.username,
    memberships: memberships.get(userId) ?? [],
    createdAt: user.createdAt,
    lastActivityAt: last.get(userId) ?? null,
  };
}

/**
 * Platform user directory + Fassport-style per-user activity history.
 */
export const manageUserRoutes = new Elysia({ prefix: "/v1/manage/users" })
  .use(authPlugin)
  .get("/", async ({ auth, query }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

    const conditions = [eq(users.isDeleted, false)];
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          like(users.email, pattern),
          like(users.phone, pattern),
          like(users.name, pattern),
          like(users.username, pattern),
        )!,
      );
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(q ? 100 : 500);

    const ids = rows.map((r) => r.id);
    const [memberships, activity] = await Promise.all([
      membershipsForUsers(ids),
      latestActivityAtForUsers(ids),
    ]);

    return rows.map(
      (r): PlatformUserDto => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        username: r.username,
        memberships: memberships.get(r.id) ?? [],
        createdAt: r.createdAt,
        lastActivityAt: activity.get(r.id) ?? null,
      }),
    );
  })
  .get("/:id", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    return buildPlatformUser(params.id);
  })
  .get("/:id/activity", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, params.id), eq(users.isDeleted, false)))
      .limit(1);
    if (!user) throw new AppError(404, "not_found", "User not found");
    const rows = await listUserActivity(params.id, 100);
    return rows.map(toActivityDto);
  });

export const manageActivityRoutes = new Elysia({ prefix: "/v1/manage/activity" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const rows = await listPlatformActivity(100);
    return rows.map(toActivityDto);
  });
