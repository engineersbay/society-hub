import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { userRoles, users } from "../../db/schema";
import { createEmailAdapter } from "./email";
import { createWhatsAppAdapter } from "./whatsapp";

const STAFF_NOTIFY_ROLES = [
  "chairperson",
  "admin",
  "secretary",
] as const;

export type ComplaintStaffNotifyInput = {
  tenantId: string;
  societyName: string;
  ticketNumber: string;
  title: string;
  type: string;
  flatNumber: string;
  raisedByName: string | null;
  complaintId: string;
};

/**
 * Notify society staff that a new complaint is waiting in the queue.
 * Uses Resend/Gupshup when configured; otherwise stubs (logged).
 * Failures are swallowed so complaint create never fails on notify.
 */
export async function notifyStaffNewComplaint(
  input: ComplaintStaffNotifyInput,
): Promise<void> {
  try {
    const staff = await db
      .select({
        email: users.email,
        phone: users.phone,
        name: users.name,
      })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(userRoles.tenantId, input.tenantId),
          inArray(userRoles.role, [...STAFF_NOTIFY_ROLES]),
          eq(userRoles.isDeleted, false),
          eq(users.isDeleted, false),
        ),
      );

    const appBase =
      process.env.PUBLIC_APP_URL ??
      process.env.VITE_APP_ORIGIN ??
      "http://app.localhost:5173";
    const link = `${appBase.replace(/\/$/, "")}/complaints/${input.complaintId}`;
    const who = input.raisedByName ?? "A resident";
    const text =
      `New complaint ${input.ticketNumber} at ${input.societyName}\n` +
      `${who} · Flat ${input.flatNumber} · ${input.type}\n` +
      `${input.title}\n` +
      `Open: ${link}`;

    const email = createEmailAdapter();
    const wa = createWhatsAppAdapter();
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();

    await Promise.all(
      staff.map(async (s) => {
        const tasks: Promise<unknown>[] = [];
        if (s.email && !seenEmail.has(s.email.toLowerCase())) {
          seenEmail.add(s.email.toLowerCase());
          tasks.push(
            email.send({
              to: s.email,
              subject: `[${input.societyName}] New complaint ${input.ticketNumber}`,
              text,
              html: `<p><strong>New complaint ${input.ticketNumber}</strong></p>
<p>${who} · Flat ${input.flatNumber} · ${input.type}</p>
<p>${input.title}</p>
<p><a href="${link}">Open in SocietyHub</a></p>
<p>You can acknowledge it when ready — leaving it open keeps it in the queue.</p>`,
            }),
          );
        }
        if (s.phone && !seenPhone.has(s.phone)) {
          seenPhone.add(s.phone);
          tasks.push(wa.send({ toPhone: s.phone, body: text }));
        }
        await Promise.all(tasks);
      }),
    );
  } catch (err) {
    console.warn("[complaint-notify] staff notify failed", err);
  }
}
