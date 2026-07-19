import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import type { NotificationDto } from "@society-hub/types";
import { db } from "../../db/client";
import { notifications } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { authPlugin, requireAuth } from "../../lib/auth-context";

function nowMysql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function toDto(row: typeof notifications.$inferSelect): NotificationDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    readAt: row.readAt,
    linkPath: row.linkPath,
    createdAt: row.createdAt,
  };
}

export const notificationRoutes = new Elysia({ prefix: "/v1/notifications" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, claims.tenantId),
          eq(notifications.userId, claims.sub),
          eq(notifications.isDeleted, false),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return rows.map(toDto);
  })
  .post("/:id/read", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.userId, claims.sub),
          eq(notifications.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Notification not found");

    if (!existing.readAt) {
      await db
        .update(notifications)
        .set({ readAt: nowMysql() })
        .where(eq(notifications.id, params.id));
    }
    const [row] = await db.select().from(notifications).where(eq(notifications.id, params.id)).limit(1);
    return toDto(row!);
  });
