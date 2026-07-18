import { Elysia } from "elysia";
import { and, eq, inArray, or } from "drizzle-orm";
import { createInvitationSchema, onboardResidentSchema } from "@society-hub/validation";
import type { TeamMemberDto } from "@society-hub/types";
import { db } from "../../db/client";
import {
  buildings,
  flats,
  residents,
  userRoles,
  users,
  wings,
} from "../../db/schema";
import { AppError } from "../../lib/errors";
import { createInvitationForTenant } from "../invitations/routes";
import {
  authPlugin,
  buildUserDto,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";

async function listTeamForTenant(tenantId: string): Promise<TeamMemberDto[]> {
  return db
    .select({
      userId: userRoles.userId,
      role: userRoles.role,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(
      and(
        eq(userRoles.tenantId, tenantId),
        inArray(userRoles.role, ["admin", "superadmin"]),
        eq(userRoles.isDeleted, false),
        eq(users.isDeleted, false),
      ),
    );
}

export const teamRoutes = new Elysia({ prefix: "/v1/team" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    return listTeamForTenant(claims.tenantId);
  });

export const adminRoutes = new Elysia({ prefix: "/v1/admin" })
  .use(authPlugin)
  .get("/flats", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const rows = await db
      .select({
        id: flats.id,
        number: flats.number,
        wingId: flats.wingId,
        wingName: wings.name,
      })
      .from(flats)
      .leftJoin(wings, eq(wings.id, flats.wingId))
      .where(
        and(eq(flats.tenantId, claims.tenantId), eq(flats.isDeleted, false)),
      );
    return rows.map((r) => ({
      id: r.id,
      number: r.number,
      wingId: r.wingId,
      wingName: r.wingName,
    }));
  })
  .get("/structure", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);

    const [buildingRows, wingRows, flatRows] = await Promise.all([
      db
        .select()
        .from(buildings)
        .where(
          and(eq(buildings.tenantId, claims.tenantId), eq(buildings.isDeleted, false)),
        ),
      db
        .select()
        .from(wings)
        .where(and(eq(wings.tenantId, claims.tenantId), eq(wings.isDeleted, false))),
      db
        .select()
        .from(flats)
        .where(and(eq(flats.tenantId, claims.tenantId), eq(flats.isDeleted, false))),
    ]);

    return {
      buildings: buildingRows.map((b) => ({
        id: b.id,
        name: b.name,
        wings: wingRows
          .filter((w) => w.buildingId === b.id)
          .map((w) => ({
            id: w.id,
            name: w.name,
            buildingId: w.buildingId,
            flats: flatRows
              .filter((f) => f.wingId === w.id)
              .map((f) => ({ id: f.id, number: f.number, wingId: f.wingId, wingName: w.name })),
          })),
      })),
    };
  })
  .get("/team", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    return listTeamForTenant(claims.tenantId);
  })
  .post("/invites", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = createInvitationSchema.parse(body);
    return createInvitationForTenant(claims.tenantId, claims.sub, parsed);
  })
  .post("/residents", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = onboardResidentSchema.parse(body);

    const [flat] = await db
      .select()
      .from(flats)
      .where(
        and(
          eq(flats.id, parsed.flatId),
          eq(flats.tenantId, claims.tenantId),
          eq(flats.isDeleted, false),
        ),
      )
      .limit(1);
    if (!flat) throw new AppError(404, "flat_not_found", "Flat not found");

    // Look up by phone OR email so a resident already onboarded elsewhere
    // (multi-society) reuses their single user record.
    const [existing] = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, parsed.phone), eq(users.email, parsed.email)))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        phone: parsed.phone,
        name: parsed.name,
        email: parsed.email,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
    } else if (existing) {
      await db
        .update(users)
        .set({
          name: parsed.name,
          email: parsed.email,
          phone: existing.phone ?? parsed.phone,
          updatedBy: claims.sub,
        })
        .where(eq(users.id, userId));
    }

    const [role] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.tenantId, claims.tenantId),
          eq(userRoles.role, "resident"),
        ),
      )
      .limit(1);
    if (!role) {
      await db.insert(userRoles).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        userId,
        role: "resident",
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
    }

    const [res] = await db
      .select()
      .from(residents)
      .where(
        and(
          eq(residents.userId, userId),
          eq(residents.tenantId, claims.tenantId),
        ),
      )
      .limit(1);
    if (!res) {
      await db.insert(residents).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        userId,
        flatId: parsed.flatId,
        isOwner: true,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
    } else {
      await db
        .update(residents)
        .set({ flatId: parsed.flatId, isDeleted: false, updatedBy: claims.sub })
        .where(eq(residents.id, res.id));
    }

    const user = await buildUserDto(userId, claims.tenantId, "resident");
    return { user };
  });
