import { describe, expect, it } from "vitest";
import {
  shouldRedirectAdminToTenantMode,
  shouldRedirectMissingSocietyToPicker,
  shouldRedirectTenantToAdminMode,
  shouldShowSocietySwitcher,
} from "./manage-app-mode-guards";

describe("manage-app-mode-guards", () => {
  it("redirects tenant mode away from admin paths", () => {
    expect(shouldRedirectAdminToTenantMode("tenant", "/users")).toBe(true);
    expect(shouldRedirectAdminToTenantMode("tenant", "/societies")).toBe(true);
    expect(shouldRedirectAdminToTenantMode("tenant", "/dashboard")).toBe(true);
    expect(shouldRedirectAdminToTenantMode("admin", "/users")).toBe(false);
    expect(shouldRedirectAdminToTenantMode("tenant", "/society")).toBe(false);
  });

  it("redirects admin mode away from tenant paths", () => {
    expect(shouldRedirectTenantToAdminMode("admin", "/branding")).toBe(true);
    expect(shouldRedirectTenantToAdminMode("admin", "/structure")).toBe(true);
    expect(shouldRedirectTenantToAdminMode("admin", "/societies/abc")).toBe(true);
    expect(shouldRedirectTenantToAdminMode("tenant", "/branding")).toBe(false);
    expect(shouldRedirectTenantToAdminMode("admin", "/dashboard")).toBe(false);
  });

  it("opens societies list only in tenant mode without a society", () => {
    expect(shouldRedirectMissingSocietyToPicker("tenant", null)).toBe(true);
    expect(shouldRedirectMissingSocietyToPicker("admin", null)).toBe(false);
    expect(shouldRedirectMissingSocietyToPicker("tenant", "s1")).toBe(false);
  });

  it("hides the society picker in Admin view", () => {
    expect(shouldShowSocietySwitcher("admin")).toBe(false);
    expect(shouldShowSocietySwitcher("tenant")).toBe(true);
  });
});
