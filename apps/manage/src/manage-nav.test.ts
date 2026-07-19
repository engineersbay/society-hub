import { describe, expect, it } from "vitest";
import { MANAGE_NAV, manageNavByPath, SOCIETY_COMING_SOON } from "./manage-nav";

describe("manage-nav", () => {
  it("includes live Dashboard, Societies, Users, and Audit", () => {
    const live = MANAGE_NAV.filter((n) => n.status === "live").map((n) => n.to);
    expect(live).toContain("/dashboard");
    expect(live).toContain("/societies");
    expect(live).toContain("/users");
    expect(live).toContain("/audit");
  });

  it("roadmaps remaining platform ops as coming soon", () => {
    const soon = MANAGE_NAV.filter((n) => n.status === "soon").map((n) => n.to);
    expect(soon).not.toContain("/users");
    expect(soon).not.toContain("/audit");
    expect(soon).toContain("/feature-flags");
    expect(soon).toContain("/society-settings");
    expect(soon).toContain("/subscriptions");
    expect(soon).toContain("/discounts");
    expect(soon).toContain("/bills");
    expect(soon).toContain("/payments");
    expect(soon).toContain("/integrations");
  });

  it("manageNavByPath resolves feature-flag blurbs", () => {
    const flags = manageNavByPath("/feature-flags");
    expect(flags?.status).toBe("soon");
    expect(flags?.blurb.length).toBeGreaterThan(20);
  });

  it("society detail exposes planned control ideas", () => {
    expect(SOCIETY_COMING_SOON.length).toBeGreaterThanOrEqual(5);
    expect(SOCIETY_COMING_SOON.some((r) => /feature/i.test(r.title))).toBe(true);
    expect(SOCIETY_COMING_SOON.some((r) => /subscription/i.test(r.title))).toBe(true);
  });
});
