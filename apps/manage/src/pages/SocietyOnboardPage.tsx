import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlatformPlanDto, SocietyOnboardingDto } from "@society-hub/types";
import { ApiClientError, createSocietyHubClient } from "@society-hub/sdk";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ROOT_DOMAIN = import.meta.env.VITE_SOCIETYHUB_ROOT_DOMAIN ?? "localhost:5173";
const STORAGE_KEY = "sh_society_onboard";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

const client = createSocietyHubClient({ baseUrl: API_URL });

function rupees(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function SocietyOnboardPage() {
  const [plans, setPlans] = useState<PlatformPlanDto[]>([]);
  const [offlineOnly, setOfflineOnly] = useState(true);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    customDomain: "",
    city: "",
    chairpersonName: "",
    chairpersonEmail: "",
    chairpersonPhone: "",
    chairpersonPassword: "",
    planId: "",
  });
  const [onboarding, setOnboarding] = useState<SocietyOnboardingDto | null>(null);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.listPublicOnboardingPlans().then((res) => {
      setPlans(res.plans);
      setOfflineOnly(res.offlineOnly);
      setForm((f) => ({ ...f, planId: f.planId || res.plans[0]?.id || "" }));
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { id: string; resumeToken: string };
      client.getSocietyOnboarding(saved.id, saved.resumeToken).then((row) => {
        setOnboarding({ ...row, resumeToken: saved.resumeToken });
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selectedPlan = plans.find((p) => p.id === form.planId);
  const resumeToken = onboarding?.resumeToken ?? "";

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const row = await client.startSocietyOnboarding({
        name: form.name,
        slug: form.slug || null,
        customDomain: form.customDomain || null,
        city: form.city || null,
        chairpersonName: form.chairpersonName,
        chairpersonEmail: form.chairpersonEmail,
        chairpersonPhone: form.chairpersonPhone,
        chairpersonPassword: form.chairpersonPassword,
        planId: form.planId,
      });
      if (row.resumeToken) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id: row.id, resumeToken: row.resumeToken }),
        );
      }
      setOnboarding(row);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Could not start signup");
    } finally {
      setBusy(false);
    }
  }

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!onboarding || !coupon.trim()) return;
    setError(null);
    try {
      const priced = await client.previewOnboardingCoupon(onboarding.id, {
        resumeToken,
        code: coupon.trim(),
      });
      setOnboarding((o) =>
        o
          ? {
              ...o,
              dueAmountPaise: priced.amountPaise,
              originalAmountPaise: priced.originalAmountPaise,
              discountCode: priced.discountCode,
            }
          : o,
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Coupon failed");
    }
  }

  async function payOffline() {
    if (!onboarding) return;
    setBusy(true);
    setError(null);
    try {
      const row = await client.payOnboardingOffline(onboarding.id, { resumeToken });
      setOnboarding({ ...row, resumeToken });
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Offline pay failed");
    } finally {
      setBusy(false);
    }
  }

  async function payRazorpay() {
    if (!onboarding || offlineOnly) return;
    setBusy(true);
    setError(null);
    try {
      const order = await client.createOnboardingOrder(onboarding.id, { resumeToken });
      if (!order.checkout) {
        setError("Razorpay is not configured. Use Pay offline.");
        return;
      }
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("checkout_script_failed"));
          document.body.appendChild(s);
        });
      }
      const rzp = new window.Razorpay!({
        key: order.checkout.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.checkout.orderId,
        name: onboarding.name,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const row = await client.verifyOnboardingPayment(onboarding.id, {
              resumeToken,
              paymentReference: order.paymentReference ?? "",
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setOnboarding({ ...row, resumeToken });
            localStorage.removeItem(STORAGE_KEY);
          } catch (err) {
            setError(err instanceof ApiClientError ? err.body.message : "Verify failed");
          }
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (onboarding?.status === "provisioned") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12" data-testid="society-onboard-ready">
        <h1 className="font-display text-3xl">Your society is ready</h1>
        <p className="mt-2 text-sm text-black/60">
          {onboarding.name} is live. Sign in to the Client App as chairperson with the email and
          password you set.
        </p>
        {onboarding.clientAppUrl && (
          <a
            className="btn btn-primary mt-6 inline-flex"
            href={onboarding.clientAppUrl}
            data-testid="onboard-open-client"
          >
            Open Client App
          </a>
        )}
        <p className="mt-4 text-sm">
          <Link className="text-[var(--leaf)]" to="/login">
            Platform login
          </Link>
        </p>
      </div>
    );
  }

  if (onboarding) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12" data-testid="society-onboard-pay">
        <h1 className="font-display text-3xl">Pay platform fee</h1>
        <p className="mt-2 text-sm text-black/60">
          {onboarding.name} · {onboarding.slug}.{ROOT_DOMAIN}
        </p>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        <div className="card mt-6 space-y-4 p-5">
          <p className="text-lg font-semibold">
            Amount due: {rupees(onboarding.dueAmountPaise)}
            {onboarding.discountCode && onboarding.dueAmountPaise !== onboarding.originalAmountPaise
              ? ` (was ${rupees(onboarding.originalAmountPaise)})`
              : ""}
          </p>
          <form className="flex gap-2" onSubmit={applyCoupon}>
            <input
              className="input flex-1"
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              data-testid="onboard-coupon"
            />
            <button className="btn btn-ghost" type="submit">
              Apply
            </button>
          </form>
          {offlineOnly && (
            <p className="rounded-lg bg-[var(--mist)]/60 px-3 py-2 text-sm text-black/60">
              Online Razorpay pay starts once keys are configured. Pay offline to finish signup now.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={payOffline}
              data-testid="onboard-pay-offline"
            >
              Pay offline
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || offlineOnly}
              onClick={payRazorpay}
              data-testid="onboard-pay-razorpay"
            >
              Razorpay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12" data-testid="society-onboard-page">
      <h1 className="font-display text-3xl">Register your society</h1>
      <p className="mt-2 text-sm text-black/60">
        Create your society, pick a plan, and pay the first platform invoice. After payment you
        sign in on the Client App as chairperson.
      </p>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

      <form className="card mt-6 grid gap-4 p-5" onSubmit={start}>
        <div>
          <label className="label" htmlFor="ob-name">
            Society name
          </label>
          <input
            id="ob-name"
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            data-testid="onboard-name"
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-slug">
            Slug
          </label>
          <input
            id="ob-slug"
            className="input"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="auto from name if blank"
            data-testid="onboard-slug"
          />
          <p className="mt-1 text-xs text-black/45">
            {(form.slug || "your-slug").toLowerCase()}.{ROOT_DOMAIN}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="ob-domain">
            Custom domain (optional)
          </label>
          <input
            id="ob-domain"
            className="input"
            value={form.customDomain}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-city">
            City
          </label>
          <input
            id="ob-city"
            className="input"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-plan">
            Plan
          </label>
          <select
            id="ob-plan"
            className="input"
            value={form.planId}
            onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
            required
            data-testid="onboard-plan"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {rupees(p.monthlyFeePaise)}/mo
                {p.flatHint ? ` · up to ${p.flatHint} flats` : ""}
              </option>
            ))}
          </select>
          {selectedPlan && (
            <p className="mt-1 text-xs text-black/45">
              First invoice: {rupees(selectedPlan.monthlyFeePaise)}. Coupon on the next screen.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="ob-chair">
            Chairperson name
          </label>
          <input
            id="ob-chair"
            className="input"
            required
            value={form.chairpersonName}
            onChange={(e) => setForm((f) => ({ ...f, chairpersonName: e.target.value }))}
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-email">
            Chairperson email
          </label>
          <input
            id="ob-email"
            className="input"
            type="email"
            required
            value={form.chairpersonEmail}
            onChange={(e) => setForm((f) => ({ ...f, chairpersonEmail: e.target.value }))}
            data-testid="onboard-email"
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-phone">
            Chairperson phone
          </label>
          <input
            id="ob-phone"
            className="input"
            required
            minLength={10}
            value={form.chairpersonPhone}
            onChange={(e) => setForm((f) => ({ ...f, chairpersonPhone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label" htmlFor="ob-password">
            Password
          </label>
          <input
            id="ob-password"
            className="input"
            type="password"
            required
            minLength={8}
            value={form.chairpersonPassword}
            onChange={(e) => setForm((f) => ({ ...f, chairpersonPassword: e.target.value }))}
            data-testid="onboard-password"
          />
        </div>
        <button className="btn btn-primary" disabled={busy || !form.planId} type="submit">
          Continue to payment
        </button>
      </form>
      <p className="mt-4 text-sm text-black/50">
        Already a platform employee?{" "}
        <Link className="text-[var(--leaf)]" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
