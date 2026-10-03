import { useViewAs } from "../view-as";

export function ModeSelect() {
  const { viewAs, setViewAs } = useViewAs();
  const isAdmin = viewAs === "admin";

  return (
    <div
      className="mx-3 mb-3 rounded-lg border border-[var(--sand)] px-3 py-2"
      data-testid="manage-app-mode"
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-black/45">
            Viewing as
          </p>
          <p
            className="text-sm font-semibold text-[var(--ink)]"
            data-testid="manage-app-mode-label"
          >
            {isAdmin ? "Admin" : "Tenant"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isAdmin}
          data-testid="manage-app-mode-switch"
          className={[
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            isAdmin ? "bg-[var(--leaf)]" : "bg-black/20",
          ].join(" ")}
          onClick={() => setViewAs(isAdmin ? "tenant" : "admin")}
        >
          <span
            className={[
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              isAdmin ? "left-4" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
}
