import { FormEvent, useEffect, useState } from "react";
import type { VisitorDto, VisitorPassIssueDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useAppMode } from "../app-mode";
import { Icon } from "../components/icons";

function qrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
}

function visitorInitial(name: string) {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "V";
}

function visitStatus(r: VisitorDto): "expected" | "on_site" | "checked_out" {
  if (r.checkedOutAt) return "checked_out";
  if (r.checkedInAt) return "on_site";
  return "expected";
}

function visitStatusLabel(status: ReturnType<typeof visitStatus>) {
  if (status === "checked_out") return "Checked out";
  if (status === "on_site") return "On site";
  return "Expected";
}

function visitStatusClass(status: ReturnType<typeof visitStatus>) {
  if (status === "on_site") return "badge-success";
  if (status === "checked_out") return "badge";
  return "badge-progress";
}

function passStatusClass(pass: string) {
  if (pass === "issued") return "badge-success";
  if (pass === "used") return "badge";
  if (pass === "revoked" || pass === "expired") return "badge-danger";
  return "badge";
}

function passStatusLabel(pass: string) {
  if (!pass || pass === "none") return "No pass";
  return pass.replaceAll("_", " ");
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

  const expectedCount =
    items?.filter((r) => visitStatus(r) === "expected").length ?? 0;
  const onSiteCount = items?.filter((r) => visitStatus(r) === "on_site").length ?? 0;

  return (
    <div data-testid="visitors-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
            {isAdmin ? "Admin view · gate ops" : "Resident view · guest passes"}
          </p>
          <h1 className="mt-1 font-display text-2xl text-[var(--leaf-dark)] sm:text-3xl">
            Visitors
          </h1>
          <p className="mt-1 max-w-xl text-sm text-black/50">
            {isAdmin
              ? "Register guests, share digital passes, or check in at the gate."
              : "Pre-register guests and share a QR + OTP pass to their phone."}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn-primary shrink-0 px-5 py-2.5 text-sm"
            onClick={() => setShowForm(true)}
          >
            Expect a visitor
          </button>
        )}
      </div>

      {items !== null && items.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--sand)]/70 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Total
            </p>
            <p className="mt-1 font-display text-2xl text-[var(--leaf-dark)]">{items.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--sand)]/70 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Expected
            </p>
            <p className="mt-1 font-display text-2xl text-[var(--leaf)]">{expectedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--sand)]/70 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              On site
            </p>
            <p className="mt-1 font-display text-2xl text-[var(--leaf-dark)]">{onSiteCount}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form className="sh-form-panel mb-5" onSubmit={submit}>
          <div className="sh-form-panel-head">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mist)] text-[var(--leaf-dark)]">
                <Icon name="visitors" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Expect a guest</p>
                <p className="text-xs text-black/45">
                  Add a phone number so you can share a QR + OTP pass
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowForm(false)}
            >
              Close
            </button>
          </div>

          <div className="sh-form-panel-body sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="visitor-name">
                Visitor name *
              </label>
              <input
                id="visitor-name"
                className="input"
                required
                placeholder="Guest full name"
                value={form.visitorName}
                onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="visitor-phone">
                Phone
              </label>
              <input
                id="visitor-phone"
                className="input"
                inputMode="tel"
                placeholder="98XXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="visitor-expected">
                Expected at
              </label>
              <input
                id="visitor-expected"
                className="input"
                type="datetime-local"
                value={form.expectedAt}
                onChange={(e) => setForm((f) => ({ ...f, expectedAt: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="visitor-purpose">
                Purpose
              </label>
              <div className="sh-chip-row mb-2">
                {["Family visit", "Delivery", "Service", "Guest stay"].map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    className={`sh-chip ${form.purpose === purpose ? "sh-chip-active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, purpose }))}
                  >
                    {purpose}
                  </button>
                ))}
              </div>
              <input
                id="visitor-purpose"
                className="input"
                placeholder="Or type another purpose"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>
          </div>

          <div className="sh-form-panel-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary px-5" disabled={busy} type="submit">
              {busy ? "Saving…" : "Save visitor"}
            </button>
          </div>
        </form>
      )}

      {issuedPass && (
        <div
          className="mb-4 overflow-hidden rounded-xl border border-[var(--saffron)]/35 bg-white shadow-[0_8px_28px_rgba(42,26,18,0.08)]"
          data-testid="visitor-pass-share"
        >
          <div
            className="px-4 py-3 text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(90deg, #2a1a12 0%, #8b1e3f 100%)",
            }}
          >
            Pass ready to share
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
            <img
              className="mx-auto rounded-lg border border-black/10 bg-white p-2"
              width={180}
              height={180}
              alt="Visitor pass QR"
              src={qrImageUrl(issuedPass.qrPayload)}
            />
            <div>
              <p className="text-sm text-black/55">
                Sent to{" "}
                <span className="font-medium text-[var(--ink)]">
                  {issuedPass.visitor.phone ?? "guest"}
                </span>
                . Show QR or OTP once; resend issues a new code.
              </p>
              <p className="mt-3 font-display text-4xl tracking-[0.2em] text-[var(--leaf-dark)]">
                {issuedPass.otp}
              </p>
              <p className="mt-1 text-xs text-black/40">Valid until {issuedPass.expiresAt}</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-3"
                onClick={() => setIssuedPass(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-[var(--danger)]/8 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--sand)] bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--leaf-dark)]">
            <Icon name="visitors" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">No visitors yet</p>
          <p className="mt-1 text-sm text-black/45">
            Expect a guest to create a digital pass for the gate.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => setShowForm(true)}
          >
            Expect a visitor
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--sand)]/80 bg-white shadow-[0_1px_2px_rgba(42,26,18,0.04)]">
          <div className="table-wrap !rounded-none !border-0">
            <table className="data-table" data-testid="visitors-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Flat</th>
                  <th>Status</th>
                  <th>Pass</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const status = visitStatus(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{
                              background:
                                "linear-gradient(145deg, var(--saffron) 0%, var(--leaf-dark) 100%)",
                            }}
                            aria-hidden
                          >
                            {visitorInitial(r.visitorName)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--ink)]">
                              {r.visitorName}
                            </div>
                            <div className="truncate text-xs text-black/45">
                              {r.purpose ?? "Visit"}
                              {r.phone ? ` · ${r.phone}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="font-medium">{r.flatNumber ?? "—"}</td>
                      <td>
                        <span className={`badge ${visitStatusClass(status)}`}>
                          {visitStatusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${passStatusClass(r.passStatus)}`}>
                          {passStatusLabel(r.passStatus)}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {!r.checkedOutAt && r.passStatus !== "used" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy || !r.phone}
                              onClick={() => void issuePass(r.id)}
                              title={!r.phone ? "Add a phone number to share a pass" : undefined}
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
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => checkIn(r.id)}
                            >
                              Check in
                            </button>
                          )}
                          {isAdmin && r.checkedInAt && !r.checkedOutAt && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => checkOut(r.id)}
                            >
                              Check out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
