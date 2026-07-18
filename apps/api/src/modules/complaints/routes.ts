import { Elysia } from "elysia";
import { and, count, desc, eq } from "drizzle-orm";
import type { ComplaintDto } from "@society-hub/types";
import {
  createComplaintSchema,
  listQuerySchema,
  updateComplaintStatusSchema,
} from "@society-hub/validation";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../../config";
import { db } from "../../db/client";
import {
  complaintAttachments,
  complaints,
  flats,
  users,
} from "../../db/schema";
import { AppError } from "../../lib/errors";
import {
  authPlugin,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";

async function toComplaintDto(complaintId: string, tenantId: string): Promise<ComplaintDto> {
  const [row] = await db
    .select({
      complaint: complaints,
      flatNumber: flats.number,
      residentName: users.name,
    })
    .from(complaints)
    .innerJoin(flats, eq(flats.id, complaints.flatId))
    .leftJoin(users, eq(users.id, complaints.raisedByUserId))
    .where(
      and(
        eq(complaints.id, complaintId),
        eq(complaints.tenantId, tenantId),
        eq(complaints.isDeleted, false),
      ),
    )
    .limit(1);

  if (!row) throw new AppError(404, "not_found", "Complaint not found");

  const attachments = await db
    .select()
    .from(complaintAttachments)
    .where(
      and(
        eq(complaintAttachments.complaintId, complaintId),
        eq(complaintAttachments.isDeleted, false),
      ),
    );

  return {
    id: row.complaint.id,
    ticketNumber: row.complaint.ticketNumber,
    title: row.complaint.title,
    type: row.complaint.type,
    typeOtherText: row.complaint.typeOtherText,
    description: row.complaint.description,
    status: row.complaint.status,
    flatId: row.complaint.flatId,
    flatNumber: row.flatNumber,
    residentName: row.residentName,
    createdAt: row.complaint.createdAt,
    updatedAt: row.complaint.updatedAt,
    attachments: attachments.map((a) => ({
      id: a.id,
      contentKind: a.contentKind,
      contentType: a.contentType,
      url: `${env.publicApiUrl}/v1/media/${a.id}`,
      byteSize: a.byteSize,
    })),
  };
}

export const complaintRoutes = new Elysia({ prefix: "/v1/complaints" })
  .use(authPlugin)
  .get("/", async ({ auth, query }) => {
    const claims = requireAuth(auth);
    const q = listQuerySchema.parse(query);
    const offset = (q.page - 1) * q.limit;

    const where =
      claims.role === "admin"
        ? and(
            eq(complaints.tenantId, claims.tenantId),
            eq(complaints.isDeleted, false),
          )
        : and(
            eq(complaints.tenantId, claims.tenantId),
            eq(complaints.raisedByUserId, claims.sub),
            eq(complaints.isDeleted, false),
          );

    const countRows = await db
      .select({ total: count() })
      .from(complaints)
      .where(where);
    const total = Number(countRows[0]?.total ?? 0);

    const rows = await db
      .select({ id: complaints.id })
      .from(complaints)
      .where(where)
      .orderBy(desc(complaints.createdAt))
      .limit(q.limit)
      .offset(offset);

    const items = await Promise.all(
      rows.map((r) => toComplaintDto(r.id, claims.tenantId)),
    );

    return { items, page: q.page, limit: q.limit, total };
  })
  .get("/:id", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const dto = await toComplaintDto(params.id, claims.tenantId);
    if (
      claims.role === "resident" &&
      dto.flatId !== claims.flatId &&
      // residents only see own: check raised by via refetch
      true
    ) {
      const [c] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.id, params.id))
        .limit(1);
      if (c?.raisedByUserId !== claims.sub) {
        throw new AppError(404, "not_found", "Complaint not found");
      }
    }
    return dto;
  })
  .post("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["resident", "admin"]);
    const parsed = createComplaintSchema.parse(body);

    let flatId = claims.flatId;
    if (!flatId) {
      throw new AppError(
        400,
        "no_flat",
        "User is not linked to a flat; cannot raise complaint",
      );
    }

    const ticketNumber = `C-${Date.now().toString().slice(-8)}`;
    const id = crypto.randomUUID();
    await db.insert(complaints).values({
      id,
      tenantId: claims.tenantId,
      ticketNumber,
      title: parsed.title,
      type: parsed.type,
      typeOtherText: parsed.type === "other" ? parsed.typeOtherText ?? null : null,
      description: parsed.description,
      status: "open",
      flatId,
      raisedByUserId: claims.sub,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });

    return toComplaintDto(id, claims.tenantId);
  })
  .patch("/:id/status", async ({ auth, params, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin"]);
    const parsed = updateComplaintStatusSchema.parse(body);
    const [existing] = await db
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.id, params.id),
          eq(complaints.tenantId, claims.tenantId),
          eq(complaints.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Complaint not found");

    await db
      .update(complaints)
      .set({ status: parsed.status, updatedBy: claims.sub })
      .where(eq(complaints.id, params.id));

    return toComplaintDto(params.id, claims.tenantId);
  })
  .post("/:id/attachments", async ({ auth, params, request }) => {
    const claims = requireAuth(auth);
    const [existing] = await db
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.id, params.id),
          eq(complaints.tenantId, claims.tenantId),
          eq(complaints.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new AppError(404, "not_found", "Complaint not found");
    if (
      claims.role === "resident" &&
      existing.raisedByUserId !== claims.sub
    ) {
      throw new AppError(403, "forbidden", "Not your complaint");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError(400, "file_required", "file is required");
    }

    const contentType = file.type || "application/octet-stream";
    const isImage = contentType.startsWith("image/");
    const isVideo = contentType.startsWith("video/");
    if (!isImage && !isVideo) {
      throw new AppError(400, "invalid_type", "Only images and videos allowed");
    }
    const max = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > max) {
      throw new AppError(400, "file_too_large", "File exceeds size limit");
    }

    await mkdir(env.uploadDir, { recursive: true });
    const attachmentId = crypto.randomUUID();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const rel = `${claims.tenantId}/${params.id}/${attachmentId}.${ext}`;
    const abs = join(env.uploadDir, rel);
    await mkdir(join(env.uploadDir, claims.tenantId, params.id), {
      recursive: true,
    });
    await Bun.write(abs, file);

    await db.insert(complaintAttachments).values({
      id: attachmentId,
      tenantId: claims.tenantId,
      complaintId: params.id,
      contentKind: isImage ? "image" : "video",
      contentType,
      blobPath: rel,
      byteSize: file.size,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });

    return toComplaintDto(params.id, claims.tenantId);
  });

export const mediaRoutes = new Elysia({ prefix: "/v1/media" })
  .use(authPlugin)
  .get("/:id", async ({ auth, params, query }) => {
    // Allow Bearer or ?access_token= for <a href> / <img> in browsers
    let claims = auth;
    if (!claims && typeof query.access_token === "string") {
      try {
        const { verifyAccessToken } = await import("@society-hub/auth");
        claims = await verifyAccessToken(query.access_token, env.jwtSecret);
      } catch {
        claims = null;
      }
    }
    claims = requireAuth(claims);
    const [att] = await db
      .select()
      .from(complaintAttachments)
      .where(
        and(
          eq(complaintAttachments.id, params.id),
          eq(complaintAttachments.tenantId, claims.tenantId),
          eq(complaintAttachments.isDeleted, false),
        ),
      )
      .limit(1);
    if (!att) throw new AppError(404, "not_found", "Media not found");
    const file = Bun.file(join(env.uploadDir, att.blobPath));
    if (!(await file.exists())) {
      throw new AppError(404, "not_found", "File missing");
    }
    return new Response(file, {
      headers: { "Content-Type": att.contentType },
    });
  });
