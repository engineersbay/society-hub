import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { societyStaffRoleEnum } from "@society-hub/validation";
import { db } from "../../db/client";
import { societies, userRoles, users } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { ActivityType, recordActivity } from "../../lib/audit";
import {
  authPlugin,
  requireAuth,
  requirePlatform,
} from "../../lib/auth-context";

const addTeamMemberSchema = z.object({
  email: z.string().email().max(200).optional(),
  phone: z.string().min(10).max(15).optional(),
  name: z.string().min(1).max(120).optional(),
  role: societyStaffRoleEnum.default("chairperson"),
});

/**
 * Platform-only: add a SocietyHub person (or any user) onto a society's staff
 * team so they can use Client App Admin mode.
 */
export const manageTeamRoutes = new Elysia({
  prefix: "/v1/manage/societies",
})
  .use(authPlugin)
  .post("/:id/team", async ({ auth, params, body }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const parsed = addTeamMemberSchema.parse(body);
    if (!parsed.email && !parsed.phone) {
      throw new AppError(400, "identity_required", "email or phone is required");
    }

    const [society] = await db
      .select()
      .from(societies)
      .where(and(eq(societies.id, params.id), eq(societies.isDeleted, false)))
      .limit(1);
    if (!society) throw new AppError(404, "not_found", "Society not found");

    let userId: string | undefined;
    if (parsed.email) {
      const [byEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, parsed.email.toLowerCase()))
        .limit(1);
      userId = byEmail?.id;
    }
    if (!userId && parsed.phone) {
      const [byPhone] = await db
        .select()
        .from(users)
        .where(eq(users.phone, parsed.phone))
        .limit(1);
      userId = byPhone?.id;
    }

    if (!userId) {
      userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        email: parsed.email?.toLowerCase() ?? null,
        phone: parsed.phone ?? null,
        name: parsed.name ?? null,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
    } else if (parsed.name) {
      await db
        .update(users)
        .set({ name: parsed.name, updatedBy: claims.sub })
        .where(eq(users.id, userId));
    }

    const role = parsed.role === "admin" ? "chairperson" : parsed.role;
    const [existingRole] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.tenantId, params.id),
          eq(userRoles.role, role),
        ),
      )
      .limit(1);

    if (!existingRole) {
      await db.insert(userRoles).values({
        id: crypto.randomUUID(),
        tenantId: params.id,
        userId,
        role,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
    } else if (existingRole.isDeleted) {
      await db
        .update(userRoles)
        .set({ isDeleted: false, updatedBy: claims.sub })
        .where(eq(userRoles.id, existingRole.id));
    }

    recordActivity({
      tenantId: params.id,
      actorUserId: claims.sub,
      action: ActivityType.SOCIETY_TEAM_MEMBER_ADDED,
      entityType: "user",
      entityId: userId,
      message: `Added ${parsed.email ?? parsed.phone ?? userId} as ${role} on ${society.name}`,
      meta: { role, societyId: params.id, targetUserId: userId },
    });

    return {
      ok: true as const,
      userId,
      tenantId: params.id,
      role,
      societyName: society.name,
    };
  });
