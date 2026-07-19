import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import type { ResidentProfileDto } from "@society-hub/types";
import { updateResidentProfileSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import {
  buildings,
  flats,
  residentProfiles,
  residents,
  societies,
  wings,
} from "../../db/schema";
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

  const [society] = await db
    .select({ name: societies.name })
    .from(societies)
    .where(and(eq(societies.id, tenantId), eq(societies.isDeleted, false)))
    .limit(1);

  const [flatRow] = await db
    .select({
      id: flats.id,
      number: flats.number,
      floor: flats.floor,
      parkingSlot: flats.parkingSlot,
      wingName: wings.name,
      buildingName: buildings.name,
      isOwner: residents.isOwner,
    })
    .from(residents)
    .innerJoin(flats, eq(flats.id, residents.flatId))
    .leftJoin(wings, eq(wings.id, flats.wingId))
    .leftJoin(buildings, eq(buildings.id, wings.buildingId))
    .where(
      and(
        eq(residents.tenantId, tenantId),
        eq(residents.userId, userId),
        eq(residents.isDeleted, false),
        eq(flats.isDeleted, false),
      ),
    )
    .limit(1);

  return {
    userId,
    emergencyContact: row?.emergencyContact ?? null,
    vehicleNumber: row?.vehicleNumber ?? null,
    societyName: society?.name ?? null,
    flat: flatRow
      ? {
          id: flatRow.id,
          number: flatRow.number,
          wingName: flatRow.wingName ?? null,
          buildingName: flatRow.buildingName ?? null,
          floor: flatRow.floor ?? null,
          parkingSlot: flatRow.parkingSlot ?? null,
          isOwner: Boolean(flatRow.isOwner),
        }
      : null,
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
