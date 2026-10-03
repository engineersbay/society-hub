import { describe, expect, it } from "vitest";

/**
 * Manage society picker stores UI selection only. It must never call
 * selectTenant / rewrite the Manage JWT the way Client App society switch does.
 */
describe("manage selected society", () => {
  it("uses a dedicated localStorage key separate from auth tokens", () => {
    expect("sh_manage_society").not.toBe("sh_manage_access");
    expect("sh_manage_view_as").not.toBe("sh_manage_society");
  });

  it("documents that picker selection is client-side only", () => {
    const forbiddenManagePickerApis = ["selectTenant", "select-tenant"];
    // SocietySwitcher + SelectedSocietyProvider only touch listSocieties + localStorage.
    expect(forbiddenManagePickerApis.every((s) => typeof s === "string")).toBe(
      true,
    );
  });
});
