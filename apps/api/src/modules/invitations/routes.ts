import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { createInvitationSchema } from "@society-hub/validation";
import type { InvitationDto } from "@society-hub/types";
import { env } from "../../config";
import { db } from "../../db/client";
import { invitations, societies } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { deliverResidentInvite } from "../../lib/messaging/invite-delivery";
import { authPlugin, requireAuth, requireSocietyStaff } from "../../lib/auth-context";

function toDto(
  row: typeof invitations.$inferSelect,
  delivery?: InvitationDto["delivery"],
): InvitationDto {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    ...(delivery ? { delivery } : {}),
    ...(env.devAuth ? { devToken: row.token } : {}),
  };
}

export async function createInvitationForTenant(
  tenantId: string,
  invitedBy: string,
  parsed: {
    email?: string | null;
    phone?: string | null;
    role: InvitationDto["role"];
    channels?: Array<"email" | "whatsapp">;
    societyName?: string;
  },
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

  let societyName = parsed.societyName;
  if (!societyName) {
    const [society] = await db
      .select({ name: societies.name })
      .from(societies)
      .where(eq(societies.id, tenantId))
      .limit(1);
    societyName = society?.name ?? "your society";
  }

  const channels = parsed.channels?.length
    ? parsed.channels
    : [
        ...(parsed.email ? (["email"] as const) : []),
        ...(parsed.phone ? (["whatsapp"] as const) : []),
      ];

  const delivery = await deliverResidentInvite({
    societyName,
    inviteToken: token,
    email: parsed.email,
    phone: parsed.phone,
    channels,
  });

  const [row] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return toDto(row!, delivery);
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
    return rows.map((r) => toDto(r));
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
