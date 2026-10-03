import { createHash } from "node:crypto";
import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import {
  applyPlatformCouponSchema,
  createPlatformPaymentOrderSchema,
  markPlatformBillOfflineSchema,
  verifyPlatformPaymentSchema,
} from "@society-hub/validation";
import { db } from "../../db/client";
import {
  platformBills,
  platformPaymentApiLogs,
  platformPayments,
  platformPaymentTransactions,
  platformPaymentWebhookEvents,
  societies,
} from "../../db/schema";
import { env } from "../../config";
import { AppError } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";
import { getPaymentGateway } from "../../lib/payment-gateway";
import { resolvePlatformCoupon } from "../../lib/platform-coupon";
import {
  authPlugin,
  requireAuth,
  requirePlatform,
} from "../../lib/auth-context";
import {
  hostnameFromRequest,
  resolveSocietyFromHostname,
} from "../../lib/society-hostname";

function nowMysql() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
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

async function resolveCoupon(
  tenantId: string,
  code: string | null | undefined,
  amountPaise: number,
) {
  return resolvePlatformCoupon(tenantId, code, amountPaise);
}

async function logApi(opts: {
  paymentTransactionId?: string;
  correlationId?: string;
  operation: string;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
  httpStatus?: number;
}) {
  await db.insert(platformPaymentApiLogs).values({
    id: crypto.randomUUID(),
    paymentTransactionId: opts.paymentTransactionId ?? null,
    correlationId: opts.correlationId ?? null,
    operation: opts.operation,
    success: opts.success,
    errorMessage: opts.errorMessage ?? null,
    durationMs: opts.durationMs ?? null,
    httpStatus: opts.httpStatus ?? null,
  });
}

export const platformPaymentRoutes = new Elysia({ prefix: "/v1/manage/platform-payments" })
  .use(authPlugin)
  .get("/config", async ({ auth }) => {
    requirePlatform(requireAuth(auth));
    const gw = getPaymentGateway();
    return {
      provider: gw.provider,
      razorpayConfigured: gw.configured,
      keyId: gw.configured ? gw.keyId : null,
      offlineOnly: !gw.configured,
    };
  })
  .post("/coupons/preview", async ({ auth, body }) => {
    requirePlatform(requireAuth(auth));
    const parsed = applyPlatformCouponSchema.parse(body);
    const [bill] = await db
      .select()
      .from(platformBills)
      .where(
        and(eq(platformBills.id, parsed.billId), eq(platformBills.isDeleted, false)),
      )
      .limit(1);
    if (!bill) throw new AppError(404, "not_found", "Bill not found");
    if (bill.status !== "issued") {
      throw new AppError(400, "bill_not_payable", "Bill is not payable");
    }
    const priced = await resolveCoupon(bill.tenantId, parsed.code, bill.amountPaise);
    return {
      billId: bill.id,
      originalAmountPaise: bill.amountPaise,
      amountPaise: priced.amountPaise,
      discountCode: priced.code,
      currency: "INR",
    };
  })
  .post("/orders", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const parsed = createPlatformPaymentOrderSchema.parse(body);
    const [bill] = await db
      .select()
      .from(platformBills)
      .where(
        and(eq(platformBills.id, parsed.billId), eq(platformBills.isDeleted, false)),
      )
      .limit(1);
    if (!bill) throw new AppError(404, "not_found", "Bill not found");
    if (bill.status !== "issued") {
      throw new AppError(400, "bill_not_payable", "Bill is not payable");
    }

    const priced = await resolveCoupon(
      bill.tenantId,
      parsed.discountCode,
      bill.amountPaise,
    );
    const idempotencyKey = `${bill.tenantId}:${bill.id}:platform_subscription`;
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
    if (existing && ["captured", "payment_pending", "order_created", "checkout_started"].includes(existing.status)) {
      const gw = getPaymentGateway();
      return {
        paymentReference: existing.paymentReference,
        status: existing.status,
        amountPaise: existing.amountPaise,
        currency: existing.currency,
        discountCode: existing.discountCode,
        checkout: gw.configured && existing.providerOrderId
          ? {
              provider: "RAZORPAY",
              orderId: existing.providerOrderId,
              keyId: gw.keyId,
            }
          : null,
        offlineOnly: !gw.configured,
      };
    }

    const gw = getPaymentGateway();
    const corr = correlationId();
    const ref = paymentReference();
    const id = crypto.randomUUID();
    await db.insert(platformPaymentTransactions).values({
      id,
      tenantId: bill.tenantId,
      billId: bill.id,
      paymentReference: ref,
      correlationId: corr,
      idempotencyKey,
      amountPaise: priced.amountPaise,
      discountCode: priced.code,
      status: gw.configured ? "order_pending" : "initiated",
      method: gw.configured ? null : "offline",
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });

    if (!gw.configured) {
      await logApi({
        paymentTransactionId: id,
        correlationId: corr,
        operation: "CREATE_ORDER",
        success: true,
        errorMessage: "razorpay_not_configured_offline_available",
      });
      return {
        paymentReference: ref,
        status: "initiated",
        amountPaise: priced.amountPaise,
        currency: "INR",
        discountCode: priced.code,
        checkout: null,
        offlineOnly: true,
      };
    }

    const started = Date.now();
    try {
      const order = await gw.createOrder({
        amountPaise: priced.amountPaise,
        currency: "INR",
        receipt: ref,
        notes: { societyId: bill.tenantId, billId: bill.id },
      });
      await db
        .update(platformPaymentTransactions)
        .set({
          status: "order_created",
          providerOrderId: order.id,
          updatedBy: claims.sub,
        })
        .where(eq(platformPaymentTransactions.id, id));
      await logApi({
        paymentTransactionId: id,
        correlationId: corr,
        operation: "CREATE_ORDER",
        success: true,
        durationMs: Date.now() - started,
        httpStatus: 200,
      });
      return {
        paymentReference: ref,
        status: "order_created",
        amountPaise: priced.amountPaise,
        currency: "INR",
        discountCode: priced.code,
        checkout: {
          provider: "RAZORPAY",
          orderId: order.id,
          keyId: gw.keyId,
        },
        offlineOnly: false,
      };
    } catch (err) {
      await db
        .update(platformPaymentTransactions)
        .set({
          status: "failed",
          failureCode: "order_creation_failed",
          failureReason: err instanceof Error ? err.message.slice(0, 500) : "failed",
          failedAt: nowMysql(),
          updatedBy: claims.sub,
        })
        .where(eq(platformPaymentTransactions.id, id));
      await logApi({
        paymentTransactionId: id,
        correlationId: corr,
        operation: "CREATE_ORDER",
        success: false,
        durationMs: Date.now() - started,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "failed",
      });
      throw new AppError(502, "gateway_error", "Could not create payment order");
    }
  })
  .post("/offline", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const parsed = markPlatformBillOfflineSchema.parse(body);
    const [bill] = await db
      .select()
      .from(platformBills)
      .where(
        and(eq(platformBills.id, parsed.billId), eq(platformBills.isDeleted, false)),
      )
      .limit(1);
    if (!bill) throw new AppError(404, "not_found", "Bill not found");
    if (bill.status !== "issued") {
      throw new AppError(400, "bill_not_payable", "Bill is not payable");
    }
    const priced = await resolveCoupon(
      bill.tenantId,
      parsed.discountCode,
      bill.amountPaise,
    );
    const corr = correlationId();
    const ref = paymentReference();
    const txnId = crypto.randomUUID();
    await db.insert(platformPaymentTransactions).values({
      id: txnId,
      tenantId: bill.tenantId,
      billId: bill.id,
      paymentReference: ref,
      correlationId: corr,
      idempotencyKey: `${bill.tenantId}:${bill.id}:offline:${Date.now()}`,
      amountPaise: priced.amountPaise,
      discountCode: priced.code,
      status: "captured",
      method: "offline",
      completedAt: nowMysql(),
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });
    const payId = crypto.randomUUID();
    await db.insert(platformPayments).values({
      id: payId,
      tenantId: bill.tenantId,
      billId: bill.id,
      amountPaise: priced.amountPaise,
      method: "offline",
      status: "success",
      receiptNumber: ref,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });
    await db
      .update(platformBills)
      .set({
        status: "paid",
        notes: parsed.note ?? bill.notes,
        updatedBy: claims.sub,
      })
      .where(eq(platformBills.id, bill.id));
    await recordAudit({
      tenantId: bill.tenantId,
      actorUserId: claims.sub,
      action: "platform_payment.offline_captured",
      entityType: "platform_bill",
      entityId: bill.id,
      meta: { paymentReference: ref, amountPaise: priced.amountPaise },
    });
    return {
      paymentReference: ref,
      status: "captured",
      amountPaise: priced.amountPaise,
      currency: "INR",
    };
  })
  .post("/verify", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const parsed = verifyPlatformPaymentSchema.parse(body);
    const gw = getPaymentGateway();
    if (!gw.configured) {
      throw new AppError(503, "gateway_unconfigured", "Razorpay is not configured");
    }
    const [txn] = await db
      .select()
      .from(platformPaymentTransactions)
      .where(
        and(
          eq(platformPaymentTransactions.paymentReference, parsed.paymentReference),
          eq(platformPaymentTransactions.isDeleted, false),
        ),
      )
      .limit(1);
    if (!txn) throw new AppError(404, "not_found", "Payment not found");
    if (txn.status === "captured") {
      return { paymentReference: txn.paymentReference, status: "captured" };
    }
    if (
      !gw.verifyCheckoutSignature({
        orderId: parsed.razorpayOrderId,
        paymentId: parsed.razorpayPaymentId,
        signature: parsed.razorpaySignature,
      })
    ) {
      throw new AppError(401, "invalid_signature", "Payment signature is invalid");
    }
    if (txn.providerOrderId && txn.providerOrderId !== parsed.razorpayOrderId) {
      throw new AppError(400, "order_mismatch", "Order does not match this payment");
    }
    await db
      .update(platformPaymentTransactions)
      .set({
        status: "captured",
        providerPaymentId: parsed.razorpayPaymentId,
        providerOrderId: parsed.razorpayOrderId,
        method: "razorpay",
        completedAt: nowMysql(),
        updatedBy: claims.sub,
      })
      .where(eq(platformPaymentTransactions.id, txn.id));
    await db
      .update(platformBills)
      .set({ status: "paid", updatedBy: claims.sub })
      .where(eq(platformBills.id, txn.billId));
    await db.insert(platformPayments).values({
      id: crypto.randomUUID(),
      tenantId: txn.tenantId,
      billId: txn.billId,
      amountPaise: txn.amountPaise,
      method: "razorpay",
      status: "success",
      receiptNumber: txn.paymentReference,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });
    await recordAudit({
      tenantId: txn.tenantId,
      actorUserId: claims.sub,
      action: "platform_payment.captured",
      entityType: "platform_bill",
      entityId: txn.billId,
      meta: { paymentReference: txn.paymentReference },
    });
    return { paymentReference: txn.paymentReference, status: "captured" };
  })
  .get("/by-society/:tenantId", async ({ auth, params }) => {
    requirePlatform(requireAuth(auth));
    const rows = await db
      .select()
      .from(platformPaymentTransactions)
      .where(
        and(
          eq(platformPaymentTransactions.tenantId, params.tenantId),
          eq(platformPaymentTransactions.isDeleted, false),
        ),
      )
      .orderBy(desc(platformPaymentTransactions.createdAt))
      .limit(50);
    return rows.map((r) => ({
      paymentReference: r.paymentReference,
      billId: r.billId,
      amountPaise: r.amountPaise,
      status: r.status,
      method: r.method,
      discountCode: r.discountCode,
      providerOrderId: r.providerOrderId,
      providerPaymentId: r.providerPaymentId,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));
  })
  .get("/:paymentReference", async ({ auth, params }) => {
    requirePlatform(requireAuth(auth));
    const [txn] = await db
      .select()
      .from(platformPaymentTransactions)
      .where(
        and(
          eq(
            platformPaymentTransactions.paymentReference,
            params.paymentReference,
          ),
          eq(platformPaymentTransactions.isDeleted, false),
        ),
      )
      .limit(1);
    if (!txn) throw new AppError(404, "not_found", "Payment not found");
    const events = await db
      .select()
      .from(platformPaymentWebhookEvents)
      .where(eq(platformPaymentWebhookEvents.paymentTransactionId, txn.id))
      .orderBy(desc(platformPaymentWebhookEvents.createdAt))
      .limit(20);
    return {
      paymentReference: txn.paymentReference,
      correlationId: txn.correlationId,
      tenantId: txn.tenantId,
      billId: txn.billId,
      amountPaise: txn.amountPaise,
      currency: txn.currency,
      status: txn.status,
      method: txn.method,
      discountCode: txn.discountCode,
      providerOrderId: txn.providerOrderId,
      providerPaymentId: txn.providerPaymentId,
      createdAt: txn.createdAt,
      completedAt: txn.completedAt,
      failedAt: txn.failedAt,
      failureReason: txn.failureReason,
      webhooks: events.map((e) => ({
        eventType: e.eventType,
        processingStatus: e.processingStatus,
        receivedAt: e.receivedAt,
        signatureValid: e.signatureValid,
      })),
    };
  })
  .post("/:paymentReference/reconcile", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    requirePlatform(claims);
    const [txn] = await db
      .select()
      .from(platformPaymentTransactions)
      .where(
        and(
          eq(
            platformPaymentTransactions.paymentReference,
            params.paymentReference,
          ),
          eq(platformPaymentTransactions.isDeleted, false),
        ),
      )
      .limit(1);
    if (!txn) throw new AppError(404, "not_found", "Payment not found");

    const gw = getPaymentGateway();
    if (!txn.providerOrderId) {
      await recordAudit({
        tenantId: txn.tenantId,
        actorUserId: claims.sub,
        action: "platform_payment.reconciled",
        entityType: "platform_payment_transaction",
        entityId: txn.id,
        meta: { result: "not_found", paymentReference: txn.paymentReference },
      });
      return {
        paymentReference: txn.paymentReference,
        result: "not_found" as const,
        localStatus: txn.status,
        providerStatus: null,
      };
    }

    const order = await gw.getOrder(txn.providerOrderId);
    if (!order) {
      await recordAudit({
        tenantId: txn.tenantId,
        actorUserId: claims.sub,
        action: "platform_payment.reconciled",
        entityType: "platform_payment_transaction",
        entityId: txn.id,
        meta: { result: "not_found", paymentReference: txn.paymentReference },
      });
      return {
        paymentReference: txn.paymentReference,
        result: "not_found" as const,
        localStatus: txn.status,
        providerStatus: null,
      };
    }

    const providerPaid = order.status === "paid";
    const localCaptured = txn.status === "captured";
    const result =
      providerPaid === localCaptured
        ? ("matched" as const)
        : ("mismatch" as const);

    await recordAudit({
      tenantId: txn.tenantId,
      actorUserId: claims.sub,
      action: "platform_payment.reconciled",
      entityType: "platform_payment_transaction",
      entityId: txn.id,
      meta: {
        result,
        paymentReference: txn.paymentReference,
        localStatus: txn.status,
        providerStatus: order.status,
      },
    });

    return {
      paymentReference: txn.paymentReference,
      result,
      localStatus: txn.status,
      providerStatus: order.status,
    };
  });

export const platformRazorpayWebhookRoutes = new Elysia({
  prefix: "/v1/manage/platform-payments",
})
  .post("/razorpay/webhook", async ({ request }) => {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const gw = getPaymentGateway();

    if (!env.razorpayWebhookSecret) {
      if (env.isProduction || gw.configured) {
        throw new AppError(
          503,
          "webhook_unconfigured",
          "RAZORPAY_WEBHOOK_SECRET is required",
        );
      }
    } else if (!gw.verifyWebhookSignature(rawBody, signature)) {
      throw new AppError(401, "invalid_signature", "Invalid webhook signature");
    }

    let payload: {
      event?: string;
      id?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } };
        order?: { entity?: { id?: string } };
      };
    };
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      throw new AppError(400, "invalid_json", "Invalid webhook body");
    }

    const eventType = payload.event ?? "unknown";
    const providerEventId =
      payload.id ??
      `${eventType}:${payload.payload?.payment?.entity?.id ?? crypto.randomUUID()}`;
    const [dup] = await db
      .select({ id: platformPaymentWebhookEvents.id })
      .from(platformPaymentWebhookEvents)
      .where(eq(platformPaymentWebhookEvents.providerEventId, providerEventId))
      .limit(1);
    if (dup) {
      return { ok: true as const, status: "already_processed" as const };
    }

    const orderId =
      payload.payload?.payment?.entity?.order_id ??
      payload.payload?.order?.entity?.id ??
      null;
    const paymentId = payload.payload?.payment?.entity?.id ?? null;
    let txnId: string | null = null;
    if (orderId) {
      const [txn] = await db
        .select()
        .from(platformPaymentTransactions)
        .where(eq(platformPaymentTransactions.providerOrderId, orderId))
        .limit(1);
      txnId = txn?.id ?? null;
      if (
        txn &&
        (eventType === "payment.captured" || eventType === "order.paid") &&
        txn.status !== "captured"
      ) {
        await db
          .update(platformPaymentTransactions)
          .set({
            status: "captured",
            providerPaymentId: paymentId,
            method: "razorpay",
            completedAt: nowMysql(),
          })
          .where(eq(platformPaymentTransactions.id, txn.id));
        await db
          .update(platformBills)
          .set({ status: "paid" })
          .where(eq(platformBills.id, txn.billId));
        const { provisionOnboardingForTenant } = await import(
          "../../lib/society-onboarding"
        );
        await provisionOnboardingForTenant(txn.tenantId);
      }
      if (txn && eventType === "payment.failed" && txn.status !== "captured") {
        await db
          .update(platformPaymentTransactions)
          .set({
            status: "failed",
            providerPaymentId: paymentId,
            failedAt: nowMysql(),
            failureCode: "payment_failed",
          })
          .where(eq(platformPaymentTransactions.id, txn.id));
      }
    }

    await db.insert(platformPaymentWebhookEvents).values({
      id: crypto.randomUUID(),
      providerEventId,
      eventType,
      paymentTransactionId: txnId,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      signatureValid: Boolean(env.razorpayWebhookSecret),
      processingStatus: "processed",
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      receivedAt: nowMysql(),
      processedAt: nowMysql(),
    });

    return { ok: true as const, status: "processed" as const };
  });

/** Public branding lookup by Host for Client App login/shell. */
export const publicSocietyBrandingRoutes = new Elysia({ prefix: "/v1/public" })
  .get("/society-by-host", async ({ request }) => {
    const host =
      new URL(request.url).searchParams.get("host") ??
      hostnameFromRequest(request);
    const society = await resolveSocietyFromHostname(
      host,
      env.societyHubRootDomain,
    );
    if (!society) return { society: null };
    const [row] = await db
      .select()
      .from(societies)
      .where(and(eq(societies.id, society.id), eq(societies.isDeleted, false)))
      .limit(1);
    if (!row) return { society: null };
    return {
      society: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        brandingEnabled: row.brandingEnabled,
        brandColor: row.brandColor,
        brandLogoBlobPath: row.brandLogoBlobPath,
      },
    };
  });
