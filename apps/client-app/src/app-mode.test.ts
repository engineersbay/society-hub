import { describe, expect, test } from "bun:test";
import { canUseAdminMode, isPlatformRole } from "./app-mode";

describe("client app-mode", () => {
  test("society staff can use Admin mode", () => {
    expect(canUseAdminMode("chairperson")).toBe(true);
    expect(canUseAdminMode("secretary")).toBe(true);
  });

  test("Manage platform employees can use Admin mode by default", () => {
    expect(isPlatformRole("superadmin")).toBe(true);
    expect(canUseAdminMode("superadmin")).toBe(true);
  });

  test("residents cannot use Admin mode", () => {
    expect(canUseAdminMode("resident")).toBe(false);
    expect(canUseAdminMode("tenant")).toBe(false);
    expect(canUseAdminMode(null)).toBe(false);
  });
});
