import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ComplaintDto, DashboardStatsDto } from "@society-hub/types";
import {
  ComplaintListCard,
  complaintFlatLabel,
  formatComplaintWhen,
} from "@society-hub/ui";
import { useAuth } from "../auth";
import { canUseAdminMode, useAppMode } from "../app-mode";
import { Icon, type IconName } from "../components/icons";

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function OccupancyTile({
  to,
  label,
  value,
  testId,
}: {
  to: string;
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <Link to={to} className="kpi-card block transition-transform hover:-translate-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-[var(--leaf-dark)]" data-testid={testId}>
        {value}
      </p>
    </Link>
  );
}

function StatTile({
  to,
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  to: string;
  label: string;
  value: string | number;
  hint: string;
  icon: IconName;
  tone?: "default" | "alert" | "dues";
}) {
  const valueClass =
    tone === "dues"
      ? "text-[var(--danger)]"
      : tone === "alert"
        ? "text-[var(--alert)]"
        : "text-[var(--leaf-dark)]";

  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-[var(--sand)]/80 bg-white p-4 shadow-[0_1px_2px_rgba(42,26,18,0.04)] transition hover:border-[var(--saffron)]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">
            {label}
          </p>
          <p className={`mt-1.5 font-display text-3xl leading-none ${valueClass}`}>{value}</p>
          <p className="mt-2 text-xs font-medium text-[var(--leaf)] opacity-80 group-hover:opacity-100">
            {hint} →
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mist)] text-[var(--leaf-dark)]">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}

function QuickAction({
  to,
  title,
  subtitle,
  icon,
}: {
  to: string;
  title: string;
  subtitle: string;
  icon: IconName;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-[var(--sand)]/70 bg-[#fffdfb] px-3.5 py-3.5 transition hover:border-[var(--saffron)]/45 hover:bg-[var(--mist)]/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--saffron)]/15 to-[var(--leaf-dark)]/10 text-[var(--leaf-dark)] transition group-hover:from-[var(--saffron)]/25">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-black/45">{subtitle}</span>
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const { client, user } = useAuth();
  const { mode } = useAppMode();
  const staffView = canUseAdminMode(user?.role) && mode === "admin";
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [recent, setRecent] = useState<ComplaintDto[]>([]);

  useEffect(() => {
    client.getDashboardStats({ mine: !staffView }).then(setStats).catch(() => undefined);
    client
      .listComplaints(1, 4, { mine: !staffView })
      .then((res) => setRecent(res.items))
      .catch(() => undefined);
  }, [client, staffView]);

  const firstName = user?.name?.split(" ")[0];
  const viewLine = staffView
    ? "Admin view · society overview"
    : user?.flatNumber
      ? `Resident view · Flat ${user.flatNumber}`
      : "Resident view";

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
            {viewLine}
          </p>
          <h1 className="mt-1 font-display text-2xl text-[var(--leaf-dark)] sm:text-3xl">
            Hello{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-black/50">
            {staffView
              ? "What needs attention across the society today."
              : "Bills, complaints, and society updates for your flat."}
          </p>
        </div>
        <Link to="/complaints/new" className="btn btn-primary shrink-0 px-5 py-2.5 text-sm">
          Raise a complaint
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          to="/bills"
          label="Dues outstanding"
          value={stats ? rupees(stats.duesOutstandingPaise) : "—"}
          hint={staffView ? "Open bills" : "Pay or view bills"}
          icon="bills"
          tone="dues"
        />
        <StatTile
          to="/complaints"
          label="Open complaints"
          value={stats?.openComplaints ?? "—"}
          hint={staffView ? "Review queue" : "Track yours"}
          icon="complaints"
          tone={stats && stats.openComplaints > 0 ? "alert" : "default"}
        />
        <StatTile
          to="/notices"
          label="Notices"
          value={stats?.publishedNotices ?? "—"}
          hint="Read updates"
          icon="notices"
        />
      </div>

      {staffView && stats?.occupancy && (
        <section className="mt-5" data-testid="dashboard-occupancy">
          <h2 className="mb-2 text-sm font-semibold text-[var(--ink)]">Occupancy</h2>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <OccupancyTile
              to="/residents?tab=flats"
              label="Total flats"
              value={stats.occupancy.totalFlats}
              testId="occupancy-total-flats"
            />
            <OccupancyTile
              to="/residents?tab=flats&occupancy=owner_occupied"
              label="Owner occupied"
              value={stats.occupancy.ownerOccupiedFlats}
              testId="occupancy-owner-occupied"
            />
            <OccupancyTile
              to="/residents?tab=flats&occupancy=tenant_occupied"
              label="Tenant occupied"
              value={stats.occupancy.tenantOccupiedFlats}
              testId="occupancy-tenant-occupied"
            />
            <OccupancyTile
              to="/residents?tab=flats&occupancy=vacant"
              label="Vacant"
              value={stats.occupancy.vacantFlats}
              testId="occupancy-vacant"
            />
            <OccupancyTile
              to="/residents?status=active"
              label="Active residents"
              value={stats.occupancy.activeResidents}
              testId="occupancy-active-residents"
            />
            <OccupancyTile
              to="/residents"
              label="Total residents"
              value={stats.occupancy.totalResidents}
              testId="occupancy-total-residents"
            />
            <OccupancyTile
              to="/residents?verificationStatus=pending"
              label="Pending verification"
              value={stats.occupancy.pendingVerification}
              testId="occupancy-pending-verification"
            />
            <OccupancyTile
              to="/residents?tab=invites"
              label="Pending invitations"
              value={stats.occupancy.pendingInvitations}
              testId="occupancy-pending-invitations"
            />
            <OccupancyTile
              to="/residents?status=moved_out"
              label="Moved out"
              value={stats.occupancy.movedOut}
              testId="occupancy-moved-out"
            />
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <section className="rounded-xl border border-[var(--sand)]/80 bg-white p-4 shadow-[0_1px_2px_rgba(42,26,18,0.04)] lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                {staffView ? "Recent complaints" : "Your recent complaints"}
              </h2>
              <p className="text-xs text-black/40">
                {staffView ? "Latest across the society" : "Latest from your flat"}
              </p>
            </div>
            <Link to="/complaints" className="text-sm font-medium text-[var(--leaf)]">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-lg bg-[var(--mist)]/50 px-4 py-8 text-center text-sm text-black/45">
              No complaints yet.
            </p>
          ) : (
            <div className="sh-complaint-list sh-complaint-list-inset">
              {recent.map((c) => (
                <Link key={c.id} to={`/complaints/${c.id}`} className="block">
                  <ComplaintListCard
                    type={c.type}
                    title={c.title}
                    location={complaintFlatLabel(c.flatNumber)}
                    when={formatComplaintWhen(c.createdAt)}
                    ticketNumber={c.ticketNumber}
                    status={c.status}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--sand)]/80 bg-white p-4 shadow-[0_1px_2px_rgba(42,26,18,0.04)] lg:col-span-2">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Quick actions</h2>
            <p className="text-xs text-black/40">
              {staffView ? "Common society admin tasks" : "Everyday flat tasks"}
            </p>
          </div>
          <div className="grid gap-2.5">
            {staffView ? (
              <>
                <QuickAction
                  to="/residents?add=1"
                  title="Add resident"
                  subtitle="Onboard a household to a flat"
                  icon="onboard"
                />
                <QuickAction
                  to="/residents?tab=invites"
                  title="Pending invitations"
                  subtitle="Follow up on open invites"
                  icon="invites"
                />
                <QuickAction
                  to="/bills"
                  title="Generate bills"
                  subtitle="Create or review society dues"
                  icon="bills"
                />
                <QuickAction
                  to="/notices"
                  title="New notice"
                  subtitle="Publish an update to residents"
                  icon="notices"
                />
              </>
            ) : (
              <>
                <QuickAction
                  to="/bills"
                  title="Pay dues"
                  subtitle="See outstanding bills and pay"
                  icon="bills"
                />
                <QuickAction
                  to="/bookings"
                  title="Book clubhouse"
                  subtitle="Reserve a shared amenity"
                  icon="bookings"
                />
                <QuickAction
                  to="/visitors"
                  title="Expect visitor"
                  subtitle="Create a digital gate pass"
                  icon="visitors"
                />
                <QuickAction
                  to="/parking"
                  title="Parking"
                  subtitle="View slots and vehicles"
                  icon="parking"
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
