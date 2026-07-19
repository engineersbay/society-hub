import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ComplaintDto, DashboardStatsDto } from "@society-hub/types";
import { useAuth } from "../auth";

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function DashboardPage() {
  const { client, user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [recent, setRecent] = useState<ComplaintDto[]>([]);

  useEffect(() => {
    client.getDashboardStats().then(setStats).catch(() => undefined);
    client
      .listComplaints(1, 4)
      .then((res) => setRecent(res.items))
      .catch(() => undefined);
  }, [client]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">
          Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-black/55">
          {user?.flatNumber ? `Flat ${user.flatNumber}` : "Welcome to SocietyHub"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/bills" className="kpi-card block transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Dues outstanding</p>
          <p className="mt-2 font-display text-3xl text-[var(--leaf-dark)]">
            {stats ? rupees(stats.duesOutstandingPaise) : "—"}
          </p>
        </Link>
        <Link to="/complaints" className="kpi-card block transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Open complaints</p>
          <p className="mt-2 font-display text-3xl text-[var(--leaf-dark)]">
            {stats?.openComplaints ?? "—"}
          </p>
        </Link>
        <Link to="/notices" className="kpi-card block transition-transform hover:-translate-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Notices</p>
          <p className="mt-2 font-display text-3xl text-[var(--leaf-dark)]">
            {stats?.publishedNotices ?? "—"}
          </p>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Your recent complaints</h2>
            <Link to="/complaints" className="text-sm text-[var(--leaf)]">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-black/50">No complaints yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--sand)]">
              {recent.map((c) => (
                <li key={c.id} className="py-3">
                  <Link to={`/complaints/${c.id}`} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.title}</span>
                    <span className="badge shrink-0">{c.status.replace("_", " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/complaints/new" className="btn btn-primary mt-4 w-full text-sm">
            Raise a complaint
          </Link>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/bills" className="btn btn-ghost text-sm">Pay dues</Link>
            <Link to="/bookings" className="btn btn-ghost text-sm">Book clubhouse</Link>
            <Link to="/visitors" className="btn btn-ghost text-sm">Expect visitor</Link>
            <Link to="/parking" className="btn btn-ghost text-sm">Parking</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
