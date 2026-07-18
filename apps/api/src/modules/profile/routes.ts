import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import type { ResidentProfileDto } from "@society-hub/types";
import { updateResidentProfileSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { residentProfiles } from "../../db/schema";
import { authPlugin, requireAuth } from "../../lib/auth-context";

async function upsertProfile(
  tenantId: string,
  userId: string,
  patch: { emergencyContact?: string | null; vehicleNumber?: string | null },
) {
  const [existing] = await db
    .select()
    .from(residentProfiles)
    .where(and(eq(residentProfiles.tenantId, tenantId), eq(residentProfiles.userId, userId)))
    .limit(1);

  if (!existing) {
    await db.insert(residentProfiles).values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      emergencyContact: patch.emergencyContact ?? null,
      vehicleNumber: patch.vehicleNumber ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
    return;
  }

  await db
    .update(residentProfiles)
    .set({
      emergencyContact:
        patch.emergencyContact !== undefined ? patch.emergencyContact : existing.emergencyContact,
      vehicleNumber:
        patch.vehicleNumber !== undefined ? patch.vehicleNumber : existing.vehicleNumber,
      isDeleted: false,
      updatedBy: userId,
    })
    .where(eq(residentProfiles.id, existing.id));
}

export async function getProfileDto(
  tenantId: string,
  userId: string,
): Promise<ResidentProfileDto> {
  const [row] = await db
    .select()
    .from(residentProfiles)
    .where(
      and(
        eq(residentProfiles.tenantId, tenantId),
        eq(residentProfiles.userId, userId),
        eq(residentProfiles.isDeleted, false),
      ),
    )
    .limit(1);
  return {
    userId,
    emergencyContact: row?.emergencyContact ?? null,
    vehicleNumber: row?.vehicleNumber ?? null,
  };
}

export const profileRoutes = new Elysia({ prefix: "/v1/profile" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    return getProfileDto(claims.tenantId, claims.sub);
  })
  .patch("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    const parsed = updateResidentProfileSchema.parse(body);
    await upsertProfile(claims.tenantId, claims.sub, parsed);
    return getProfileDto(claims.tenantId, claims.sub);
  });

/** Shared with auth/routes.ts so `PATCH /v1/auth/profile` (used by the SDK) stays in sync. */
export { upsertProfile };
