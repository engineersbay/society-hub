import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { ActivityEventDto, PlatformUserDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { Icon } from "../components/icons";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { client, user } = useAuth();
  const [profile, setProfile] = useState<PlatformUserDto | null>(null);
  const [activity, setActivity] = useState<ActivityEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setProfile(null);
    setActivity(null);
    client
      .getPlatformUser(id)
      .then(setProfile)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "User not found");
      });
    client
      .listUserActivity(id)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [client, id]);

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;
  if (!id) return null;

  return (
    <div data-testid="manage-user-detail">
      <Link to="/users" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--leaf)]">
        <Icon name="back" className="h-4 w-4" />
        All users
      </Link>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      <div className="mb-8">
        <h1 className="font-display text-2xl">
          {profile?.name ?? profile?.email ?? profile?.phone ?? "User"}
        </h1>
        <p className="mt-1 text-sm text-black/55">
          {[profile?.email, profile?.phone, profile?.username]
            .filter(Boolean)
            .join(" · ") || "Loading…"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Memberships</h2>
          {!profile ? (
            <p className="text-sm text-black/50">Loading…</p>
          ) : profile.memberships.length === 0 ? (
            <p className="text-sm text-black/50">No society roles.</p>
          ) : (
            <ul className="divide-y divide-[var(--sand)]">
              {profile.memberships.map((m) => (
                <li
                  key={`${m.tenantId}-${m.role}`}
                  className="flex items-center justify-between gap-2 py-3 text-sm"
                >
                  <span>
                    <Link
                      to={`/societies/${m.tenantId}`}
                      className="font-medium text-[var(--leaf-dark)] hover:underline"
                    >
                      {m.societyName}
                    </Link>
                  </span>
                  <span className="badge">{m.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Activity</h2>
          <p className="mb-4 text-xs text-black/45">
            Actions this user performed, plus events where they were the subject
            (Fassport-style history).
          </p>
          <ActivityTimeline items={activity} />
        </div>
      </div>
    </div>
  );
}
