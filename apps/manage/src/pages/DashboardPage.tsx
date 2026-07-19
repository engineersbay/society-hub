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
      .listComplaints(1, 5)
      .then((res) => setRecent(res.items))
      .catch(() => undefined);
  }, [client]);

  const cards = [
    { label: "Open complaints", value: stats?.openComplaints ?? "—", to: "/complaints" },
    { label: "Total complaints", value: stats?.totalComplaints ?? "—", to: "/complaints" },
    {
      label: "Dues outstanding",
      value: stats ? rupees(stats.duesOutstandingPaise) : "—",
      to: "/bills",
    },
    { label: "Upcoming bookings", value: stats?.upcomingBookings ?? "—", to: "/bookings" },
    { label: "Published notices", value: stats?.publishedNotices ?? "—", to: "/notices" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-black/55">A quick look at operations and finance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="kpi-card block transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/45">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-[var(--leaf-dark)]">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent complaints</h2>
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
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/onboard" className="btn btn-ghost text-sm">Onboard resident</Link>
            <Link to="/invites" className="btn btn-ghost text-sm">Send invite</Link>
            <Link to="/bills" className="btn btn-ghost text-sm">Generate bills</Link>
            <Link to="/notices" className="btn btn-ghost text-sm">New notice</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
