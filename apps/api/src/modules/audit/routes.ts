import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import type { AuditLogDto } from "@society-hub/types";
import { db } from "../../db/client";
import { auditLogs, users } from "../../db/schema";
import { authPlugin, requireAuth, requireRole } from "../../lib/auth-context";

async function listAuditLogs(tenantId: string): Promise<AuditLogDto[]> {
  const rows = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorName: users.name,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      meta: auditLogs.meta,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.isDeleted, false)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);
  return rows;
}

export const auditRoutes = new Elysia({ prefix: "/v1/audit-logs" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    return listAuditLogs(claims.tenantId);
  });

/** Alias matching the original spec's `/v1/audit` path. */
export const auditAliasRoutes = new Elysia({ prefix: "/v1/audit" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    return listAuditLogs(claims.tenantId);
  });
