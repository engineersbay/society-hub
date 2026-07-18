import { describe, expect, test } from "bun:test";
import {
  hashPassword,
  hashPin,
  verifyPassword,
  verifyPin,
  signAccessToken,
  verifyAccessToken,
} from "./index";

describe("auth package", () => {
  test("hashes and verifies PIN", async () => {
    const hash = await hashPin("1234");
    expect(await verifyPin("1234", hash)).toBe(true);
    expect(await verifyPin("9999", hash)).toBe(false);
  });

  test("signs and verifies access JWT", async () => {
    const secret = "test-secret-at-least-32-characters!!";
    const token = await signAccessToken(
      {
        sub: "user-1",
        role: "resident",
        tenantId: "tenant-1",
        flatId: "flat-1",
      },
      secret,
    );
    const claims = await verifyAccessToken(token, secret);
    expect(claims.sub).toBe("user-1");
    expect(claims.role).toBe("resident");
    expect(claims.tenantId).toBe("tenant-1");
  });

  test("hashes and verifies password", async () => {
    const hash = await hashPassword("1900Summer@");
    expect(await verifyPassword("1900Summer@", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
