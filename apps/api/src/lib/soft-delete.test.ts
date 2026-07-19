import { describe, expect, mock, test } from "bun:test";

const setCalls: unknown[] = [];
const whereCalls: unknown[] = [];

mock.module("../db/client", () => ({
  db: {
    update: (_table: unknown) => ({
      set: (values: unknown) => {
        setCalls.push(values);
        return {
          where: async (condition: unknown) => {
            whereCalls.push(condition);
          },
        };
      },
    }),
  },
}));

const { softDelete } = await import("./soft-delete");
const { users } = await import("../db/schema");

describe("softDelete", () => {
  test("marks row deleted and stamps updatedBy", async () => {
    await softDelete(users, "user-1", "actor-1");
    expect(setCalls.at(-1)).toEqual({ isDeleted: true, updatedBy: "actor-1" });
    expect(whereCalls.length).toBeGreaterThan(0);
  });

  test("allows a null actor", async () => {
    await softDelete(users, "user-2", null);
    expect(setCalls.at(-1)).toEqual({ isDeleted: true, updatedBy: null });
  });
});
