import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { CommunicationListItemDto, CommunicationTimelineDto } from "@society-hub/types";
import { useAuth } from "../auth";

export function CommunicationsPage() {
  const { client, user } = useAuth();
  const [items, setItems] = useState<CommunicationListItemDto[]>([]);
  const [detail, setDetail] = useState<CommunicationTimelineDto | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load(ref = reference) {
    client
      .listCommunications({ reference: ref || undefined, limit: 20 })
      .then((page) => {
        setItems(page.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }

  useEffect(() => {
    load("");
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;

  return (
    <div data-testid="manage-communications-page">
      <h1 className="font-display text-2xl">Communications</h1>
      <p className="mt-1 text-sm text-black/55">
        WhatsApp messages for this login’s society. Phone numbers are masked.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <input
          className="input"
          placeholder="SH-MSG-…"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="empty-state">No messages.</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="card w-full px-4 py-3 text-left"
                onClick={() => {
                  client.getCommunication(item.id).then(setDetail).catch(() => setDetail(null));
                }}
              >
                <p className="font-medium">
                  {item.communicationReference} · {item.status}
                </p>
                <p className="text-sm text-black/55">
                  {item.templateKey} · {item.provider} · {item.recipientMasked}
                  {item.providerMessageId ? ` · ${item.providerMessageId}` : ""}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
      {detail && (
        <ol className="card mt-4 space-y-2 p-4 text-sm">
          {detail.events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              {event.at} · {event.kind} · {event.status}
              {event.detail ? ` · ${event.detail}` : ""}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
