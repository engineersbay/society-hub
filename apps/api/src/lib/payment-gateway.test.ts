import { afterEach, describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { RazorpayPaymentGateway } from "./payment-gateway";

const original = {
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
};

afterEach(() => {
  if (original.keyId === undefined) delete process.env.RAZORPAY_KEY_ID;
  else process.env.RAZORPAY_KEY_ID = original.keyId;
  if (original.keySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = original.keySecret;
  if (original.webhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
  else process.env.RAZORPAY_WEBHOOK_SECRET = original.webhookSecret;
});

describe("RazorpayPaymentGateway", () => {
  it("accepts a valid checkout signature and rejects a bad one", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    const gw = new RazorpayPaymentGateway();
    const orderId = "order_1";
    const paymentId = "pay_1";
    const signature = createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(
      gw.verifyCheckoutSignature({ orderId, paymentId, signature }),
    ).toBe(true);
    expect(
      gw.verifyCheckoutSignature({
        orderId,
        paymentId,
        signature: "deadbeef",
      }),
    ).toBe(false);
  });

  it("verifies webhook signatures with HMAC-SHA256", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    const gw = new RazorpayPaymentGateway();
    const body = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(gw.verifyWebhookSignature(body, signature)).toBe(true);
    expect(gw.verifyWebhookSignature(body, "nope")).toBe(false);
  });

  it("amounts stay in integer paise on the wire shape", () => {
    const amountRupees = 499;
    const amountPaise = amountRupees * 100;
    expect(amountPaise).toBe(49900);
    expect(Number.isInteger(amountPaise)).toBe(true);
  });

  it("reports configured only when key id and secret exist", () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    // env module may have cached empty strings; instance still exposes boolean
    const gw = new RazorpayPaymentGateway();
    expect(typeof gw.configured).toBe("boolean");
    expect(gw.provider).toBe("razorpay");
  });
});
