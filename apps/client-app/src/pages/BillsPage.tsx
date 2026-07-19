import { useEffect, useState } from "react";
import type { BillDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function BillsPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<BillDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    client
      .myBills()
      .then((rows) => setItems(rows))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }

  useEffect(load, [client]);

  async function payMock(bill: BillDto) {
    setPaying(bill.id);
    setError(null);
    setMessage(null);
    try {
      await client.payBillMock(bill.id);
      setMessage(`Payment recorded for ${bill.periodYm}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Payment failed");
    } finally {
      setPaying(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Bills</h1>
        <p className="mt-1 text-sm text-black/55">Maintenance bills for your flat.</p>
      </div>

      {message && <p className="mb-4 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Billing isn't live yet — this screen will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="bills-empty">No bills yet.</div>
      ) : (
        <div className="space-y-3" data-testid="bills-list">
          {items.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">{b.periodYm}</p>
                <p className="text-sm text-black/55">{rupees(b.amountPaise)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${b.status === "paid" ? "badge-success" : ""}`}>{b.status}</span>
                {b.status !== "paid" && b.status !== "void" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    data-testid="bills-pay"
                    disabled={paying === b.id}
                    onClick={() => payMock(b)}
                  >
                    {paying === b.id ? "Paying…" : "Pay now"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
