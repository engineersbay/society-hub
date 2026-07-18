import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@society-hub/types";

export type AccessClaims = {
  sub: string;
  role: Role;
  tenantId: string;
  flatId?: string | null;
  typ: "access";
};

export type RefreshClaims = {
  sub: string;
  typ: "refresh";
  jti: string;
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  claims: Omit<AccessClaims, "typ">,
  secret: string,
  expiresIn = "15m",
) {
  return new SignJWT({ ...claims, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function signRefreshToken(
  userId: string,
  jti: string,
  secret: string,
  expiresIn = "30d",
) {
  return new SignJWT({ sub: userId, typ: "refresh", jti })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(token: string, secret: string) {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.typ !== "access") throw new Error("Invalid token type");
  return payload as unknown as AccessClaims & { sub: string };
}

export async function verifyRefreshToken(token: string, secret: string) {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.typ !== "refresh") throw new Error("Invalid token type");
  return payload as unknown as RefreshClaims & { sub: string };
}

export async function hashPin(pin: string) {
  return await Bun.password.hash(pin, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPin(pin: string, hash: string) {
  return await Bun.password.verify(pin, hash);
}

export async function hashPassword(password: string) {
  return await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPassword(password: string, hash: string) {
  return await Bun.password.verify(password, hash);
}

export function accessExpiresInSeconds() {
  return 15 * 60;
}
