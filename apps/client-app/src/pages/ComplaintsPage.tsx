import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ComplaintDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { Icon } from "../components/icons";

function statusBadgeClass(status: ComplaintDto["status"]) {
  if (status === "resolved" || status === "closed") return "badge badge-success";
  if (status === "open") return "badge badge-danger";
  return "badge";
}

export function ComplaintsPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<ComplaintDto[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listComplaints()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }, [client]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) => c.title.toLowerCase().includes(q) || c.ticketNumber.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Complaints</h1>
          <p className="text-sm text-black/55">Your raised complaints</p>
        </div>
        <Link to="/complaints/new" className="btn btn-primary" data-testid="new-complaint-link">
          Raise complaint
        </Link>
      </div>

      <div className="relative mb-4">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
        />
        <input
          className="input pl-9"
          placeholder="Search your complaints…"
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
                </p>
              </div>
              <span className={statusBadgeClass(c.status)}>{c.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
