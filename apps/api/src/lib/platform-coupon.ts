import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { platformDiscounts } from "../db/schema";
import { AppError } from "./errors";

export function applyDiscountToPaise(opts: {
  amountPaise: number;
  percentOff: number | null;
  flatOffPaise: number | null;
}): number {
  let next = opts.amountPaise;
  if (opts.percentOff != null) {
    next = Math.round((opts.amountPaise * (100 - opts.percentOff)) / 100);
  } else if (opts.flatOffPaise != null) {
    next = Math.max(0, opts.amountPaise - opts.flatOffPaise);
  }
  return next;
}

/** Global coupons (no society) apply to self-onboarding; society-scoped codes apply only to that tenant. */
export async function resolvePlatformCoupon(
  tenantId: string | null,
  code: string | null | undefined,
  amountPaise: number,
): Promise<{ amountPaise: number; code: string | null }> {
  if (!code?.trim()) return { amountPaise, code: null };
  const normalized = code.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(platformDiscounts)
    .where(
      and(
        sql`UPPER(${platformDiscounts.code}) = ${normalized}`,
        eq(platformDiscounts.isDeleted, false),
      ),
    )
    .limit(1);
  if (!row) throw new AppError(400, "coupon_invalid", "Coupon code is not valid");
  if (row.tenantId && row.tenantId !== tenantId) {
    throw new AppError(
      400,
      "coupon_invalid",
      "Coupon code is not valid for this society",
    );
  }
  const now = new Date();
  if (row.startsAt && new Date(row.startsAt) > now) {
    throw new AppError(400, "coupon_invalid", "Coupon code is not active yet");
  }
  if (row.endsAt && new Date(row.endsAt) < now) {
    throw new AppError(400, "coupon_invalid", "Coupon code has expired");
  }
  return {
    amountPaise: applyDiscountToPaise({
      amountPaise,
      percentOff: row.percentOff,
      flatOffPaise: row.flatOffPaise,
    }),
    code: normalized,
  };
}
