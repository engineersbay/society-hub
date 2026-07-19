import { Elysia } from "elysia";
import { and, count, desc, eq } from "drizzle-orm";
import type { PaymentDto } from "@society-hub/types";
import { listQuerySchema, recordPaymentSchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { bills, flats, payments } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";
import {
  authPlugin,
  isStaffRole,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";

export function generateReceiptNumber() {
  return `RCPT-${Date.now().toString(36).toUpperCase()}`;
}

export function toPaymentDto(
  row: typeof payments.$inferSelect,
  flatNumber: string | null,
): PaymentDto {
  return {
    id: row.id,
    billId: row.billId,
    flatId: row.flatId,
    flatNumber,
    amountPaise: row.amountPaise,
    method: row.method,
    status: row.status,
    receiptNumber: row.receiptNumber,
    createdAt: row.createdAt,
  };
}

export const paymentRoutes = new Elysia({ prefix: "/v1/payments" })
  .use(authPlugin)
  .get("/", async ({ auth, query }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const q = listQuerySchema.parse(query);
    const offset = (q.page - 1) * q.limit;
    const where = and(eq(payments.tenantId, claims.tenantId), eq(payments.isDeleted, false));

    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(payments)
      .where(where);

    const rows = await db
      .select({ payment: payments, flatNumber: flats.number })
      .from(payments)
      .leftJoin(flats, eq(flats.id, payments.flatId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(q.limit)
      .offset(offset);

    return {
      items: rows.map((r) => toPaymentDto(r.payment, r.flatNumber)),
      page: q.page,
      limit: q.limit,
      total: Number(total),
    };
  })
  .get("/mine", async ({ auth }) => {
    const claims = requireAuth(auth);
    if (!claims.flatId) return [] as PaymentDto[];
    const rows = await db
      .select({ payment: payments, flatNumber: flats.number })
      .from(payments)
      .leftJoin(flats, eq(flats.id, payments.flatId))
      .where(
        and(
          eq(payments.tenantId, claims.tenantId),
          eq(payments.flatId, claims.flatId),
          eq(payments.isDeleted, false),
        ),
      )
      .orderBy(desc(payments.createdAt));
    return rows.map((r) => toPaymentDto(r.payment, r.flatNumber));
  })
  .post("/", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = recordPaymentSchema.parse(body);

    const [flat] = await db
      .select()
      .from(flats)
      .where(
        and(
          eq(flats.id, parsed.flatId),
          eq(flats.tenantId, claims.tenantId),
          eq(flats.isDeleted, false),
        ),
      )
      .limit(1);
    if (!flat) throw new AppError(404, "flat_not_found", "Flat not found");

    if (parsed.billId) {
      const [bill] = await db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.id, parsed.billId),
            eq(bills.tenantId, claims.tenantId),
            eq(bills.isDeleted, false),
          ),
        )
        .limit(1);
      if (!bill) throw new AppError(404, "bill_not_found", "Bill not found");
    }

    // Manual/offline settlement (cash, cheque, NEFT); Razorpay flows go
    // through /v1/bills/:id/pay or the webhook below.
    const id = crypto.randomUUID();
    const receiptNumber = parsed.receiptNumber ?? generateReceiptNumber();
    await db.insert(payments).values({
      id,
      tenantId: claims.tenantId,
      billId: parsed.billId ?? null,
      flatId: parsed.flatId,
      amountPaise: parsed.amountPaise,
      method: parsed.method,
      status: "success",
      receiptNumber,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });

    if (parsed.billId) {
      await db
        .update(bills)
        .set({ status: "paid", updatedBy: claims.sub })
        .where(eq(bills.id, parsed.billId));
    }

    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: "payment.recorded",
      entityType: "payment",
      entityId: id,
      meta: { method: parsed.method, amountPaise: parsed.amountPaise },
    });

    const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return toPaymentDto(row!, flat.number);
  })
  .post("/mock", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    const payload = body as { billId?: string };
    if (!payload?.billId) {
      throw new AppError(400, "bill_required", "billId is required");
    }
    const [bill] = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.id, payload.billId),
          eq(bills.tenantId, claims.tenantId),
          eq(bills.isDeleted, false),
        ),
      )
      .limit(1);
    if (!bill) throw new AppError(404, "not_found", "Bill not found");
    if (!isStaffRole(claims.role) && bill.flatId !== claims.flatId) {
      throw new AppError(404, "not_found", "Bill not found");
    }
    if (bill.status === "paid") {
      throw new AppError(400, "already_paid", "Bill is already paid");
    }

    const [flat] = await db.select().from(flats).where(eq(flats.id, bill.flatId)).limit(1);

    // Mock Razorpay order + instant settlement for local/dev testing; a real
    // integration creates an order here and confirms via the signed webhook.
    const id = crypto.randomUUID();
    const receiptNumber = generateReceiptNumber();
    await db.insert(payments).values({
      id,
      tenantId: claims.tenantId,
      billId: bill.id,
      flatId: bill.flatId,
      amountPaise: bill.amountPaise,
      method: "razorpay",
      status: "success",
      razorpayOrderId: `order_dev_${id.slice(0, 12)}`,
      razorpayPaymentId: `pay_dev_${id.slice(0, 12)}`,
      receiptNumber,
      createdBy: claims.sub,
      updatedBy: claims.sub,
    });
    await db
      .update(bills)
      .set({ status: "paid", updatedBy: claims.sub })
      .where(eq(bills.id, bill.id));

    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: "payment.recorded",
      entityType: "bill",
      entityId: bill.id,
      meta: { paymentId: id, amountPaise: bill.amountPaise, method: "razorpay" },
    });

    const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return toPaymentDto(row!, flat?.number ?? null);
  })
  .get("/:id/receipt", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const [row] = await db
      .select({ payment: payments, flatNumber: flats.number })
      .from(payments)
      .leftJoin(flats, eq(flats.id, payments.flatId))
      .where(
        and(
          eq(payments.id, params.id),
          eq(payments.tenantId, claims.tenantId),
          eq(payments.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new AppError(404, "not_found", "Payment not found");
    if (!isStaffRole(claims.role) && row.payment.flatId !== claims.flatId) {
      throw new AppError(404, "not_found", "Payment not found");
    }
    return {
      receiptNumber: row.payment.receiptNumber ?? row.payment.id,
      paymentId: row.payment.id,
      flatNumber: row.flatNumber ?? "",
      amountPaise: row.payment.amountPaise,
      method: row.payment.method,
      paidAt: row.payment.createdAt,
    };
  })
  .post("/razorpay/webhook", async ({ body }) => {
    // Dev/staging webhook: production must verify the Razorpay signature
    // header before trusting this payload (see societyhub-razorpay-payments
    // skill). This mock accepts { orderId, paymentId, status }.
    const payload = body as {
      orderId?: string;
      paymentId?: string;
      status?: "success" | "failed";
    };
    if (!payload?.orderId) {
      throw new AppError(400, "invalid_webhook", "orderId is required");
    }
    const [row] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, payload.orderId))
      .limit(1);
    if (!row) throw new AppError(404, "not_found", "Payment order not found");

    const status = payload.status ?? "success";
    await db
      .update(payments)
      .set({
        status,
        razorpayPaymentId: payload.paymentId ?? row.razorpayPaymentId,
      })
      .where(eq(payments.id, row.id));

    if (status === "success" && row.billId) {
      await db.update(bills).set({ status: "paid" }).where(eq(bills.id, row.billId));
    }

    await recordAudit({
      tenantId: row.tenantId,
      actorUserId: row.createdBy ?? "system",
      action: "payment.webhook",
      entityType: "payment",
      entityId: row.id,
      meta: { status },
    });

    return { ok: true as const };
  });
