import { db } from "../db/client";
import { notifications } from "../db/schema";

export type NotifyUserInput = {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  kind?: string;
  linkPath?: string | null;
};

/**
 * Inserts an in-app notification row. A BullMQ worker (Phase 2) will pick
 * these up for push/email fan-out; handlers should not await external I/O.
 */
export async function notifyUser(input: NotifyUserInput) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    userId: input.userId,
    title: input.title,
    body: input.body,
    kind: input.kind ?? "general",
    linkPath: input.linkPath ?? null,
  });
}
