import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PlatformPlanDto, SocietyOnboardingDto } from "@society-hub/types";
import { ApiClientError, createSocietyHubClient } from "@society-hub/sdk";
import { SocietyHubLogo } from "@society-hub/ui";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ROOT_DOMAIN = import.meta.env.VITE_SOCIETYHUB_ROOT_DOMAIN ?? "localhost:5173";
const WEB_URL =
  import.meta.env.VITE_APP_ORIGIN ??
  import.meta.env.VITE_WEB_URL ??
  "http://app.localhost:5173";
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

const BENEFITS = [
  { title: "Complaints to resolution", body: "Track every ticket with clear ownership." },
  { title: "Bills, notices, visitors", body: "Day-to-day society ops in one Client App." },
  { title: "Your brand, your domain", body: "Slug or custom domain for residents." },
] as const;

function Journey({ current }: Readonly<{ current: 1 | 2 | 3 }>) {
  const labels = ["Society", "Payment", "Ready"] as const;
  return (
    <nav aria-label="Onboarding progress" className="flex items-center gap-0">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = current === n;
        const done = current > n;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <span
                className={`mx-2 h-px w-6 sm:w-10 ${done || active ? "bg-[var(--saffron)]" : "bg-black/10"}`}
                aria-hidden
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  active
                    ? "bg-[var(--leaf-dark)] text-white"
                    : done
                      ? "bg-[var(--saffron)] text-white"
                      : "bg-black/[0.06] text-black/40"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  active ? "text-[var(--ink)]" : "text-black/40"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function BrandPanel({ children }: Readonly<{ children?: ReactNode }>) {
  return (
    <aside
      className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-10 py-10 text-white lg:flex lg:w-[42%]"
      style={{
        background:
          "linear-gradient(155deg, #1f1210 0%, #5c1830 48%, #8b1e3f 78%, #c45c00 120%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(232,119,34,0.55) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div>
        <div className="flex items-center gap-3">
          <SocietyHubLogo size={40} className="shrink-0 shadow-lg shadow-black/20" />
          <div>
            <p className="font-display text-2xl leading-none tracking-wide">SocietyHub</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Manage
            </p>
          </div>
        </div>
        <h2 className="mt-14 max-w-[16ch] text-[2.15rem] font-semibold leading-[1.15] tracking-tight">
          Launch your society in minutes
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
          Pick a plan, set the chairperson login, and go live on the Client App after payment.
        </p>
      </div>
      <ul className="relative space-y-5">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--saffron)]" />
            <div>
              <p className="text-sm font-semibold text-white">{b.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {children}
    </aside>
  );
}

function FormShell({
  step,
  title,
  subtitle,
  children,
}: Readonly<{
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
}>) {
  return (
    <div className="flex h-svh max-h-svh overflow-hidden bg-[#f7f4ef]">
      <BrandPanel />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/login" className="flex items-center gap-2 lg:invisible">
            <SocietyHubLogo size={32} className="shrink-0" />
            <span className="text-sm font-semibold text-[var(--leaf-dark)]">SocietyHub</span>
          </Link>
          <Journey current={step} />
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--ink)]/60 transition hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-6 sm:px-8">
          <div className="w-full max-w-[440px]">
            <h1 className="text-[1.65rem] font-semibold tracking-tight text-[var(--ink)]">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-black/50">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocietyOnboardPage() {
  const [plans, setPlans] = useState<PlatformPlanDto[]>([]);
  const [offlineOnly, setOfflineOnly] = useState(true);
  const [phase, setPhase] = useState<"society" | "account">("society");
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

  function goAccount(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.planId) return;
    setError(null);
    setPhase("account");
  }

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
      <FormShell
        step={3}
        title="You're ready"
        subtitle={`${onboarding.name} is live. Sign in to the Client App as chairperson.`}
      >
        <div data-testid="society-onboard-ready" className="space-y-5">
          {onboarding.clientAppUrl && (
            <a
              className="btn btn-primary flex w-full py-2.5"
              href={onboarding.clientAppUrl}
              data-testid="onboard-open-client"
            >
              Open Client App
            </a>
          )}
          <p className="text-center text-sm text-black/50">
            <Link className="font-medium text-[var(--leaf)] hover:underline" to="/login">
              Platform login
            </Link>
          </p>
        </div>
      </FormShell>
    );
  }

  if (onboarding) {
    const discounted =
      !!onboarding.discountCode &&
      onboarding.dueAmountPaise !== onboarding.originalAmountPaise;

    return (
      <FormShell
        step={2}
        title="Pay platform fee"
        subtitle={`${onboarding.name} · ${onboarding.slug}.${ROOT_DOMAIN}`}
      >
        <div data-testid="society-onboard-pay" className="space-y-5">
          {error && (
            <p className="rounded-md bg-[var(--danger)]/8 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
              Amount due
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-[var(--ink)]">
              {rupees(onboarding.dueAmountPaise)}
            </p>
            {discounted && (
              <p className="mt-1 text-sm text-black/45">
                <span className="line-through">{rupees(onboarding.originalAmountPaise)}</span>
                <span className="ml-2 font-medium text-[var(--leaf)]">{onboarding.discountCode}</span>
              </p>
            )}
          </div>

          <form className="flex gap-2" onSubmit={applyCoupon}>
            <input
              className="input flex-1"
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              data-testid="onboard-coupon"
            />
            <button className="btn btn-ghost shrink-0" type="submit">
              Apply
            </button>
          </form>

          {offlineOnly && (
            <p className="text-xs leading-relaxed text-black/45">
              Razorpay unlocks when keys are configured. Pay offline to finish signup now.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn btn-primary flex-1 py-2.5"
              disabled={busy}
              onClick={payOffline}
              data-testid="onboard-pay-offline"
            >
              {busy ? "Processing…" : "Pay offline"}
            </button>
            <button
              type="button"
              className="btn btn-ghost flex-1 py-2.5"
              disabled={busy || offlineOnly}
              onClick={payRazorpay}
              data-testid="onboard-pay-razorpay"
            >
              Razorpay
            </button>
          </div>
        </div>
      </FormShell>
    );
  }

  if (phase === "account") {
    return (
      <FormShell
        step={1}
        title="Chairperson account"
        subtitle={`${form.name || "Your society"} · ${selectedPlan ? `${selectedPlan.name} ${rupees(selectedPlan.monthlyFeePaise)}/mo` : "plan"} · Client App login`}
      >
        <form className="space-y-3.5" onSubmit={start} data-testid="society-onboard-page">
          {error && (
            <p className="rounded-md bg-[var(--danger)]/8 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <div>
            <label className="label" htmlFor="ob-chair">
              Full name *
            </label>
            <input
              id="ob-chair"
              className="input"
              required
              value={form.chairpersonName}
              onChange={(e) => setForm((f) => ({ ...f, chairpersonName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ob-email">
                Email *
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
                Phone *
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
          </div>
          <div>
            <label className="label" htmlFor="ob-password">
              Password *
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
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              className="btn btn-ghost flex-1 py-2.5"
              onClick={() => setPhase("society")}
            >
              Back
            </button>
            <button
              className="btn btn-primary flex-[1.4] py-2.5"
              disabled={busy || !form.planId}
              type="submit"
            >
              {busy ? "Creating…" : "Continue to payment"}
            </button>
          </div>
        </form>
      </FormShell>
    );
  }

  return (
    <FormShell
      step={1}
      title="Create your society"
      subtitle="Details and plan first. Chairperson login is next."
    >
      <form className="space-y-3.5" onSubmit={goAccount} data-testid="society-onboard-page">
        {error && (
          <p className="rounded-md bg-[var(--danger)]/8 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="ob-name">
            Society name *
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ob-slug">
              Slug
            </label>
            <input
              id="ob-slug"
              className="input"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              data-testid="onboard-slug"
            />
            <p className="mt-1 truncate text-[11px] text-black/40">
              {(form.slug || "your-slug").toLowerCase()}.{ROOT_DOMAIN}
            </p>
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
        </div>

        <div>
          <label className="label" htmlFor="ob-domain">
            Custom domain <span className="font-normal text-black/35">optional</span>
          </label>
          <input
            id="ob-domain"
            className="input"
            value={form.customDomain}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
          />
        </div>

        <div>
          <p className="label mb-2">Plan *</p>
          <div
            className="overflow-hidden rounded-xl border border-black/[0.08] bg-white"
            role="radiogroup"
            aria-label="Plan"
            data-testid="onboard-plan"
          >
            {plans.map((p, i) => {
              const selected = form.planId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setForm((f) => ({ ...f, planId: p.id }))}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition ${
                    i > 0 ? "border-t border-black/[0.06]" : ""
                  } ${selected ? "bg-[var(--mist)]/70" : "hover:bg-black/[0.02]"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[var(--saffron)] bg-[var(--saffron)]"
                          : "border-black/20 bg-white"
                      }`}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ink)]">{p.name}</p>
                      {p.flatHint != null && (
                        <p className="text-[11px] text-black/45">Up to {p.flatHint} flats</p>
                      )}
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[var(--ink)]">
                    {rupees(p.monthlyFeePaise)}
                    <span className="font-normal text-black/35">/mo</span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="btn btn-primary mt-1 w-full py-2.5"
          disabled={!form.name.trim() || !form.planId}
          type="submit"
        >
          Continue
        </button>

        <p className="text-center text-xs text-black/40">
          Residents use the{" "}
          <a className="text-[var(--leaf)] hover:underline" href={WEB_URL}>
            Client App
          </a>{" "}
          after provisioning.
        </p>
      </form>
    </FormShell>
  );
}
