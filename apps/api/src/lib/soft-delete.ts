import { eq } from "drizzle-orm";
import type { AnyMySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { db } from "../db/client";

/** Any table built with the shared `timestamps` + `id()` helpers in db/schema.ts. */
export type SoftDeletableTable = MySqlTable & {
  id: AnyMySqlColumn;
  isDeleted: AnyMySqlColumn;
  updatedBy: AnyMySqlColumn;
};

/**
 * Marks a row as deleted instead of removing it, per the soft-delete
 * convention used across all business tables (`is_deleted` + `updated_by`).
 */
export async function softDelete(
  table: SoftDeletableTable,
  id: string,
  actorId: string | null,
) {
  await db
    .update(table)
    .set({ isDeleted: true, updatedBy: actorId } as Record<string, unknown>)
    .where(eq(table.id, id));
}
