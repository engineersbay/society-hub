import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import {
  applyOnboardingCouponSchema,
  createOnboardingOrderSchema,
  markOnboardingOfflineSchema,
  startSocietyOnboardingSchema,
  verifyOnboardingPaymentSchema,
} from "@society-hub/validation";
import { db } from "../../db/client";
import { platformPlans } from "../../db/schema";
import {
  createOnboardingOrder,
  loadOnboardingByResume,
  payOnboardingOffline,
  previewOnboardingCoupon,
  startSocietyOnboarding,
  toOnboardingDto,
  verifyOnboardingCheckout,
} from "../../lib/society-onboarding";
import { getPaymentGateway } from "../../lib/payment-gateway";

export const publicSocietyOnboardingRoutes = new Elysia({
  prefix: "/v1/public/society-onboarding",
})
  .get("/plans", async () => {
    const rows = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isDeleted, false));
    if (rows.length === 0) {
      const seeds = [
        { code: "starter", name: "Starter", monthlyFeePaise: 499900, flatHint: 50 },
        { code: "growth", name: "Growth", monthlyFeePaise: 999900, flatHint: 200 },
        { code: "enterprise", name: "Enterprise", monthlyFeePaise: 2499900, flatHint: 1000 },
      ];
      for (const s of seeds) {
        await db.insert(platformPlans).values({
          id: crypto.randomUUID(),
          code: s.code,
          name: s.name,
          monthlyFeePaise: s.monthlyFeePaise,
          modulesJson: JSON.stringify([
            "complaints",
            "bills",
            "payments",
            "notices",
            "visitors",
            "parking",
            "bookings",
            "assets",
            "vendors",
            "events",
          ]),
          flatHint: s.flatHint,
        });
      }
    }
    const plans = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isDeleted, false));
    const gw = getPaymentGateway();
    return {
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        monthlyFeePaise: p.monthlyFeePaise,
        modulesJson: p.modulesJson,
        flatHint: p.flatHint,
      })),
      razorpayConfigured: gw.configured,
      keyId: gw.configured ? gw.keyId : null,
      offlineOnly: !gw.configured,
    };
  })
  .post("/", async ({ body }) => {
    const parsed = startSocietyOnboardingSchema.parse(body);
    return startSocietyOnboarding(parsed);
  })
  .get("/:id", async ({ params, query }) => {
    const token = typeof query.token === "string" ? query.token : "";
    const row = await loadOnboardingByResume(params.id, token);
    return toOnboardingDto(row);
  })
  .post("/:id/coupon", async ({ params, body }) => {
    const parsed = applyOnboardingCouponSchema.parse(body);
    return previewOnboardingCoupon(params.id, parsed.resumeToken, parsed.code);
  })
  .post("/:id/pay-offline", async ({ params, body }) => {
    const parsed = markOnboardingOfflineSchema.parse(body);
    return payOnboardingOffline(params.id, parsed.resumeToken);
  })
  .post("/:id/orders", async ({ params, body }) => {
    const parsed = createOnboardingOrderSchema.parse(body);
    return createOnboardingOrder(params.id, parsed.resumeToken);
  })
  .post("/:id/verify", async ({ params, body }) => {
    const parsed = verifyOnboardingPaymentSchema.parse(body);
    return verifyOnboardingCheckout({
      id: params.id,
      resumeToken: parsed.resumeToken,
      paymentReference: parsed.paymentReference,
      razorpayOrderId: parsed.razorpayOrderId,
      razorpayPaymentId: parsed.razorpayPaymentId,
      razorpaySignature: parsed.razorpaySignature,
    });
  });
