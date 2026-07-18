import { Elysia } from "elysia";
import { and, count, desc, eq } from "drizzle-orm";
import type { BillDto, PaymentDto } from "@society-hub/types";
import { generateBillsSchema, listQuerySchema } from "@society-hub/validation";
import { db } from "../../db/client";
import { billLineItems, bills, flats, payments } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { recordAudit } from "../../lib/audit";
import { notifyUser } from "../../lib/notify";
import {
  authPlugin,
  isStaffRole,
  requireAuth,
  requireRole,
} from "../../lib/auth-context";
import { generateReceiptNumber, toPaymentDto } from "../payments/routes";

function toBillDto(row: typeof bills.$inferSelect, flatNumber: string): BillDto {
  return {
    id: row.id,
    flatId: row.flatId,
    flatNumber,
    periodYm: row.periodYm,
    amountPaise: row.amountPaise,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

async function loadBillWithFlat(billId: string, tenantId: string) {
  const [row] = await db
    .select({ bill: bills, flatNumber: flats.number })
    .from(bills)
    .innerJoin(flats, eq(flats.id, bills.flatId))
    .where(
      and(eq(bills.id, billId), eq(bills.tenantId, tenantId), eq(bills.isDeleted, false)),
    )
    .limit(1);
  if (!row) throw new AppError(404, "not_found", "Bill not found");
  return row;
}

export const billRoutes = new Elysia({ prefix: "/v1/bills" })
  .use(authPlugin)
  .get("/", async ({ auth, query }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const q = listQuerySchema.parse(query);
    const offset = (q.page - 1) * q.limit;
    const where = and(eq(bills.tenantId, claims.tenantId), eq(bills.isDeleted, false));

    const [{ total } = { total: 0 }] = await db
      .select({ total: count() })
      .from(bills)
      .where(where);

    const rows = await db
      .select({ bill: bills, flatNumber: flats.number })
      .from(bills)
      .innerJoin(flats, eq(flats.id, bills.flatId))
      .where(where)
      .orderBy(desc(bills.createdAt))
      .limit(q.limit)
      .offset(offset);

    return {
      items: rows.map((r) => toBillDto(r.bill, r.flatNumber)),
      page: q.page,
      limit: q.limit,
      total: Number(total),
    };
  })
  .get("/mine", async ({ auth }) => {
    const claims = requireAuth(auth);
    if (!claims.flatId) return [] as BillDto[];
    const rows = await db
      .select({ bill: bills, flatNumber: flats.number })
      .from(bills)
      .innerJoin(flats, eq(flats.id, bills.flatId))
      .where(
        and(
          eq(bills.tenantId, claims.tenantId),
          eq(bills.flatId, claims.flatId),
          eq(bills.isDeleted, false),
        ),
      )
      .orderBy(desc(bills.createdAt));
    return rows.map((r) => toBillDto(r.bill, r.flatNumber));
  })
  .post("/generate", async ({ auth, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const parsed = generateBillsSchema.parse(body);

    const flatRows = await db
      .select()
      .from(flats)
      .where(and(eq(flats.tenantId, claims.tenantId), eq(flats.isDeleted, false)));

    const existingRows = await db
      .select({ flatId: bills.flatId })
      .from(bills)
      .where(
        and(
          eq(bills.tenantId, claims.tenantId),
          eq(bills.periodYm, parsed.periodYm),
          eq(bills.isDeleted, false),
        ),
      );
    const already = new Set(existingRows.map((r) => r.flatId));

    let created = 0;
    for (const flat of flatRows) {
      if (already.has(flat.id)) continue;
      const billId = crypto.randomUUID();
      await db.insert(bills).values({
        id: billId,
        tenantId: claims.tenantId,
        flatId: flat.id,
        periodYm: parsed.periodYm,
        amountPaise: parsed.amountPaise,
        status: "issued",
        notes: parsed.notes ?? null,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
      await db.insert(billLineItems).values({
        id: crypto.randomUUID(),
        tenantId: claims.tenantId,
        billId,
        label: `Maintenance ${parsed.periodYm}`,
        amountPaise: parsed.amountPaise,
        createdBy: claims.sub,
        updatedBy: claims.sub,
      });
      created += 1;
    }

    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: "bill.generated",
      entityType: "bill",
      entityId: parsed.periodYm,
      meta: { periodYm: parsed.periodYm, amountPaise: parsed.amountPaise, created },
    });

    return { created };
  })
  .get("/:id", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const { bill, flatNumber } = await loadBillWithFlat(params.id, claims.tenantId);
    if (!isStaffRole(claims.role) && bill.flatId !== claims.flatId) {
      throw new AppError(404, "not_found", "Bill not found");
    }
    return toBillDto(bill, flatNumber);
  })
  .post("/:id/pay", async ({ auth, params }) => {
    const claims = requireAuth(auth);
    const { bill, flatNumber } = await loadBillWithFlat(params.id, claims.tenantId);
    if (!isStaffRole(claims.role) && bill.flatId !== claims.flatId) {
      throw new AppError(404, "not_found", "Bill not found");
    }
    if (bill.status === "paid") {
      throw new AppError(400, "already_paid", "Bill is already paid");
    }

    // Mock Razorpay: in production this would create a real order and be
    // confirmed via the signed webhook; locally we settle instantly.
    const paymentId = crypto.randomUUID();
    const receiptNumber = generateReceiptNumber();
    await db.insert(payments).values({
      id: paymentId,
      tenantId: claims.tenantId,
      billId: bill.id,
      flatId: bill.flatId,
      amountPaise: bill.amountPaise,
      method: "razorpay",
      status: "success",
      razorpayOrderId: `order_dev_${paymentId.slice(0, 12)}`,
      razorpayPaymentId: `pay_dev_${paymentId.slice(0, 12)}`,
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
      meta: { paymentId, amountPaise: bill.amountPaise, method: "razorpay" },
    });

    await notifyUser({
      tenantId: claims.tenantId,
      userId: claims.sub,
      title: "Payment received",
      body: `Receipt ${receiptNumber} for ₹${(bill.amountPaise / 100).toFixed(2)}`,
      kind: "payment",
      linkPath: `/payments`,
    });

    const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    return toPaymentDto(row!, flatNumber) satisfies PaymentDto;
  })
  .delete("/:id", async ({ auth, params, body }) => {
    const claims = requireAuth(auth);
    requireRole(claims, ["admin", "superadmin"]);
    const { bill } = await loadBillWithFlat(params.id, claims.tenantId);
    const parsedBody = (body as { corrected?: boolean } | null) ?? {};
    const nextStatus = parsedBody.corrected ? "corrected" : "void";

    await db
      .update(bills)
      .set({ status: nextStatus, updatedBy: claims.sub })
      .where(eq(bills.id, bill.id));

    await recordAudit({
      tenantId: claims.tenantId,
      actorUserId: claims.sub,
      action: `bill.${nextStatus}`,
      entityType: "bill",
      entityId: bill.id,
    });

    return { ok: true as const, status: nextStatus };
  });
