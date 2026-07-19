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

const { notifyUser } = await import("./notify");

describe("notifyUser", () => {
  test("defaults kind to general and linkPath to null", async () => {
    await notifyUser({
      tenantId: "t1",
      userId: "u1",
      title: "Bill issued",
      body: "Your March bill is ready",
    });
    const row = inserted.at(-1) as Record<string, unknown>;
    expect(row.kind).toBe("general");
    expect(row.linkPath).toBeNull();
  });

  test("passes through kind and linkPath", async () => {
    await notifyUser({
      tenantId: "t1",
      userId: "u1",
      title: "Complaint assigned",
      body: "Ticket C-1 assigned",
      kind: "complaint",
      linkPath: "/complaints/c1",
    });
    const row = inserted.at(-1) as Record<string, unknown>;
    expect(row.kind).toBe("complaint");
    expect(row.linkPath).toBe("/complaints/c1");
  });
});
