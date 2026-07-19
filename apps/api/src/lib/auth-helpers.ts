import { createHash } from "node:crypto";
import type { AccessClaims } from "@society-hub/auth";
import type { Role } from "@society-hub/types";
import { AppError } from "./errors";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Society Client App Admin-mode roles (Fassport "Raise"). */
export const SOCIETY_STAFF_ROLES: Role[] = [
  "chairperson",
  "admin", // legacy alias of chairperson
  "secretary",
  "treasurer",
  "cashier",
  "committee",
];

export const RESIDENT_ROLES: Role[] = ["resident", "tenant"];

export const PLATFORM_ROLES: Role[] = ["superadmin"];

/** Normalize legacy `admin` → `chairperson` for display/JWT preference. */
export function normalizeRole(role: Role): Role {
  return role === "admin" ? "chairperson" : role;
}

export function isSocietyStaffRole(role: Role) {
  return (SOCIETY_STAFF_ROLES as string[]).includes(role);
}

export function isPlatformRole(role: Role) {
  return (PLATFORM_ROLES as string[]).includes(role);
}

export function isResidentLikeRole(role: Role) {
  return (RESIDENT_ROLES as string[]).includes(role);
}

/**
 * Client Admin capability: society staff OR Manage platform employees.
 * Platform admins may operate any society in Client Admin mode by default.
 */
export function isStaffRole(role: Role) {
  return isSocietyStaffRole(role) || isPlatformRole(role);
}

export function canUseAdminMode(role: Role) {
  return isSocietyStaffRole(role) || isPlatformRole(role);
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

export function requireSocietyStaff(auth: AccessClaims) {
  if (!isSocietyStaffRole(auth.role) && !isPlatformRole(auth.role)) {
    throw new AppError(403, "forbidden", "Society staff role required");
  }
}

export function requirePlatform(auth: AccessClaims) {
  if (!isPlatformRole(auth.role)) {
    throw new AppError(403, "forbidden", "Platform employee role required");
  }
}
