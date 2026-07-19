import type { ActivityEventDto } from "@society-hub/types";

function formatWhen(iso: string) {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ActivityTimeline({
  items,
  emptyLabel = "No activity yet.",
}: {
  items: ActivityEventDto[] | null;
  emptyLabel?: string;
}) {
  if (items === null) {
    return <p className="text-sm text-black/50">Loading activity…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-black/50">{emptyLabel}</p>;
  }

  return (
    <ol className="space-y-0" data-testid="activity-timeline">
      {items.map((ev) => (
        <li
          key={ev.id}
          className="relative border-l border-[var(--sand)] pl-4 pb-5 last:pb-0"
          data-testid="activity-item"
        >
          <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-[var(--leaf)] bg-white" />
          <p className="text-sm font-medium text-[var(--ink)]">
            {ev.message ?? ev.action}
          </p>
          <p className="mt-1 text-xs text-black/45">
            {formatWhen(ev.createdAt)}
            {ev.actorName ? ` · ${ev.actorName}` : ""}
            {ev.societyName ? ` · ${ev.societyName}` : ""}
            <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-black/35">
              {ev.action}
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}
