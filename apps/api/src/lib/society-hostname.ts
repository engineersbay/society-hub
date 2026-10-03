import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { societies } from "../db/schema";

const PLATFORM_LABELS = new Set(["manage", "api", "app", "www", "localhost"]);

export function normalizeHostname(hostname?: string | null): string {
  if (!hostname) return "";
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** True when the first DNS label is a reserved platform host (never a society). */
export function isPlatformHostname(hostname?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  const firstLabel = normalized.split(".")[0] ?? "";
  return PLATFORM_LABELS.has(firstLabel);
}

export function normalizeCustomDomain(value?: string | null): string {
  return normalizeHostname(value);
}

export function slugifySocietyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `society-${Date.now().toString(36)}`;
}

export function hostnameFromRequest(request: Request): string {
  const rawHost = request.headers.get("host") ?? "";
  const fromHeader = rawHost.split(":")[0]?.trim() ?? "";
  if (
    fromHeader &&
    fromHeader !== "127.0.0.1" &&
    fromHeader !== "localhost" &&
    fromHeader.includes(".")
  ) {
    return normalizeHostname(fromHeader);
  }
  try {
    return normalizeHostname(new URL(request.url).hostname);
  } catch {
    return normalizeHostname(fromHeader);
  }
}

/**
 * Resolve society from Host: custom domain first, then {slug}.{root}.
 * Platform hosts (manage/api/app/www) never match.
 */
export async function resolveSocietyFromHostname(
  hostname?: string | null,
  rootDomain?: string | null,
): Promise<{ id: string; slug: string | null; name: string } | null> {
  const normalizedHostname = normalizeHostname(hostname);
  if (!normalizedHostname) return null;

  if (isPlatformHostname(normalizedHostname)) return null;

  const byDomain = await db
    .select({
      id: societies.id,
      slug: societies.slug,
      name: societies.name,
    })
    .from(societies)
    .where(
      and(
        eq(societies.customDomain, normalizedHostname),
        eq(societies.isDeleted, false),
      ),
    )
    .limit(1);
  if (byDomain[0]) return byDomain[0];

  const root = normalizeHostname(rootDomain);
  if (root && normalizedHostname.endsWith(`.${root}`) && normalizedHostname !== root) {
    const slug = normalizedHostname.slice(0, normalizedHostname.length - root.length - 1);
    if (slug && !slug.includes(".")) {
      const bySlug = await db
        .select({
          id: societies.id,
          slug: societies.slug,
          name: societies.name,
        })
        .from(societies)
        .where(and(eq(societies.slug, slug), eq(societies.isDeleted, false)))
        .limit(1);
      if (bySlug[0]) return bySlug[0];
    }
  }

  if (normalizedHostname.endsWith(".localhost")) {
    const slug = normalizedHostname.slice(0, -".localhost".length);
    if (slug && !slug.includes(".")) {
      const bySlug = await db
        .select({
          id: societies.id,
          slug: societies.slug,
          name: societies.name,
        })
        .from(societies)
        .where(and(eq(societies.slug, slug), eq(societies.isDeleted, false)))
        .limit(1);
      if (bySlug[0]) return bySlug[0];
    }
  }

  return null;
}
