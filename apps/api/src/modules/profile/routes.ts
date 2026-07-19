import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import type { ResidentProfileDto } from "@society-hub/types";
import { updateResidentProfileSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { residentProfiles } from "../../db/schema";
import { authPlugin, requireAuth } from "../../lib/auth-context";
import { upsertProfile } from "./upsert-profile";

/** Shared with auth/routes.ts so `PATCH /v1/auth/profile` (used by the SDK) stays in sync. */
export { upsertProfile };

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
