import { useEffect, useState } from "react";
import type { TeamMemberDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function TeamPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<TeamMemberDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listTeam()
      .then((rows) => setItems(rows))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [client]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Team</h1>
        <p className="mt-1 text-sm text-black/55">Admins and Super Admins with access to this society.</p>
      </div>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Team API isn't live yet — this screen will populate automatically once it is.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="team-empty">No team members yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.userId}>
                  <td>{m.name ?? "—"}</td>
                  <td>{m.email ?? "—"}</td>
                  <td>{m.phone ?? "—"}</td>
                  <td>
                    <span className="badge">{m.role}</span>
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
