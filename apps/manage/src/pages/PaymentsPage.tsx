import { FormEvent, useEffect, useState } from "react";
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
  const [showForm, setShowForm] = useState(false);
  const [flatId, setFlatId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    client
      .listPayments()
      .then((res) => setItems(res.items))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }

  useEffect(load, [client]);

  async function record(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await client.recordPayment({
        flatId,
        amountPaise: Math.round(Number(amount) * 100),
        method,
        receiptNumber: receiptNumber || null,
      });
      setMessage("Payment recorded.");
      setShowForm(false);
      setFlatId("");
      setAmount("");
      setReceiptNumber("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to record payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Payments</h1>
          <p className="mt-1 text-sm text-black/55">Online and offline (cash / cheque / NEFT) payments.</p>
        </div>
        <button
          type="button"
          data-testid="payments-record-toggle"
          className="btn btn-primary text-sm"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "Record offline payment"}
        </button>
      </div>

      {showForm && (
        <form className="card mb-6 grid gap-4 p-5 sm:grid-cols-2" data-testid="payments-record-form" onSubmit={record}>
          <div>
            <label className="label" htmlFor="flatId">Flat ID</label>
            <input id="flatId" className="input" value={flatId} onChange={(e) => setFlatId(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="amount">Amount (₹)</label>
            <input
              id="amount"
              className="input"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="method">Method</label>
            <select id="method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="neft">NEFT</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="receiptNumber">Reference / receipt no.</label>
            <input
              id="receiptNumber"
              className="input"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" data-testid="payments-record-submit" disabled={busy} type="submit">
              Save payment
            </button>
          </div>
        </form>
      )}

      {message && <p className="mb-4 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Payments API isn't live yet — this screen will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="payments-empty">No payments recorded yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="payments-table">
            <thead>
              <tr>
                <th>Flat</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.flatNumber ?? p.flatId}</td>
                  <td>{rupees(p.amountPaise)}</td>
                  <td className="uppercase">{p.method}</td>
                  <td>
                    <span className={`badge ${p.status === "success" ? "badge-success" : p.status === "failed" ? "badge-danger" : ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-black/55">{p.receiptNumber ?? "—"}</td>
                  <td className="text-black/55">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
