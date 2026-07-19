import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { residentProfiles } from "../../db/schema";

/** @returns true when a row was inserted or fields changed */
export async function upsertProfile(
  tenantId: string,
  userId: string,
  patch: { emergencyContact?: string | null; vehicleNumber?: string | null },
): Promise<boolean> {
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
    return true;
  }

  const nextEmergency =
    patch.emergencyContact !== undefined
      ? patch.emergencyContact
      : existing.emergencyContact;
  const nextVehicle =
    patch.vehicleNumber !== undefined
      ? patch.vehicleNumber
      : existing.vehicleNumber;
  const changed =
    (existing.emergencyContact ?? null) !== (nextEmergency ?? null) ||
    (existing.vehicleNumber ?? null) !== (nextVehicle ?? null) ||
    existing.isDeleted;

  if (!changed) return false;

  await db
    .update(residentProfiles)
    .set({
      emergencyContact: nextEmergency,
      vehicleNumber: nextVehicle,
      isDeleted: false,
      updatedBy: userId,
    })
    .where(eq(residentProfiles.id, existing.id));
  return true;
}
