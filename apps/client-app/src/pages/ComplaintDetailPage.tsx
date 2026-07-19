import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ComplaintDto, ComplaintStatus } from "@society-hub/types";
import { useAuth } from "../auth";
import { canUseAdminMode, useAppMode } from "../app-mode";

const STATUSES: ComplaintStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { client, user } = useAuth();
  const { mode } = useAppMode();
  const showStaffControls = canUseAdminMode(user?.role) && mode === "admin";
  const [complaint, setComplaint] = useState<ComplaintDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    client
      .getComplaint(id)
      .then(setComplaint)
      .catch((err) => setError(err.message));
  }, [client, id]);

  async function updateStatus(status: ComplaintStatus) {
    if (!id) return;
    try {
      const updated = await client.updateComplaintStatus(id, status);
      setComplaint(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (error) return <p className="text-[var(--danger)]">{error}</p>;
  if (!complaint) return <p>Loading…</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/complaints" className="text-sm text-[var(--leaf)]">
        ← Back
      </Link>
      <h1 className="font-display mt-3 text-2xl">{complaint.title}</h1>
      <p className="mt-1 text-sm text-black/55">
        {complaint.ticketNumber} · Flat {complaint.flatNumber} · {complaint.type}
        {complaint.residentName ? ` · ${complaint.residentName}` : ""}
      </p>
      <p className="mt-4 whitespace-pre-wrap">{complaint.description}</p>

      <p className="mt-4 text-sm">
        Status:{" "}
        <strong className="uppercase tracking-wide">
          {complaint.status.replace("_", " ")}
        </strong>
      </p>

      {showStaffControls ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn text-sm ${
                complaint.status === s ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => updateStatus(s)}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      ) : null}

      {complaint.attachments.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold">Attachments</h2>
          <ul className="mt-2 space-y-2">
            {complaint.attachments.map((a) => (
              <li key={a.id}>
                <a
                  className="text-[var(--leaf)] underline"
                  href={`${a.url}?access_token=${localStorage.getItem("sh_access") ?? ""}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.contentKind} ({Math.round(a.byteSize / 1024)} KB)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
