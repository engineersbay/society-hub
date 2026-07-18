import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { Icon, type IconName } from "./icons";
import { SocietySwitcher } from "./SocietySwitcher";

type NavItem = { to: string; label: string; icon: IconName; superadminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { to: "/complaints", label: "Complaints", icon: "complaints" },
      { to: "/onboard", label: "Onboard resident", icon: "onboard" },
      { to: "/invites", label: "Invites", icon: "invites" },
      { to: "/team", label: "Team", icon: "team" },
    ],
  },
  {
    title: "Society",
    items: [{ to: "/societies", label: "Societies", icon: "societies", superadminOnly: true }],
  },
  {
    title: "Finance",
    items: [
      { to: "/bills", label: "Bills", icon: "bills" },
      { to: "/payments", label: "Payments", icon: "payments" },
    ],
  },
  {
    title: "Communication",
    items: [
      { to: "/notices", label: "Notices", icon: "notices" },
      { to: "/notifications", label: "Notifications", icon: "bell" },
    ],
  },
  {
    title: "Community",
    items: [
      { to: "/visitors", label: "Visitors", icon: "visitors" },
      { to: "/parking", label: "Parking", icon: "parking" },
      { to: "/bookings", label: "Bookings", icon: "bookings" },
      { to: "/assets", label: "Assets", icon: "assets" },
      { to: "/vendors", label: "Vendors", icon: "vendors" },
      { to: "/events", label: "Events", icon: "events" },
    ],
  },
  {
    title: "System",
    items: [{ to: "/audit", label: "Audit log", icon: "audit" }],
  },
];

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:5173";

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-[var(--mist)] text-[var(--leaf-dark)]"
            : "text-[var(--ink)]/75 hover:bg-[var(--mist)]/70 hover:text-[var(--leaf-dark)]",
        ].join(" ")
      }
    >
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, clearSession } = useAuth();
  const isSuperadmin = user?.role === "superadmin";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-4 pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--leaf-dark)] text-sm font-bold text-white">
          SH
        </div>
        <div>
          <p className="font-display text-lg leading-tight text-[var(--leaf-dark)]">SocietyHub</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
            Manage
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <SocietySwitcher />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section) => {
          const items = section.items.filter((i) => !i.superadminOnly || isSuperadmin);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black/35">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavRow key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sand)] px-3 py-3 lg:hidden">
        <NavRow item={{ to: "/account", label: "Account", icon: "account" }} onNavigate={onNavigate} />
        <button
          type="button"
          data-testid="logout-button-mobile"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--ink)]/75 hover:bg-[var(--mist)]/70 hover:text-[var(--leaf-dark)]"
          onClick={clearSession}
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>

      <div className="border-t border-[var(--sand)] px-4 py-4">
        <a
          href={WEB_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--leaf)] hover:bg-[var(--mist)]/70"
        >
          <Icon name="externalLink" className="h-4 w-4" />
          Open App
        </a>
        {user?.name && (
          <p className="mt-2 truncate px-3 text-xs text-black/40">
            {user.name} · {user.role}
          </p>
        )}
      </div>
    </div>
  );
}

export function Shell() {
  const { user, clearSession } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--sand)] bg-[#fffdfb] lg:block">
        <div className="fixed h-screen w-64">
          <SidebarContent />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[#fffdfb] shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--sand)] bg-[#fffdfb]/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            data-testid="mobile-menu-button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sand)]"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <p className="font-display text-lg text-[var(--leaf-dark)]">SocietyHub Manage</p>
          <NavLink
            to="/account"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--leaf-dark)]"
          >
            <Icon name="account" className="h-5 w-5" />
          </NavLink>
        </header>

        <header className="hidden items-center justify-between border-b border-[var(--sand)] px-8 py-4 lg:flex">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-black/55">
              {user?.name} · <span className="capitalize">{user?.role}</span>
            </span>
            <NavLink to="/account" className="btn btn-ghost btn-sm">
              Account
            </NavLink>
            <button
              type="button"
              data-testid="logout-button"
              className="btn btn-ghost btn-sm"
              onClick={clearSession}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
