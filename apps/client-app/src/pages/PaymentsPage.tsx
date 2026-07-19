import { useEffect, useState } from "react";
import type { PaymentDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function PaymentsPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<PaymentDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .myPayments()
      .then((rows) => setItems(rows))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [client]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Payments</h1>
        <p className="mt-1 text-sm text-black/55">Your payment history.</p>
      </div>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Payment history isn't live yet — this screen will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="payments-empty">No payments yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="text-black/55">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{rupees(p.amountPaise)}</td>
                  <td className="uppercase">{p.method}</td>
                  <td>
                    <span className={`badge ${p.status === "success" ? "badge-success" : p.status === "failed" ? "badge-danger" : ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-black/55">{p.receiptNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
