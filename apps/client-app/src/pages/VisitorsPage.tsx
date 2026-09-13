import { FormEvent, useEffect, useState } from "react";
import type { VisitorDto, VisitorPassIssueDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useAppMode } from "../app-mode";

function qrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
}

export function VisitorsPage() {
  const { client } = useAuth();
  const { mode } = useAppMode();
  const isAdmin = mode === "admin";
  const [items, setItems] = useState<VisitorDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issuedPass, setIssuedPass] = useState<VisitorPassIssueDto | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    phone: "",
    purpose: "",
    expectedAt: "",
  });

  function load() {
    client
      .listVisitors()
      .then((page) => setItems(page.items))
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }

  useEffect(load, [client]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await client.createVisitor({
        visitorName: form.visitorName,
        phone: form.phone || null,
        purpose: form.purpose || null,
        expectedAt: form.expectedAt || null,
      });
      setForm({ visitorName: "", phone: "", purpose: "", expectedAt: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(id: string) {
    try {
      await client.checkInVisitor(id);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Check-in failed");
    }
  }

  async function checkOut(id: string) {
    try {
      await client.checkOutVisitor(id);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Check-out failed");
    }
  }

  async function issuePass(id: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await client.issueVisitorPass(id);
      setIssuedPass(result);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Could not issue pass");
    } finally {
      setBusy(false);
    }
  }

  async function revokePass(id: string) {
    setBusy(true);
    setError(null);
    try {
      await client.revokeVisitorPass(id);
      if (issuedPass?.visitor.id === id) setIssuedPass(null);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Could not revoke pass");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="visitors-page">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">Visitors</h1>
          <p className="mt-0.5 text-sm text-black/55">
            {isAdmin
              ? "Register guests, share digital passes, or check in at the gate."
              : "Pre-register guests and share a QR + OTP pass to their phone."}
          </p>
        </div>
        <button type="button" className="btn btn-primary text-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Expect a visitor"}
        </button>
      </div>

      {showForm && (
        <form className="card sh-section mb-4 grid gap-2.5 sm:grid-cols-2" onSubmit={submit}>
          <div>
            <label className="label">Visitor name</label>
            <input className="input" required value={form.visitorName} onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone (required to share pass)</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
          </div>
          <div>
            <label className="label">Expected at</label>
            <input className="input" type="datetime-local" value={form.expectedAt} onChange={(e) => setForm((f) => ({ ...f, expectedAt: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" disabled={busy} type="submit">Save</button>
          </div>
        </form>
      )}

      {issuedPass && (
        <div className="card sh-section mb-4 max-w-md" data-testid="visitor-pass-share">
          <h2 className="font-medium">Pass shared</h2>
          <p className="mt-1 text-sm text-black/55">
            SMS and WhatsApp sent to {issuedPass.visitor.phone}. Show this QR or OTP once; resend issues a new code.
          </p>
          <img
            className="mt-3 rounded border border-black/10 bg-white p-2"
            width={220}
            height={220}
            alt="Visitor pass QR"
            src={qrImageUrl(issuedPass.qrPayload)}
          />
          <p className="mt-2 text-2xl font-semibold tracking-widest">{issuedPass.otp}</p>
          <p className="mt-1 text-xs text-black/45">Valid until {issuedPass.expiresAt}</p>
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setIssuedPass(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">No visitors yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="visitors-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Flat</th>
                <th>Status</th>
                <th>Pass</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium">{r.visitorName}</div>
                    <div className="text-xs text-black/45">{r.purpose ?? "—"}</div>
                  </td>
                  <td>{r.flatNumber ?? "—"}</td>
                  <td>
                    <span className="badge">
                      {r.checkedOutAt ? "Checked out" : r.checkedInAt ? "On site" : "Expected"}
                    </span>
                  </td>
                  <td>
                    <span className="badge">{r.passStatus}</span>
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    {!r.checkedOutAt && r.passStatus !== "used" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy || !r.phone}
                        onClick={() => void issuePass(r.id)}
                      >
                        {r.passStatus === "issued" ? "Resend pass" : "Issue / Share"}
                      </button>
                    )}
                    {isAdmin && r.passStatus === "issued" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void revokePass(r.id)}
                      >
                        Revoke
                      </button>
                    )}
                    {isAdmin && !r.checkedInAt && !r.checkedOutAt && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => checkIn(r.id)}>Check in</button>
                    )}
                    {isAdmin && r.checkedInAt && !r.checkedOutAt && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => checkOut(r.id)}>Check out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
