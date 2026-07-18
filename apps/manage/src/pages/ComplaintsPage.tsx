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
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.ticketNumber.toLowerCase().includes(q) ||
        c.flatNumber.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Complaints</h1>
          <p className="text-sm text-black/55">All society complaints — update status from detail</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
          />
          <input
            className="input pl-9"
            placeholder="Search ticket, title or flat…"
            data-testid="complaints-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="mb-4 text-[var(--danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <div className="empty-state">No complaints match.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="complaints-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Title</th>
                <th>Flat</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to={`/complaints/${c.id}`}
                      className="font-medium text-[var(--leaf-dark)] hover:underline"
                    >
                      {c.ticketNumber}
                    </Link>
                  </td>
                  <td>{c.title}</td>
                  <td>{c.flatNumber}</td>
                  <td className="capitalize">{c.type}</td>
                  <td>
                    <span className={statusBadgeClass(c.status)}>
                      {c.status.replace("_", " ")}
                    </span>
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
