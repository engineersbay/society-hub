import { describe, expect, mock, test } from "bun:test";

const inserted: unknown[] = [];

mock.module("../db/client", () => ({
  db: {
    insert: (_table: unknown) => ({
      values: async (values: unknown) => {
        inserted.push(values);
      },
    }),
  },
}));

const { recordAudit } = await import("./audit");

describe("recordAudit", () => {
  test("stringifies meta and stamps actor as created/updated by", async () => {
    await recordAudit({
      tenantId: "t1",
      actorUserId: "u1",
      action: "complaint.status_changed",
      entityType: "complaint",
      entityId: "c1",
      meta: { from: "open", to: "assigned" },
    });
    const row = inserted.at(-1) as Record<string, unknown>;
    expect(row.tenantId).toBe("t1");
    expect(row.createdBy).toBe("u1");
    expect(row.updatedBy).toBe("u1");
    expect(row.meta).toBe(JSON.stringify({ from: "open", to: "assigned" }));
  });

  test("stores null meta when omitted", async () => {
    await recordAudit({
      tenantId: "t1",
      actorUserId: "u1",
      action: "bill.void",
      entityType: "bill",
      entityId: "b1",
    });
    const row = inserted.at(-1) as Record<string, unknown>;
    expect(row.meta).toBeNull();
  });
});
