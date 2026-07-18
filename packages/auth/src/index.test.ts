import { describe, expect, test } from "bun:test";
import {
  accessExpiresInSeconds,
  hashPassword,
  hashPin,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyPin,
  verifyRefreshToken,
} from "./index";

const secret = "test-secret-at-least-32-characters!!";

describe("auth package", () => {
  test("hashes and verifies PIN", async () => {
    const hash = await hashPin("1234");
    expect(await verifyPin("1234", hash)).toBe(true);
    expect(await verifyPin("9999", hash)).toBe(false);
  });

  test("hashes and verifies password", async () => {
    const hash = await hashPassword("Test@1234");
    expect(await verifyPassword("Test@1234", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  test("signs and verifies access JWT", async () => {
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
    expect(claims.flatId).toBe("flat-1");
    expect(claims.typ).toBe("access");
  });

  test("signs and verifies refresh JWT", async () => {
    const jti = "jti-1";
    const token = await signRefreshToken("user-1", jti, secret);
    const claims = await verifyRefreshToken(token, secret);
    expect(claims.sub).toBe("user-1");
    expect(claims.jti).toBe(jti);
    expect(claims.typ).toBe("refresh");
  });

  test("rejects wrong token type", async () => {
    const refresh = await signRefreshToken("user-1", "jti", secret);
    await expect(verifyAccessToken(refresh, secret)).rejects.toThrow(
      "Invalid token type",
    );
    const access = await signAccessToken(
      { sub: "u", role: "admin", tenantId: "t" },
      secret,
    );
    await expect(verifyRefreshToken(access, secret)).rejects.toThrow(
      "Invalid token type",
    );
  });

  test("accessExpiresInSeconds is 15 minutes", () => {
    expect(accessExpiresInSeconds()).toBe(900);
  });
});
