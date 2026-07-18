import { Elysia } from "elysia";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { NoticeDto } from "@society-hub/types";
import { createNoticeSchema, updateNoticeSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { flats, noticeReads, notices } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";
import { softDelete } from "../../lib/soft-delete";
import {
  authPlugin,
  isStaffRole,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";

function nowMysql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function toDto(row: typeof notices.$inferSelect): NoticeDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    wingId: row.wingId,
    flatId: row.flatId,
    publishedAt: row.publishedAt,
    unpublishedAt: row.unpublishedAt,
    createdAt: row.createdAt,
  };
}

export const noticeRoutes = new Elysia({ prefix: "/v1/notices" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    const base = and(eq(notices.tenantId, claims.tenantId), eq(notices.isDeleted, false));

    if (isStaffRole(claims.role)) {
      const rows = await db.select().from(notices).where(base).orderBy(desc(notices.createdAt));
      return rows.map(toDto);
    }

    let wingId: string | null = null;
    if (claims.flatId) {
      const [flat] = await db.select().from(flats).where(eq(flats.id, claims.flatId)).limit(1);
      wingId = flat?.wingId ?? null;
    }

    const rows = await db
      .select()
      .from(notices)
      .where(and(base, isNotNull(notices.publishedAt), isNull(notices.unpublishedAt)))
      .orderBy(desc(notices.createdAt));

    const visible = rows.filter((r) => {
      if (r.audience === "all") return true;
      if (r.audience === "wing") return Boolean(wingId) && r.wingId === wingId;
      if (r.audience === "flat") return Boolean(claims.flatId) && r.flatId === claims.flatId;
      return false;
    });
    return visible.map(toDto);
  })
  .post("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = createNoticeSchema.parse(body);
    const id = crypto.randomUUID();
    await db.insert(notices).values({
      id,
      tenantId: claims.tenantId,
      title: parsed.title,
      body: parsed.body,
      audience: parsed.audience,
      wingId: parsed.wingId ?? null,
      flatId: parsed.flatId ?? null,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });
    const [row] = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    return toDto(row!);
  })
  .patch("/:id", async ({ auth, params, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = updateNoticeSchema.parse(body);
    const [existing] = await db
      .select()
      .from(notices)
      .where(
        and(
          eq(notices.id, params.id),
          eq(notices.tenantId, claims.tenantId),
          eq(notices.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Notice not found");

    await db
      .update(notices)
      .set({
        title: parsed.title ?? existing.title,
        body: parsed.body ?? existing.body,
        updatedBy: claims.sub,
      })
      .where(eq(notices.id, params.id));
    const [row] = await db.select().from(notices).where(eq(notices.id, params.id)).limit(1);
    return toDto(row!);
  })
  .post("/:id/publish", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const [existing] = await db
      .select()
      .from(notices)
      .where(
        and(
          eq(notices.id, params.id),
          eq(notices.tenantId, claims.tenantId),
          eq(notices.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Notice not found");

    await db
      .update(notices)
      .set({ publishedAt: nowMysql(), unpublishedAt: null, updatedBy: claims.sub })
      .where(eq(notices.id, params.id));

    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: "notice.published",
      entityType: "notice",
      entityId: params.id,
    });

    const [row] = await db.select().from(notices).where(eq(notices.id, params.id)).limit(1);
    return toDto(row!);
  })
  .post("/:id/unpublish", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const [existing] = await db
      .select()
      .from(notices)
      .where(
        and(
          eq(notices.id, params.id),
          eq(notices.tenantId, claims.tenantId),
          eq(notices.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Notice not found");

    await db
      .update(notices)
      .set({ unpublishedAt: nowMysql(), updatedBy: claims.sub })
      .where(eq(notices.id, params.id));

    const [row] = await db.select().from(notices).where(eq(notices.id, params.id)).limit(1);
    return toDto(row!);
  })
  .post("/:id/read", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const [existing] = await db
      .select()
      .from(noticeReads)
      .where(and(eq(noticeReads.noticeId, params.id), eq(noticeReads.userId, claims.sub)))
      .limit(1);
    if (!existing) {
      await db.insert(noticeReads).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        noticeId: params.id,
        userId: claims.sub,
      });
    }
    return { ok: true as const };
  })
  .delete("/:id", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    await softDelete(notices, params.id, claims.sub);
    return { ok: true as const };
  });
