import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import type { AccessClaims } from "@society-hub/auth";
import { AppError } from "./errors";
import {
  hashToken,
  isStaffRole,
  requireAuth,
  requireRole,
} from "./auth-helpers";

describe("auth-helpers", () => {
  test("hashToken is sha256 hex", () => {
    const token = "abc";
    expect(hashToken(token)).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  test("isStaffRole", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("superadmin")).toBe(true);
    expect(isStaffRole("resident")).toBe(false);
  });

  test("requireAuth throws when missing", () => {
    expect(() => requireAuth(null)).toThrow(AppError);
  });

  test("requireAuth returns claims", () => {
    const claims: AccessClaims = {
      sub: "u1",
      role: "admin",
      tenantId: "t1",
      typ: "access",
    };
    expect(requireAuth(claims).sub).toBe("u1");
  });

  test("requireRole forbids wrong role", () => {
    const claims: AccessClaims = {
      sub: "u1",
      role: "resident",
      tenantId: "t1",
      typ: "access",
    };
    expect(() => requireRole(claims, ["admin"])).toThrow(AppError);
  });

  test("requireRole allows matching role", () => {
    const claims: AccessClaims = {
      sub: "u1",
      role: "superadmin",
      tenantId: "t1",
      typ: "access",
    };
    expect(() => requireRole(claims, ["admin", "superadmin"])).not.toThrow();
  });
});
