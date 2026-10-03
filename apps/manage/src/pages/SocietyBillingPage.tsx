import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { PlatformBillDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function SocietyBillingPage() {
  const { client, user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId } = useSelectedSociety();
  const [bills, setBills] = useState<PlatformBillDto[]>([]);
  const [billId, setBillId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [amountPaise, setAmountPaise] = useState<number | null>(null);
  const [originalPaise, setOriginalPaise] = useState<number | null>(null);
  const [offlineOnly, setOfflineOnly] = useState(true);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ paymentReference: string; status: string; amountPaise: number; method: string | null }>
  >([]);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!selectedSocietyId) return;
    client.listPlatformBills().then((all) => {
      const mine = all.filter((b) => b.tenantId === selectedSocietyId);
      setBills(mine);
      const issued = mine.find((b) => b.status === "issued");
      if (issued) {
        setBillId(issued.id);
        setAmountPaise(issued.amountPaise);
        setOriginalPaise(issued.amountPaise);
      } else if (mine[0]) {
        setBillId(mine[0].id);
        setAmountPaise(mine[0].amountPaise);
        setOriginalPaise(mine[0].amountPaise);
      }
    });
    client.getPlatformPaymentConfig().then((c) => {
      setOfflineOnly(c.offlineOnly);
      setKeyId(c.keyId);
    });
    client.listSocietyPlatformPayments(selectedSocietyId).then(setHistory);
  }

  useEffect(load, [client, selectedSocietyId]);

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;

  const selectedBill = bills.find((b) => b.id === billId);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!billId || !coupon.trim()) return;
    setError(null);
    try {
      const res = await client.previewPlatformCoupon({ billId, code: coupon.trim() });
      setAmountPaise(res.amountPaise);
      setOriginalPaise(res.originalAmountPaise);
      setMsg(`Coupon applied: ₹${(res.amountPaise / 100).toFixed(0)} due`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Coupon failed");
    }
  }

  async function payOffline() {
    if (!billId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await client.markPlatformBillOfflinePay({
        billId,
        discountCode: coupon.trim() || null,
      });
      setMsg(`Paid offline · ${res.paymentReference}`);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Offline pay failed");
    } finally {
      setBusy(false);
    }
  }

  async function payRazorpay() {
    if (!billId || offlineOnly) return;
    setBusy(true);
    setError(null);
    try {
      const order = await client.createPlatformPaymentOrder({
        billId,
        discountCode: coupon.trim() || null,
      });
      if (!order.checkout) {
        setError("Razorpay checkout is not available. Use offline pay.");
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
        name: selectedSociety?.name ?? "SocietyHub",
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await client.verifyPlatformPayment({
              paymentReference: order.paymentReference,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setMsg(`Paid · ${order.paymentReference}`);
            load();
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

  return (
    <div data-testid="society-billing-page">
      <h1 className="font-display text-2xl">Platform fee</h1>
      <p className="mt-1 text-sm text-black/55">
        Pay the subscription invoice for {selectedSociety?.name ?? "this society"}.
      </p>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
      {msg && <p className="mt-2 text-sm text-[var(--leaf)]">{msg}</p>}

      <div className="card mt-4 max-w-xl space-y-4 p-5">
        <div>
          <label className="label">Invoice</label>
          <select
            className="input"
            value={billId}
            onChange={(e) => {
              setBillId(e.target.value);
              const b = bills.find((x) => x.id === e.target.value);
              setAmountPaise(b?.amountPaise ?? null);
              setOriginalPaise(b?.amountPaise ?? null);
            }}
          >
            {bills.length === 0 && <option value="">No bills yet — generate from Admin</option>}
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.periodYm} · ₹{(b.amountPaise / 100).toFixed(0)} · {b.status}
              </option>
            ))}
          </select>
        </div>

        <form className="flex flex-wrap gap-2" onSubmit={applyCoupon}>
          <input
            className="input flex-1"
            placeholder="Coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            data-testid="billing-coupon"
          />
          <button className="btn btn-ghost" type="submit" disabled={!billId}>
            Apply
          </button>
        </form>

        <p className="text-lg font-semibold">
          Amount due:{" "}
          {amountPaise == null
            ? "—"
            : `₹${(amountPaise / 100).toFixed(0)}${
                originalPaise != null && originalPaise !== amountPaise
                  ? ` (was ₹${(originalPaise / 100).toFixed(0)})`
                  : ""
              }`}
        </p>

        {offlineOnly && (
          <p className="rounded-lg bg-[var(--mist)]/60 px-3 py-2 text-sm text-black/60">
            Online Razorpay pay starts once Razorpay is purchased and keys are configured.
            Offline payment is available now.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!billId || selectedBill?.status !== "issued" || busy}
            onClick={payOffline}
            data-testid="billing-pay-offline"
          >
            Pay offline
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={offlineOnly || !billId || selectedBill?.status !== "issued" || busy || !keyId}
            onClick={payRazorpay}
            data-testid="billing-pay-razorpay"
            title={offlineOnly ? "Available after Razorpay is configured" : "Pay with Razorpay"}
          >
            Razorpay
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Payment history</h2>
        <ul className="mt-2 space-y-2">
          {history.length === 0 ? (
            <li className="empty-state">No payments yet.</li>
          ) : (
            history.map((h) => (
              <li key={h.paymentReference} className="card px-4 py-3 text-sm">
                {h.paymentReference} · ₹{(h.amountPaise / 100).toFixed(0)} · {h.status}
                {h.method ? ` · ${h.method}` : ""}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
