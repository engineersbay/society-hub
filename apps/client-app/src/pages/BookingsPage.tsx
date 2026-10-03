import { FormEvent, useEffect, useState } from "react";
import type { BookingDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useAppMode } from "../app-mode";
import { Icon } from "../components/icons";

const FACILITY_SUGGESTIONS = [
  "Clubhouse hall",
  "Party lawn",
  "Community hall",
  "Terrace",
] as const;

function statusClass(status: string) {
  if (status === "confirmed") return "badge-success";
  if (status === "cancelled") return "badge-danger";
  return "badge-progress";
}

export function BookingsPage() {
  const { client } = useAuth();
  const { mode } = useAppMode();
  const isAdmin = mode === "admin";
  const [items, setItems] = useState<BookingDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ facilityName: "", startAt: "", endAt: "" });

  function load() {
    client
      .listBookings()
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
      await client.createBooking(form);
      setForm({ facilityName: "", startAt: "", endAt: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to book");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "confirmed" | "cancelled") {
    try {
      await client.updateBookingStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Update failed");
    }
  }

  const pendingCount = items?.filter((r) => r.status === "pending").length ?? 0;
  const confirmedCount = items?.filter((r) => r.status === "confirmed").length ?? 0;

  return (
    <div data-testid="bookings-page">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
            {isAdmin ? "Admin view · facilities" : "Resident view · amenities"}
          </p>
          <h1 className="mt-1 font-display text-2xl text-[var(--leaf-dark)] sm:text-3xl">
            Clubhouse bookings
          </h1>
          <p className="mt-1 max-w-xl text-sm text-black/50">
            {isAdmin
              ? "Confirm or cancel facility requests from residents."
              : "Request a slot for the clubhouse or other amenities. Staff will confirm."}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn-primary shrink-0 px-5 py-2.5 text-sm"
            onClick={() => setShowForm(true)}
          >
            New booking
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
              Pending
            </p>
            <p className="mt-1 font-display text-2xl text-[var(--leaf)]">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--sand)]/70 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Confirmed
            </p>
            <p className="mt-1 font-display text-2xl text-[var(--leaf-dark)]">{confirmedCount}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form className="sh-form-panel mb-5" onSubmit={submit}>
          <div className="sh-form-panel-head">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mist)] text-[var(--leaf-dark)]">
                <Icon name="bookings" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Request a slot</p>
                <p className="text-xs text-black/45">Staff confirm before the booking is final</p>
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

          <div className="sh-form-panel-body">
            <div>
              <label className="label" htmlFor="booking-facility">
                Facility *
              </label>
              <div className="sh-chip-row mb-2">
                {FACILITY_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`sh-chip ${form.facilityName === name ? "sh-chip-active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, facilityName: name }))}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <input
                id="booking-facility"
                className="input"
                required
                placeholder="Or type another facility"
                value={form.facilityName}
                onChange={(e) => setForm((f) => ({ ...f, facilityName: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="booking-start">
                  Starts *
                </label>
                <input
                  id="booking-start"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="booking-end">
                  Ends *
                </label>
                <input
                  id="booking-end"
                  className="input"
                  type="datetime-local"
                  required
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="sh-form-panel-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary px-5" disabled={busy} type="submit">
              {busy ? "Sending…" : "Request booking"}
            </button>
          </div>
        </form>
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
            <Icon name="bookings" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">No bookings yet</p>
          <p className="mt-1 text-sm text-black/45">
            Request a clubhouse or amenity slot to get started.
          </p>
          {!showForm && (
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => setShowForm(true)}
            >
              New booking
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--sand)]/80 bg-white shadow-[0_1px_2px_rgba(42,26,18,0.04)]">
          <div className="table-wrap !rounded-none !border-0">
            <table className="data-table" data-testid="bookings-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>When</th>
                  <th>Status</th>
                  {isAdmin && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold text-[var(--ink)]">{r.facilityName}</div>
                    </td>
                    <td className="text-sm text-black/65">
                      <div>{new Date(r.startAt).toLocaleString()}</div>
                      <div className="text-xs text-black/40">
                        to {new Date(r.endAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusClass(r.status)}`}>{r.status}</span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {r.status === "pending" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setStatus(r.id, "confirmed")}
                            >
                              Confirm
                            </button>
                          )}
                          {r.status !== "cancelled" && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setStatus(r.id, "cancelled")}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
