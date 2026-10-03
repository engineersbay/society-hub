import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";

export function TenantSocietyDashboard() {
  const { user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId } = useSelectedSociety();

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;

  return (
    <div data-testid="tenant-society-dashboard">
      <h1 className="font-display text-2xl">{selectedSociety?.name ?? "Society"}</h1>
      <p className="mt-1 text-sm text-black/55">
        Tenant workspace for structure, feature flags, branding, domain, and platform fee.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="card block p-4 hover:-translate-y-0.5 transition-transform" to="/structure">
          <p className="font-semibold">Structure</p>
          <p className="mt-1 text-sm text-black/55">Towers, flats, parking, team</p>
        </Link>
        <Link className="card block p-4 hover:-translate-y-0.5 transition-transform" to="/feature-flags">
          <p className="font-semibold">Feature flags</p>
          <p className="mt-1 text-sm text-black/55">Modules for the Client App</p>
        </Link>
        <Link className="card block p-4 hover:-translate-y-0.5 transition-transform" to="/branding">
          <p className="font-semibold">Branding</p>
          <p className="mt-1 text-sm text-black/55">Logo and brand color</p>
        </Link>
        <Link className="card block p-4 hover:-translate-y-0.5 transition-transform" to="/society-settings">
          <p className="font-semibold">Society settings</p>
          <p className="mt-1 text-sm text-black/55">Details, billing, and access</p>
        </Link>
      </div>
    </div>
  );
}

export function StructureRedirect() {
  const { selectedSocietyId } = useSelectedSociety();
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;
  return <Navigate to={`/societies/${selectedSocietyId}`} replace />;
}
