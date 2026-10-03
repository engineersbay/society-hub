import { createHmac } from "node:crypto";
import { env } from "../config";

export type GatewayCreateOrderInput = {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type GatewayOrder = {
  id: string;
  amountPaise: number;
  currency: string;
  status: string;
};

export type GatewayPayment = {
  id: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  status: string;
  method?: string;
};

export type PaymentGateway = {
  readonly provider: string;
  readonly keyId: string;
  readonly configured: boolean;
  createOrder(input: GatewayCreateOrderInput): Promise<GatewayOrder>;
  getOrder(orderId: string): Promise<GatewayOrder | null>;
  getPayment(paymentId: string): Promise<GatewayPayment | null>;
  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
};

function basicAuthHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export class RazorpayPaymentGateway implements PaymentGateway {
  readonly provider = "razorpay";
  private readonly baseUrl = "https://api.razorpay.com/v1";

  get keyId() {
    return process.env.RAZORPAY_KEY_ID ?? env.razorpayKeyId;
  }

  private get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET ?? env.razorpayKeySecret;
  }

  private get webhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET ?? env.razorpayWebhookSecret;
  }

  get configured() {
    return Boolean(this.keyId && this.keySecret);
  }

  async createOrder(input: GatewayCreateOrderInput): Promise<GatewayOrder> {
    if (!this.configured) {
      throw new Error("razorpay_not_configured");
    }
    const res = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(this.keyId, this.keySecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`razorpay_order_failed:${res.status}:${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
    };
    return {
      id: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      status: data.status,
    };
  }

  async getOrder(orderId: string): Promise<GatewayOrder | null> {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      headers: { Authorization: basicAuthHeader(this.keyId, this.keySecret) },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`razorpay_get_order_failed:${res.status}`);
    const data = (await res.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
    };
    return {
      id: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      status: data.status,
    };
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: { Authorization: basicAuthHeader(this.keyId, this.keySecret) },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`razorpay_get_payment_failed:${res.status}`);
    const data = (await res.json()) as {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      method?: string;
    };
    return {
      id: data.id,
      orderId: data.order_id,
      amountPaise: data.amount,
      currency: data.currency,
      status: data.status,
      method: data.method,
    };
  }

  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (!this.keySecret) return false;
    const expected = createHmac("sha256", this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return expected === input.signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    return expected === signature;
  }
}

export function getPaymentGateway(): PaymentGateway {
  return new RazorpayPaymentGateway();
}
