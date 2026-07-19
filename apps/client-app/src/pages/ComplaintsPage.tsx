import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ComplaintDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { canUseAdminMode, useAppMode } from "../app-mode";
import { Icon } from "../components/icons";
import { STATUS_LABELS, statusBadgeClass } from "@society-hub/ui";

export function ComplaintsPage() {
  const { client, user } = useAuth();
  const { mode } = useAppMode();
  const staffView = canUseAdminMode(user?.role) && mode === "admin";
  const [items, setItems] = useState<ComplaintDto[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listComplaints(1, 20, { mine: !staffView })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }, [client, staffView]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.ticketNumber.toLowerCase().includes(q) ||
        (staffView && c.flatNumber.toLowerCase().includes(q)),
    );
  }, [items, search, staffView]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">
            {staffView ? "Complaint queue" : "My complaints"}
          </h1>
          <p className="text-sm text-black/55">
            {staffView
              ? "Acknowledge when you can — leave untouched tickets in the queue."
              : "Track ticket numbers and progress"}
          </p>
        </div>
        <Link to="/complaints/new" className="btn btn-primary" data-testid="new-complaint-link">
          Raise complaint
        </Link>
      </div>

      <div className="relative mb-3">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
        />
        <input
          className="input pl-9"
          placeholder={staffView ? "Search ticket, title or flat…" : "Search your tickets…"}
          data-testid="complaints-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="mb-4 text-[var(--danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <div className="empty-state" data-testid="complaints-empty">
          No complaints yet.
        </div>
      ) : (
        <div className="space-y-3" data-testid="complaints-list">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/complaints/${c.id}`}
              className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:border-[var(--leaf)]"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-black/50">
                  {c.ticketNumber} · {c.type}
                  {staffView ? ` · Flat ${c.flatNumber}` : ""}
                  {c.queuePosition != null && c.status === "open"
                    ? ` · Queue #${c.queuePosition}`
                    : ""}
                </p>
              </div>
              <span className={statusBadgeClass(c.status)}>{STATUS_LABELS[c.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
