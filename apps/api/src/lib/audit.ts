import { db } from "../db/client";
import { auditLogs } from "../db/schema";

export type RecordAuditInput = {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: unknown;
};

/** Appends an audit trail row for bill/payment/complaint/role changes (FR-AUD-1). */
export async function recordAudit(input: RecordAuditInput) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    meta: input.meta === undefined ? null : JSON.stringify(input.meta),
    createdBy: input.actorUserId,
    updatedBy: input.actorUserId,
  });
}
