import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ComplaintDto } from "@society-hub/types";
import { useAuth } from "../auth";

export function ComplaintsPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<ComplaintDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listComplaints()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err.message));
  }, [client]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Complaints</h1>
          <p className="text-sm text-black/55">Your raised complaints</p>
        </div>
        <Link to="/complaints/new" className="btn btn-primary">
          Raise complaint
        </Link>
      </div>

      {error && <p className="text-[var(--danger)]">{error}</p>}

      <ul className="divide-y divide-[var(--sand)] border-y border-[var(--sand)]">
        {items.length === 0 && (
          <li className="py-8 text-sm text-black/50">No complaints yet.</li>
        )}
        {items.map((c) => (
          <li key={c.id}>
            <Link
              to={`/complaints/${c.id}`}
              className="flex flex-wrap items-baseline justify-between gap-2 py-4 hover:bg-[var(--mist)]/40"
            >
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-black/50">
                  {c.ticketNumber} · Flat {c.flatNumber} · {c.type}
                </p>
              </div>
              <span className="rounded bg-[var(--mist)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--leaf-dark)]">
                {c.status.replace("_", " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
