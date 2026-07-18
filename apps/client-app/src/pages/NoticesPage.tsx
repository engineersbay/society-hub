import { useEffect, useState } from "react";
import type { NoticeDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function NoticesPage() {
  const { client } = useAuth();
  const [items, setItems] = useState<NoticeDto[] | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listNotices()
      .then((rows) => setItems(rows.filter((n) => n.publishedAt && !n.unpublishedAt)))
      .catch((err) => {
        setItems([]);
        if (err instanceof ApiClientError && err.status === 404) setNotReady(true);
        else setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [client]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">Notices</h1>
        <p className="mt-1 text-sm text-black/55">Announcements from your society.</p>
      </div>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
      {notReady && (
        <p className="mb-4 text-sm text-[var(--alert)]">
          Notices aren't live yet — this screen will populate automatically once they are.
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-black/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="notices-empty">No notices right now.</div>
      ) : (
        <div className="space-y-3" data-testid="notices-list">
          {items.map((n) => (
            <div key={n.id} className="card p-5">
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-black/65">{n.body}</p>
              <p className="mt-2 text-xs text-black/35">
                {n.publishedAt ? new Date(n.publishedAt).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
