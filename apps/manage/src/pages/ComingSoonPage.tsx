import { Link, useLocation } from "react-router-dom";
import { manageNavByPath } from "../manage-nav";
import { Icon } from "../components/icons";

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const item = manageNavByPath(pathname);

  const title = item?.label ?? "Coming soon";
  const blurb =
    item?.blurb ??
    "This platform capability is on the roadmap and is not wired to APIs yet.";

  return (
    <div data-testid="coming-soon-page">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl">{title}</h1>
        <span
          className="rounded-full bg-[var(--sand)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/55"
          data-testid="coming-soon-badge"
        >
          Coming soon
        </span>
      </div>
      <p className="max-w-2xl text-sm text-black/55">{blurb}</p>

      <div className="card mt-8 max-w-xl p-6">
        <p className="text-sm text-black/70">
          Nothing here submits data yet. Live Manage actions today are{" "}
          <strong>create societies</strong> and <strong>add society team members</strong>.
          Day-to-day society ops continue in the Client App.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/dashboard" className="btn btn-ghost text-sm">
            Back to Dashboard
          </Link>
          <Link to="/societies" className="btn btn-primary text-sm">
            Open Societies
          </Link>
        </div>
      </div>

      {item && (
        <p className="mt-6 flex items-center gap-2 text-xs text-black/40">
          <Icon name={item.icon} className="h-4 w-4" />
          Planned for a later platform release
        </p>
      )}
    </div>
  );
}
