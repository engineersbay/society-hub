import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/complaints", label: "Complaints", live: true },
  { to: "/bills", label: "Bills", live: false },
  { to: "/payments", label: "Payments", live: false },
  { to: "/notices", label: "Notices", live: false },
  { to: "/dashboard", label: "Dashboard", live: false },
];

export function Shell() {
  const { user, clearSession } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl tracking-tight text-[var(--leaf-dark)]">
            SocietyHub
          </p>
          <p className="mt-1 text-sm text-black/60">
            {user?.name} · {user?.role}
            {user?.flatNumber ? ` · Flat ${user.flatNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === "admin" || user?.role === "superadmin" ? (
            <NavLink to="/onboard" className="btn btn-ghost text-sm">
              Onboard
            </NavLink>
          ) : null}
          <NavLink to="/account" className="btn btn-ghost text-sm">
            Account
          </NavLink>
          <button type="button" className="btn btn-ghost text-sm" onClick={clearSession}>
            Log out
          </button>
        </div>
      </header>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--sand)] pb-px">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              [
                "whitespace-nowrap px-3 py-2 text-sm font-medium",
                isActive
                  ? "border-b-2 border-[var(--saffron)] text-[var(--leaf-dark)]"
                  : "text-black/55 hover:text-black",
              ].join(" ")
            }
          >
            {l.label}
            {!l.live && (
              <span className="ml-1 text-[10px] uppercase tracking-wide text-black/40">
                soon
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
