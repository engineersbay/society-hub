import { describe, expect, test } from "bun:test";
import type { AccessClaims } from "@society-hub/auth";
import { AppError } from "./errors";
import { assertTenantAccess } from "./tenant-scope";

function claims(overrides: Partial<AccessClaims>): AccessClaims {
  return { sub: "u1", role: "admin", tenantId: "t1", typ: "access", ...overrides };
}

describe("assertTenantAccess", () => {
  test("allows superadmin for any tenant", () => {
    expect(() =>
      assertTenantAccess(claims({ role: "superadmin", tenantId: "t1" }), "t2"),
    ).not.toThrow();
  });

  test("allows admin matching own tenant", () => {
    expect(() =>
      assertTenantAccess(claims({ role: "admin", tenantId: "t1" }), "t1"),
    ).not.toThrow();
  });

  test("blocks admin for a different tenant", () => {
    expect(() =>
      assertTenantAccess(claims({ role: "admin", tenantId: "t1" }), "t2"),
    ).toThrow(AppError);
  });
});
