import type { AccessClaims } from "@society-hub/auth";
import { AppError } from "./errors";

/**
 * Admins may only act within their own society; superadmins can cross
 * tenants (e.g. to provision a new society or inspect any structure).
 */
export function assertTenantAccess(claims: AccessClaims, tenantId: string) {
  if (claims.role === "superadmin") return;
  if (claims.tenantId !== tenantId) {
    throw new AppError(403, "forbidden", "Not authorized for this society");
  }
}
