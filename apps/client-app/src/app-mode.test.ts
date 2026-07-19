import { describe, expect, it } from "vitest";
import { canUseAdminMode, isPlatformRole } from "./app-mode";

describe("client app-mode", () => {
  it("society staff can use Admin mode", () => {
    expect(canUseAdminMode("chairperson")).toBe(true);
    expect(canUseAdminMode("secretary")).toBe(true);
  });

  it("Manage platform employees can use Admin mode by default", () => {
    expect(isPlatformRole("superadmin")).toBe(true);
    expect(canUseAdminMode("superadmin")).toBe(true);
  });

  it("residents cannot use Admin mode", () => {
    expect(canUseAdminMode("resident")).toBe(false);
    expect(canUseAdminMode("tenant")).toBe(false);
    expect(canUseAdminMode(null)).toBe(false);
  });
});
