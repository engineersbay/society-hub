import type { IconName } from "./components/icons";

export type ManageNavItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Live routes hit real APIs; soon routes render ComingSoonPage. */
  status: "live" | "soon";
  /** One-line blurb shown on Coming soon pages and Dashboard roadmap. */
  blurb: string;
};

/**
 * SocietyHub Manage = platform operations for SocietyHub employees.
 * Admin view = cross-society console. Tenant view = one society workspace.
 * Day-to-day society admin (residents, complaints) lives in the Client App.
 */
export const ADMIN_NAV: ManageNavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    status: "live",
    blurb: "Platform overview and quick actions.",
  },
  {
    to: "/societies",
    label: "Societies",
    icon: "societies",
    status: "live",
    blurb: "Create societies and add people to society teams.",
  },
  {
    to: "/users",
    label: "Users",
    icon: "users",
    status: "live",
    blurb:
      "Platform employees who can sign in to Manage — invite, suspend, reset access.",
  },
  {
    to: "/subscriptions",
    label: "Subscriptions",
    icon: "subscription",
    status: "live",
    blurb:
      "Assign plans (Starter / Growth / Enterprise), seats, module packs, and billing cycles per society.",
  },
  {
    to: "/discounts",
    label: "Discounts",
    icon: "discount",
    status: "live",
    blurb: "Pilot discounts, coupon codes, and time-bound promotional pricing for societies.",
  },
  {
    to: "/bills",
    label: "Generate bills",
    icon: "bills",
    status: "live",
    blurb:
      "Generate platform subscription invoices for societies and mark platform fees as paid.",
  },
  {
    to: "/payments",
    label: "Payments",
    icon: "payments",
    status: "live",
    blurb:
      "View and reconcile Razorpay / manual platform payments by society; refunds and receipts.",
  },
  {
    to: "/announcements",
    label: "Announcements",
    icon: "notices",
    status: "live",
    blurb: "Broadcast platform-wide or segmented notices to society admins and residents.",
  },
  {
    to: "/audit",
    label: "Audit log",
    icon: "audit",
    status: "live",
    blurb: "Immutable trail of platform actions — who created societies, changed flags, billed whom.",
  },
  {
    to: "/integrations",
    label: "Integrations",
    icon: "integrations",
    status: "live",
    blurb: "MSG91 OTP, Resend email, Firebase push, Razorpay, and Azure Blob credentials per env.",
  },
  {
    to: "/support",
    label: "Support",
    icon: "support",
    status: "live",
    blurb: "Platform support inbox for society admins; escalate and track resolution.",
  },
];

/** Tenant view — tools for the society selected in the picker. */
export const TENANT_NAV: ManageNavItem[] = [
  {
    to: "/society",
    label: "Dashboard",
    icon: "dashboard",
    status: "live",
    blurb: "Overview for the selected society.",
  },
  {
    to: "/structure",
    label: "Structure",
    icon: "societies",
    status: "live",
    blurb: "Towers, flats, parking, and society team.",
  },
  {
    to: "/feature-flags",
    label: "Feature flags",
    icon: "toggle",
    status: "live",
    blurb:
      "Turn modules on or off for this society (complaints, bills, payments, visitors, bookings, and more).",
  },
  {
    to: "/branding",
    label: "Branding",
    icon: "settings",
    status: "live",
    blurb: "Society logo and brand color for the Client App.",
  },
  {
    to: "/society-settings",
    label: "Society details",
    icon: "settings",
    status: "live",
    blurb: "Name, slug, custom domain, SLA defaults, and suspend access.",
  },
  {
    to: "/society-billing",
    label: "Platform fee",
    icon: "payments",
    status: "live",
    blurb: "Pay or reconcile this society’s platform subscription invoice.",
  },
];

/** @deprecated Prefer ADMIN_NAV or TENANT_NAV by view mode. */
export const MANAGE_NAV = ADMIN_NAV;

export function manageNavByPath(path: string): ManageNavItem | undefined {
  return [...ADMIN_NAV, ...TENANT_NAV].find((item) => item.to === path);
}

/** Remaining future ideas shown on society Controls (not nav Coming soon). */
export const SOCIETY_COMING_SOON = [
  {
    title: "Usage & limits",
    detail: "Flats, storage, SMS, and push quota against the subscribed plan.",
  },
] as const;
