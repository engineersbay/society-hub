import type { ManageViewAs } from "./view-as";

/** Tenant mode on an admin URL → bounce to society dashboard. */
export function shouldRedirectAdminToTenantMode(
  viewAs: ManageViewAs,
  pathname: string,
): boolean {
  if (viewAs !== "tenant") return false;
  return isAdminPath(pathname);
}

/** Admin mode on a society/tenant URL → bounce to platform dashboard. */
export function shouldRedirectTenantToAdminMode(
  viewAs: ManageViewAs,
  pathname: string,
): boolean {
  if (viewAs !== "admin") return false;
  return isTenantPath(pathname);
}

/** Tenant mode with no society → Societies list. Admin does not require a society. */
export function shouldRedirectMissingSocietyToPicker(
  viewAs: ManageViewAs,
  selectedSocietyId: string | null | undefined,
): boolean {
  if (viewAs !== "tenant") return false;
  return !selectedSocietyId;
}

/** Admin is platform-wide — no society picker or Client App jump. */
export function shouldShowSocietySwitcher(viewAs: ManageViewAs): boolean {
  return viewAs === "tenant";
}

export function isAdminPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  const adminOnly = [
    "/societies",
    "/users",
    "/subscriptions",
    "/discounts",
    "/bills",
    "/payments",
    "/announcements",
    "/audit",
    "/integrations",
    "/support",
  ];
  // /societies/:id is tenant structure when in tenant mode — handled separately
  if (pathname === "/societies") return true;
  if (pathname.startsWith("/users")) return true;
  return adminOnly.some(
    (p) => p !== "/societies" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

export function isTenantPath(pathname: string): boolean {
  const tenant = [
    "/society",
    "/structure",
    "/feature-flags",
    "/branding",
    "/society-settings",
    "/society-billing",
  ];
  if (pathname.startsWith("/societies/") && pathname !== "/societies") return true;
  return tenant.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
