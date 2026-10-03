import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "@society-hub/auth";
import type { startSocietyOnboardingSchema } from "@society-hub/validation";
import type { z } from "zod";
import { db } from "../db/client";
import {
  platformBills,
  platformPayments,
  platformPaymentTransactions,
  platformPlans,
  platformSubscriptions,
  societies,
  societyOnboardings,
  userRoles,
  users,
} from "../db/schema";
import { ActivityType, recordActivity, recordAudit } from "./audit";
import { AppError } from "./errors";
import { getPaymentGateway } from "./payment-gateway";
import { resolvePlatformCoupon } from "./platform-coupon";
import {
  normalizeCustomDomain,
  slugifySocietyName,
} from "./society-hostname";
import { env } from "../config";

type StartBody = z.infer<typeof startSocietyOnboardingSchema>;

function nowMysql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function hashResume(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function paymentReference(): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `SH-PAY-${day}-${seq}`;
}

function correlationId(): string {
  return `SH-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
}

function periodYm() {
  return new Date().toISOString().slice(0, 7);
}

function clientAppUrl(slug: string, customDomain: string | null) {
  if (customDomain) {
    const host = customDomain.includes("://") ? customDomain : `https://${customDomain}`;
    return host.replace(/\/$/, "");
  }
  const root = env.societyHubRootDomain || "localhost";
  const protocol = root.includes("localhost") ? "http" : "https";
  const port = root.includes("localhost") && !root.includes(":") ? ":5173" : "";
  return `${protocol}://${slug}.${root}${port}`;
}

export function toOnboardingDto(
  row: typeof societyOnboardings.$inferSelect,
  extras?: {
    resumeToken?: string;
    razorpayConfigured?: boolean;
    keyId?: string | null;
  },
) {
  const gw = getPaymentGateway();
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain,
    planId: row.planId,
    originalAmountPaise: row.originalAmountPaise,
    dueAmountPaise: row.dueAmountPaise,
    discountCode: row.discountCode,
    currency: "INR" as const,
    societyId: row.status === "provisioned" ? row.tenantId : null,
    clientAppUrl:
      row.status === "provisioned"
        ? clientAppUrl(row.slug, row.customDomain)
        : null,
    resumeToken: extras?.resumeToken,
    razorpayConfigured: extras?.razorpayConfigured ?? gw.configured,
    keyId: extras?.keyId ?? (gw.configured ? gw.keyId : null),
    offlineOnly: !(extras?.razorpayConfigured ?? gw.configured),
  };
}

async function assertSlugFree(slug: string, excludeOnboardingId?: string) {
  const [live] = await db
    .select({ id: societies.id })
    .from(societies)
    .where(and(eq(societies.slug, slug), eq(societies.isDeleted, false)))
    .limit(1);
  if (live) throw new AppError(409, "slug_in_use", "That slug is already in use");
  const [pending] = await db
    .select({ id: societyOnboardings.id, status: societyOnboardings.status })
    .from(societyOnboardings)
    .where(
      and(eq(societyOnboardings.slug, slug), eq(societyOnboardings.isDeleted, false)),
    )
    .limit(1);
  if (
    pending &&
    pending.id !== excludeOnboardingId &&
    pending.status !== "failed"
  ) {
    throw new AppError(409, "slug_in_use", "That slug is already in use");
  }
}

async function assertDomainFree(domain: string, excludeOnboardingId?: string) {
  const [live] = await db
    .select({ id: societies.id })
    .from(societies)
    .where(and(eq(societies.customDomain, domain), eq(societies.isDeleted, false)))
    .limit(1);
  if (live) {
    throw new AppError(409, "custom_domain_in_use", "That custom domain is already in use");
  }
  const [pending] = await db
    .select({ id: societyOnboardings.id })
    .from(societyOnboardings)
    .where(
      and(
        eq(societyOnboardings.customDomain, domain),
        eq(societyOnboardings.isDeleted, false),
      ),
    )
    .limit(1);
  if (pending && pending.id !== excludeOnboardingId) {
    throw new AppError(
      409,
      "custom_domain_in_use",
      "That custom domain is already in use",
    );
  }
}

export async function loadOnboardingByResume(id: string, resumeToken: string) {
  const [row] = await db
    .select()
    .from(societyOnboardings)
    .where(
      and(eq(societyOnboardings.id, id), eq(societyOnboardings.isDeleted, false)),
    )
    .limit(1);
  if (!row || row.resumeTokenHash !== hashResume(resumeToken)) {
    throw new AppError(404, "not_found", "Onboarding not found");
  }
  return row;
}

export async function startSocietyOnboarding(body: StartBody) {
  const [plan] = await db
    .select()
    .from(platformPlans)
    .where(and(eq(platformPlans.id, body.planId), eq(platformPlans.isDeleted, false)))
    .limit(1);
  if (!plan) throw new AppError(404, "not_found", "Plan not found");
  if (!plan.monthlyFeePaise) {
    throw new AppError(400, "amount_required", "Plan has no monthly fee");
  }

  const slug = body.slug?.trim() || slugifySocietyName(body.name);
  await assertSlugFree(slug);
  const customDomain = body.customDomain
    ? normalizeCustomDomain(body.customDomain)
    : null;
  if (customDomain) await assertDomainFree(customDomain);

  const resumeToken = randomBytes(24).toString("hex");
  const id = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const billId = crypto.randomUUID();
  const passwordHash = await hashPassword(body.chairpersonPassword);

  await db.insert(societyOnboardings).values({
    id,
    tenantId,
    planId: plan.id,
    billId,
    resumeTokenHash: hashResume(resumeToken),
    status: "started",
    name: body.name,
    slug,
    customDomain: customDomain || null,
    address: body.address ?? null,
    city: body.city ?? null,
    pincode: body.pincode ?? null,
    chairpersonName: body.chairpersonName ?? null,
    chairpersonEmail: body.chairpersonEmail,
    chairpersonPhone: body.chairpersonPhone,
    chairpersonPasswordHash: passwordHash,
    originalAmountPaise: plan.monthlyFeePaise,
    dueAmountPaise: plan.monthlyFeePaise,
  });

  const [row] = await db
    .select()
    .from(societyOnboardings)
    .where(eq(societyOnboardings.id, id))
    .limit(1);
  return toOnboardingDto(row!, {
    resumeToken,
    razorpayConfigured: getPaymentGateway().configured,
  });
}

export async function previewOnboardingCoupon(
  id: string,
  resumeToken: string,
  code: string,
) {
  const row = await loadOnboardingByResume(id, resumeToken);
  if (row.status === "provisioned" || row.status === "paid") {
    throw new AppError(400, "already_paid", "This signup is already paid");
  }
  const priced = await resolvePlatformCoupon(
    row.tenantId,
    code,
    row.originalAmountPaise,
  );
  await db
    .update(societyOnboardings)
    .set({
      dueAmountPaise: priced.amountPaise,
      discountCode: priced.code,
      status: "payment_pending",
    })
    .where(eq(societyOnboardings.id, row.id));
  return {
    originalAmountPaise: row.originalAmountPaise,
    amountPaise: priced.amountPaise,
    discountCode: priced.code,
    currency: "INR" as const,
  };
}

export async function provisionSocietyOnboarding(onboardingId: string) {
  const [row] = await db
    .select()
    .from(societyOnboardings)
    .where(
      and(
        eq(societyOnboardings.id, onboardingId),
        eq(societyOnboardings.isDeleted, false),
      ),
    )
    .limit(1);
  if (!row) throw new AppError(404, "not_found", "Onboarding not found");
  if (row.status === "provisioned") {
    return toOnboardingDto(row);
  }

  const [existingSociety] = await db
    .select({ id: societies.id })
    .from(societies)
    .where(eq(societies.id, row.tenantId))
    .limit(1);

  if (!existingSociety) {
    await db.insert(societies).values({
      id: row.tenantId,
      name: row.name,
      slug: row.slug,
      customDomain: row.customDomain,
      address: row.address,
      city: row.city,
      pincode: row.pincode,
      planId: row.planId,
      status: "active",
    });
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, row.chairpersonEmail))
    .limit(1);
  let userId = existingUser?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      name: row.chairpersonName,
      email: row.chairpersonEmail,
      phone: row.chairpersonPhone,
      passwordHash: row.chairpersonPasswordHash,
    });
  } else if (!existingUser?.passwordHash) {
    await db
      .update(users)
      .set({ passwordHash: row.chairpersonPasswordHash })
      .where(eq(users.id, userId));
  }

  const [role] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.tenantId, row.tenantId),
        eq(userRoles.userId, userId),
        eq(userRoles.isDeleted, false),
      ),
    )
    .limit(1);
  if (!role) {
    await db.insert(userRoles).values({
      id: crypto.randomUUID(),
      tenantId: row.tenantId,
      userId,
      role: "chairperson",
    });
  }

  const [sub] = await db
    .select({ id: platformSubscriptions.id })
    .from(platformSubscriptions)
    .where(
      and(
        eq(platformSubscriptions.tenantId, row.tenantId),
        eq(platformSubscriptions.isDeleted, false),
      ),
    )
    .limit(1);
  let subscriptionId = sub?.id;
  if (!subscriptionId) {
    subscriptionId = crypto.randomUUID();
    await db.insert(platformSubscriptions).values({
      id: subscriptionId,
      tenantId: row.tenantId,
      planId: row.planId,
      cycle: "monthly",
      status: "active",
      startsAt: nowMysql(),
    });
  }

  const [bill] = await db
    .select({ id: platformBills.id })
    .from(platformBills)
    .where(eq(platformBills.id, row.billId))
    .limit(1);
  if (!bill) {
    await db.insert(platformBills).values({
      id: row.billId,
      tenantId: row.tenantId,
      subscriptionId,
      periodYm: periodYm(),
      amountPaise: row.dueAmountPaise,
      status: "paid",
      notes: row.discountCode ? `coupon:${row.discountCode}` : "self_onboarding",
    });
  } else {
    await db
      .update(platformBills)
      .set({ status: "paid" })
      .where(eq(platformBills.id, row.billId));
  }

  await db
    .update(societyOnboardings)
    .set({
      status: "provisioned",
      provisionedAt: nowMysql(),
      lastError: null,
    })
    .where(eq(societyOnboardings.id, row.id));

  recordActivity({
    tenantId: row.tenantId,
    actorUserId: userId,
    action: ActivityType.SOCIETY_CREATED,
    entityType: "society",
    entityId: row.tenantId,
    message: `Self-onboarded society "${row.name}"`,
    meta: { source: "self_onboarding" },
  });

  const [fresh] = await db
    .select()
    .from(societyOnboardings)
    .where(eq(societyOnboardings.id, row.id))
    .limit(1);
  return toOnboardingDto(fresh!);
}

export async function provisionOnboardingForTenant(tenantId: string) {
  const [row] = await db
    .select()
    .from(societyOnboardings)
    .where(
      and(
        eq(societyOnboardings.tenantId, tenantId),
        eq(societyOnboardings.isDeleted, false),
      ),
    )
    .limit(1);
  if (!row || row.status === "provisioned") return;
  await provisionSocietyOnboarding(row.id);
}

export async function payOnboardingOffline(id: string, resumeToken: string) {
  const row = await loadOnboardingByResume(id, resumeToken);
  if (row.status === "provisioned") return toOnboardingDto(row);

  const ref = paymentReference();
  const txnId = crypto.randomUUID();
  await db.insert(platformPaymentTransactions).values({
    id: txnId,
    tenantId: row.tenantId,
    billId: row.billId,
    onboardingId: row.id,
    paymentReference: ref,
    correlationId: correlationId(),
    idempotencyKey: `${row.id}:platform_subscription:offline`,
    purpose: "platform_subscription",
    amountPaise: row.dueAmountPaise,
    discountCode: row.discountCode,
    status: "captured",
    method: "offline",
    completedAt: nowMysql(),
  });
  await db.insert(platformPayments).values({
    id: crypto.randomUUID(),
    tenantId: row.tenantId,
    billId: row.billId,
    amountPaise: row.dueAmountPaise,
    method: "offline",
    status: "success",
    receiptNumber: ref,
  });
  await db
    .update(societyOnboardings)
    .set({
      status: "paid",
      paymentTransactionId: txnId,
    })
    .where(eq(societyOnboardings.id, row.id));
  await recordAudit({
    tenantId: row.tenantId,
    actorUserId: row.tenantId,
    action: "platform_payment.offline",
    entityType: "society_onboarding",
    entityId: row.id,
    meta: { paymentReference: ref },
  });
  return provisionSocietyOnboarding(row.id);
}

export async function createOnboardingOrder(id: string, resumeToken: string) {
  const row = await loadOnboardingByResume(id, resumeToken);
  if (row.status === "provisioned") {
    throw new AppError(400, "already_paid", "This signup is already paid");
  }
  const gw = getPaymentGateway();
  const idempotencyKey = `${row.id}:platform_subscription`;
  const [existing] = await db
    .select()
    .from(platformPaymentTransactions)
    .where(
      and(
        eq(platformPaymentTransactions.idempotencyKey, idempotencyKey),
        eq(platformPaymentTransactions.isDeleted, false),
      ),
    )
    .limit(1);
  if (existing?.providerOrderId && gw.configured) {
    return {
      paymentReference: existing.paymentReference,
      status: existing.status,
      amountPaise: existing.amountPaise,
      currency: "INR" as const,
      checkout: {
        provider: "RAZORPAY" as const,
        orderId: existing.providerOrderId,
        keyId: gw.keyId,
      },
      offlineOnly: false,
    };
  }
  if (!gw.configured) {
    return {
      paymentReference: existing?.paymentReference ?? null,
      status: "initiated" as const,
      amountPaise: row.dueAmountPaise,
      currency: "INR" as const,
      checkout: null,
      offlineOnly: true,
    };
  }

  const ref = existing?.paymentReference ?? paymentReference();
  const txnId = existing?.id ?? crypto.randomUUID();
  const corr = existing?.correlationId ?? correlationId();
  if (!existing) {
    await db.insert(platformPaymentTransactions).values({
      id: txnId,
      tenantId: row.tenantId,
      billId: row.billId,
      onboardingId: row.id,
      paymentReference: ref,
      correlationId: corr,
      idempotencyKey,
      purpose: "platform_subscription",
      amountPaise: row.dueAmountPaise,
      discountCode: row.discountCode,
      status: "order_pending",
    });
  }
  const order = await gw.createOrder({
    amountPaise: row.dueAmountPaise,
    currency: "INR",
    receipt: ref,
    notes: { onboardingId: row.id, societyId: row.tenantId },
  });
  await db
    .update(platformPaymentTransactions)
    .set({
      status: "order_created",
      providerOrderId: order.id,
    })
    .where(eq(platformPaymentTransactions.id, txnId));
  await db
    .update(societyOnboardings)
    .set({ status: "payment_pending", paymentTransactionId: txnId })
    .where(eq(societyOnboardings.id, row.id));
  return {
    paymentReference: ref,
    status: "order_created" as const,
    amountPaise: row.dueAmountPaise,
    currency: "INR" as const,
    checkout: {
      provider: "RAZORPAY" as const,
      orderId: order.id,
      keyId: gw.keyId,
    },
    offlineOnly: false,
  };
}

export async function verifyOnboardingCheckout(input: {
  id: string;
  resumeToken: string;
  paymentReference: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const row = await loadOnboardingByResume(input.id, input.resumeToken);
  const gw = getPaymentGateway();
  if (
    !gw.verifyCheckoutSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })
  ) {
    throw new AppError(400, "invalid_signature", "Payment signature is invalid");
  }
  const [txn] = await db
    .select()
    .from(platformPaymentTransactions)
    .where(
      and(
        eq(platformPaymentTransactions.paymentReference, input.paymentReference),
        eq(platformPaymentTransactions.onboardingId, row.id),
      ),
    )
    .limit(1);
  if (!txn) throw new AppError(404, "not_found", "Payment not found");
  if (txn.amountPaise !== row.dueAmountPaise) {
    throw new AppError(400, "amount_mismatch", "Paid amount does not match");
  }
  await db
    .update(platformPaymentTransactions)
    .set({
      status: "captured",
      providerPaymentId: input.razorpayPaymentId,
      providerOrderId: input.razorpayOrderId,
      method: "razorpay",
      completedAt: nowMysql(),
    })
    .where(eq(platformPaymentTransactions.id, txn.id));
  await db
    .update(societyOnboardings)
    .set({ status: "paid", paymentTransactionId: txn.id })
    .where(eq(societyOnboardings.id, row.id));
  return provisionSocietyOnboarding(row.id);
}
