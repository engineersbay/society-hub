import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { ActivityEventDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { ActivityTimeline } from "../components/ActivityTimeline";

export function AuditPage() {
  const { client, user } = useAuth();
  const [items, setItems] = useState<ActivityEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listPlatformActivity()
      .then(setItems)
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : "Failed to load activity");
      });
  }, [client]);

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;

  return (
    <div data-testid="manage-audit-page">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Audit log</h1>
        <p className="mt-1 text-sm text-black/55">
          Recent platform activity across societies — sign-ins, society changes,
          and ops events.
        </p>
      </div>
      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      <div className="card max-w-3xl p-5">
        <ActivityTimeline items={items} emptyLabel="No activity recorded yet." />
      </div>
    </div>
  );
}
