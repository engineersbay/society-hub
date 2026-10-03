import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { SocietyHubLogo } from "@society-hub/ui";
import { useAuth } from "../auth";
import { ADMIN_NAV, TENANT_NAV, type ManageNavItem } from "../manage-nav";
import {
  shouldRedirectAdminToTenantMode,
  shouldRedirectMissingSocietyToPicker,
  shouldRedirectTenantToAdminMode,
  shouldShowSocietySwitcher,
} from "../manage-app-mode-guards";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";
import { Icon } from "./icons";
import { ModeSelect } from "./ModeSelect";
import { SocietySwitcher } from "./SocietySwitcher";

const APP_ORIGIN =
  import.meta.env.VITE_APP_ORIGIN ??
  import.meta.env.VITE_WEB_URL ??
  "http://app.localhost:5173";
const ROOT_DOMAIN = import.meta.env.VITE_SOCIETYHUB_ROOT_DOMAIN ?? "localhost:5173";

function clientAppUrl(slug: string | null | undefined, customDomain: string | null | undefined) {
  if (customDomain) {
    const host = customDomain.includes("://") ? customDomain : `https://${customDomain}`;
    return host.replace(/\/$/, "");
  }
  if (slug) {
    const protocol = ROOT_DOMAIN.includes("localhost") ? "http" : "https";
    return `${protocol}://${slug}.${ROOT_DOMAIN}`;
  }
  return APP_ORIGIN;
}

function NavRow({ item, onNavigate }: { item: ManageNavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      data-testid={`nav-${item.to.slice(1).replace(/\//g, "-")}`}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "border-r-4 border-[var(--leaf)] bg-[var(--mist)] text-[var(--leaf-dark)]"
            : "text-[var(--ink)]/75 hover:bg-[var(--mist)]/70 hover:text-[var(--leaf-dark)]",
        ].join(" ")
      }
    >
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status === "soon" && (
        <span className="shrink-0 rounded-full bg-[var(--sand)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/45">
          Soon
        </span>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, clearSession } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety } = useSelectedSociety();
  const nav = viewAs === "admin" ? ADMIN_NAV : TENANT_NAV;
  const showSocietyChrome = shouldShowSocietySwitcher(viewAs);
  const portalHref = clientAppUrl(
    (selectedSociety as { slug?: string | null } | null)?.slug ?? null,
    (selectedSociety as { customDomain?: string | null } | null)?.customDomain ?? null,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-3 pt-5">
        <SocietyHubLogo size={40} className="shrink-0" />
        <div>
          <p className="font-display text-lg leading-tight text-[var(--leaf-dark)]">SocietyHub</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
            Manage
          </p>
        </div>
      </div>

      {showSocietyChrome && <SocietySwitcher />}

      {showSocietyChrome && (
        <div className="px-3 pb-3">
          <a
            href={portalHref}
            target="_blank"
            rel="noreferrer"
            data-testid="open-client-app"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Icon name="externalLink" className="h-4 w-4" />
            Open Client App
          </a>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavRow key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-[var(--sand)] pt-2">
        <ModeSelect />
        <div className="border-t border-[var(--sand)] px-3 py-3 lg:hidden">
          <NavRow
            item={{
              to: "/account",
              label: "Account",
              icon: "account",
              status: "live",
              blurb: "Your platform account",
            }}
            onNavigate={onNavigate}
          />
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
        {user?.name && (
          <p className="truncate px-4 pb-4 text-xs text-black/40">
            {user.name} · {user.role}
          </p>
        )}
      </div>
    </div>
  );
}

function ViewGuards({ children }: { children: React.ReactNode }) {
  const { viewAs } = useViewAs();
  const { selectedSocietyId, loading } = useSelectedSociety();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const path = location.pathname;
    // Tenant with no society may stay on the Societies list to pick one.
    if (shouldRedirectMissingSocietyToPicker(viewAs, selectedSocietyId)) {
      if (path !== "/societies") {
        navigate("/societies", { replace: true });
      }
      return;
    }
    if (shouldRedirectAdminToTenantMode(viewAs, path)) {
      navigate("/society", { replace: true });
      return;
    }
    if (shouldRedirectTenantToAdminMode(viewAs, path)) {
      navigate("/dashboard", { replace: true });
    }
  }, [viewAs, location.pathname, selectedSocietyId, loading, navigate]);

  return children;
}

export function Shell() {
  const { user, clearSession } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { selectedSocietyId, setSelectedSocietyId } = useSelectedSociety();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep picker in sync with /societies/:id
  useEffect(() => {
    const match = location.pathname.match(/^\/societies\/([^/]+)/);
    if (match?.[1] && match[1] !== selectedSocietyId) {
      setSelectedSocietyId(match[1]);
    }
  }, [location.pathname, selectedSocietyId, setSelectedSocietyId]);

  // When picker changes while on society detail, navigate
  useEffect(() => {
    const match = location.pathname.match(/^\/societies\/([^/]+)/);
    if (match?.[1] && selectedSocietyId && match[1] !== selectedSocietyId) {
      navigate(`/societies/${selectedSocietyId}`, { replace: true });
    }
    if (location.pathname === "/structure" && selectedSocietyId) {
      // structure is an alias into society detail
    }
  }, [selectedSocietyId, location.pathname, navigate]);

  return (
    <ViewGuards>
      <div className="flex h-screen overflow-hidden">
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

        <div className="flex h-screen min-w-0 flex-1 flex-col">
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

          <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 lg:px-8 lg:py-5">
            <Outlet />
          </main>
        </div>
      </div>
    </ViewGuards>
  );
}
