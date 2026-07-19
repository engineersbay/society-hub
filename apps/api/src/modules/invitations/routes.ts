import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { createInvitationSchema } from "@society-hub/validation";
import type { InvitationDto } from "@society-hub/types";
import { env } from "../../config";
import { db } from "../../db/client";
import { invitations } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { authPlugin, requireAuth,
  requireSocietyStaff } from "../../lib/auth-context";

function toDto(row: typeof invitations.$inferSelect): InvitationDto {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    ...(env.devAuth ? { devToken: row.token } : {}),
  };
}

export async function createInvitationForTenant(
  tenantId: string,
  invitedBy: string,
  parsed: { email?: string | null; phone?: string | null; role: InvitationDto["role"] },
): Promise<InvitationDto> {
  if (!parsed.email && !parsed.phone) {
    throw new AppError(400, "email_or_phone_required", "Provide an email or phone");
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, "");
  await db.insert(invitations).values({
    id,
    tenantId,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    role: parsed.role,
    token,
    status: "pending",
    invitedBy,
    createdBy: invitedBy,
    updatedBy: invitedBy,
  });

  // Email/SMS delivery (Resend/MSG91) is wired up in the notifications
  // worker for Phase 2; DEV_AUTH surfaces the raw token for local testing.
  const [row] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return toDto(row!);
}

export const invitationRoutes = new Elysia({ prefix: "/v1/invitations" })
  .use(authPlugin)
  .get("/", async ({ auth }) => {
    const claims = requireAuth(auth);
    requireSocietyStaff(claims);
    const rows = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, claims.tenantId),
          eq(invitations.isDeleted, false),
        ),
      )
      .orderBy(desc(invitations.createdAt));
    return rows.map(toDto);
  })
  .post("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireSocietyStaff(claims);
    const parsed = createInvitationSchema.parse(body);
    return createInvitationForTenant(claims.tenantId, claims.sub, parsed);
  })
  .post("/:id/revoke", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requireSocietyStaff(claims);
    const [row] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, params.id),
          eq(invitations.tenantId, claims.tenantId),
          eq(invitations.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new AppError(404, "not_found", "Invitation not found");

    await db
      .update(invitations)
      .set({ status: "revoked", updatedBy: claims.sub })
      .where(eq(invitations.id, params.id));

    const [updated] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, params.id))
      .limit(1);
    return toDto(updated!);
  });

// Not exported via SDK yet, but useful for accepting invites once
// email/SMS delivery is wired: looks up a pending invite by its token.
export async function findPendingInvitationByToken(token: string) {
  const [row] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.token, token),
        eq(invitations.status, "pending"),
        eq(invitations.isDeleted, false),
      ),
    )
    .limit(1);
  if (!row) {
    throw new AppError(404, "invite_not_found", "Invitation not found or already used");
  }
  return row;
}
