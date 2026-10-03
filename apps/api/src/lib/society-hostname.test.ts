import { describe, expect, it } from "bun:test";
import {
  isPlatformHostname,
  normalizeCustomDomain,
  normalizeHostname,
  slugifySocietyName,
} from "./society-hostname";

describe("society-hostname", () => {
  it("normalizes hostnames", () => {
    expect(normalizeHostname("HTTPS://Example.COM:443/")).toBe("example.com");
    expect(normalizeHostname("  invest.acme.com  ")).toBe("invest.acme.com");
    expect(normalizeHostname("")).toBe("");
  });

  it("normalizes custom domains including scheme and path", () => {
    expect(normalizeCustomDomain("https://Example.COM/path")).toBe("example.com");
  });

  it("treats manage/api/app/www as platform hosts", () => {
    expect(isPlatformHostname("manage.societyhub.app")).toBe(true);
    expect(isPlatformHostname("api.societyhub.app")).toBe(true);
    expect(isPlatformHostname("app.localhost")).toBe(true);
    expect(isPlatformHostname("www.societyhub.app")).toBe(true);
    expect(isPlatformHostname("keshav.societyhub.app")).toBe(false);
  });

  it("slugifies society names", () => {
    expect(slugifySocietyName("Keshav Heights")).toBe("keshav-heights");
    expect(slugifySocietyName("  A!!B  ")).toBe("a-b");
  });
});
