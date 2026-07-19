import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { PlatformUserDto } from "@society-hub/types";
import { useAuth } from "../auth";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function UsersPage() {
  const { client, user } = useAuth();
  const [items, setItems] = useState<PlatformUserDto[] | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    client
      .listPlatformUsers(search || undefined)
      .then(setItems)
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : "Failed to load users");
      });
  }, [client, search]);

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
  }

  return (
    <div data-testid="manage-users-page">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Users</h1>
          <p className="mt-1 text-sm text-black/55">
            Platform directory — search members and open their activity history.
          </p>
        </div>
      </div>

      <form
        className="mb-5 flex flex-wrap gap-2"
        onSubmit={onSearch}
        data-testid="users-search-form"
      >
        <input
          className="input max-w-md flex-1"
          data-testid="users-search-input"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary text-sm" type="submit">
          Search
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="users-empty">
          No users found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-[var(--sand)] text-xs uppercase tracking-wide text-black/45">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--sand)]/70 last:border-0"
                  data-testid="users-row"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/users/${u.id}`}
                      className="font-medium text-[var(--leaf-dark)] hover:underline"
                      data-testid="users-row-link"
                    >
                      {u.name ?? u.email ?? u.phone ?? u.id.slice(0, 8)}
                    </Link>
                    <p className="mt-0.5 text-xs text-black/45">
                      {[u.email, u.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {u.memberships.length === 0 ? (
                      <span className="text-black/40">No roles</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {u.memberships.slice(0, 3).map((m) => (
                          <li key={`${m.tenantId}-${m.role}`} className="text-xs">
                            <span className="badge mr-1">{m.role}</span>
                            {m.societyName}
                          </li>
                        ))}
                        {u.memberships.length > 3 && (
                          <li className="text-xs text-black/40">
                            +{u.memberships.length - 3} more
                          </li>
                        )}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-black/55">
                    {formatWhen(u.lastActivityAt)}
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
