import { createHash } from "node:crypto";
import type { AccessClaims } from "@society-hub/auth";
import type { Role } from "@society-hub/types";
import { AppError } from "./errors";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Society staff who can manage complaints/onboard (not residents). */
export function isStaffRole(role: Role) {
  return role === "admin" || role === "superadmin";
}

export function requireAuth(auth: AccessClaims | null): AccessClaims {
  if (!auth) throw new AppError(401, "unauthorized", "Authentication required");
  return auth;
}

export function requireRole(auth: AccessClaims, roles: Role[]) {
  if (!roles.includes(auth.role)) {
    throw new AppError(403, "forbidden", "Insufficient permissions");
  }
}
