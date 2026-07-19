import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { ComplaintDto, ComplaintStatus } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { canUseAdminMode, useAppMode } from "../app-mode";
import { STATUS_LABELS, TYPE_LABELS, statusBadgeClass } from "../lib/complaint-labels";

function accessToken() {
  return localStorage.getItem("sh_web_access") ?? "";
}

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const justCreated = Boolean(
    (location.state as { justCreated?: boolean } | null)?.justCreated,
  );
  const { client, user } = useAuth();
  const { mode } = useAppMode();
  const showStaffControls = canUseAdminMode(user?.role) && mode === "admin";
  const [complaint, setComplaint] = useState<ComplaintDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    client
      .getComplaint(id)
      .then(setComplaint)
      .catch((err) => setError(err.message));
  }, [client, id]);

  async function applyStatus(status: ComplaintStatus) {
    if (!id || !complaint) return;
    if ((status === "resolved" || status === "closed") && note.trim().length < 3) {
      setError("Add a short closing comment before resolving or closing.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const file of evidence) {
        await client.uploadAttachment(id, file);
      }
      const updated = await client.updateComplaintStatus(id, status, {
        note: note.trim() || null,
      });
      setComplaint(updated);
      setNote("");
      setEvidence([]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onEvidenceChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    setEvidence(Array.from(input.files ?? []));
  }

  if (error && !complaint) return <p className="text-[var(--danger)]">{error}</p>;
  if (!complaint) return <p>Loading…</p>;

  const typeLabel =
    complaint.type === "other" && complaint.typeOtherText
      ? complaint.typeOtherText
      : TYPE_LABELS[complaint.type];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/complaints" className="text-sm text-[var(--leaf)]">
        ← Back to complaints
      </Link>

      {justCreated && (
        <div
          className="rounded-xl border border-[var(--leaf)]/30 bg-[var(--mist)]/40 p-4"
          data-testid="complaint-created-banner"
        >
          <p className="font-display text-lg text-[var(--leaf-dark)]">Complaint submitted</p>
          <p className="mt-1 text-sm text-black/70">
            Your ticket number is{" "}
            <strong data-testid="complaint-ticket-number">{complaint.ticketNumber}</strong>.
            The society office was notified by email and WhatsApp.
          </p>
          {complaint.queueHint && (
            <p className="mt-2 text-sm text-black/60" data-testid="complaint-queue-hint">
              {complaint.queueHint}
              {complaint.queuePosition != null
                ? ` (position #${complaint.queuePosition})`
                : ""}
            </p>
          )}
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl">{complaint.title}</h1>
          <span className={statusBadgeClass(complaint.status)}>
            {STATUS_LABELS[complaint.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-black/55">
          {complaint.ticketNumber} · Flat {complaint.flatNumber} · {typeLabel}
          {complaint.residentName ? ` · ${complaint.residentName}` : ""}
        </p>
      </div>

      {!showStaffControls && complaint.queueHint && complaint.status === "open" && (
        <p className="rounded-lg bg-[var(--mist)]/50 px-3 py-2 text-sm text-black/65">
          {complaint.queueHint} Admins may acknowledge when ready — your ticket stays safe in the
          queue until then.
        </p>
      )}

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{complaint.description}</p>

      {complaint.closingNote && (
        <div className="rounded-lg border border-[var(--sand)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Closing note from office
          </p>
          <p className="mt-1 text-sm" data-testid="complaint-closing-note">
            {complaint.closingNote}
          </p>
        </div>
      )}

      {complaint.attachments.length > 0 && (
        <section>
          <h2 className="font-semibold">Photos & evidence</h2>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {complaint.attachments.map((a) => (
              <li key={a.id}>
                <a
                  className="block overflow-hidden rounded-lg border border-[var(--sand)]"
                  href={`${a.url}?access_token=${accessToken()}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.contentKind === "image" ? (
                    <img
                      src={`${a.url}?access_token=${accessToken()}`}
                      alt=""
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <p className="p-3 text-xs text-[var(--leaf)]">
                      Video · {Math.round(a.byteSize / 1024)} KB
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {complaint.statusEvents.length > 0 && (
        <section>
          <h2 className="font-semibold">Activity</h2>
          <ol className="mt-2 space-y-2 border-l border-[var(--sand)] pl-4">
            {complaint.statusEvents.map((ev) => (
              <li key={ev.id} className="text-sm">
                <p className="font-medium text-[var(--leaf-dark)]">
                  {STATUS_LABELS[ev.toStatus]}
                  {ev.actorName ? ` · ${ev.actorName}` : ""}
                </p>
                {ev.note && <p className="text-black/60">{ev.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {showStaffControls && (
        <section
          className="rounded-xl border border-[var(--sand)] bg-[#fffdfb] p-4"
          data-testid="complaint-staff-actions"
        >
          <h2 className="font-semibold">Office actions</h2>
          <p className="mt-1 text-sm text-black/55">
            Leave it in queue if you are busy. Acknowledge when you have seen it. Start when work
            begins. Resolve/close with a short note and optional evidence photos.
          </p>

          <div className="mt-3">
            <label className="label" htmlFor="staff-note">
              Note / closing comment
            </label>
            <textarea
              id="staff-note"
              data-testid="complaint-staff-note"
              className="input min-h-20"
              placeholder="Required when resolving or closing"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="staff-evidence">
              Evidence photos (optional)
            </label>
            <input
              id="staff-evidence"
              data-testid="complaint-staff-evidence"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={onEvidenceChange}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {complaint.status === "open" && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                data-testid="complaint-ack"
                onClick={() => void applyStatus("assigned")}
              >
                Acknowledge
              </button>
            )}
            {(complaint.status === "open" || complaint.status === "assigned") && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                data-testid="complaint-start"
                onClick={() => void applyStatus("in_progress")}
              >
                Start work
              </button>
            )}
            {complaint.status !== "resolved" && complaint.status !== "closed" && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                data-testid="complaint-resolve"
                onClick={() => void applyStatus("resolved")}
              >
                Mark resolved
              </button>
            )}
            {complaint.status !== "closed" && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                data-testid="complaint-close"
                onClick={() => void applyStatus("closed")}
              >
                Close ticket
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        </section>
      )}
    </div>
  );
}
