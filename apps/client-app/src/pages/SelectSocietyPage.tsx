import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { MembershipDto, Role } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { SocietyHubLogo, uniqueMembershipsBySociety } from "@society-hub/ui";
import { useAuth } from "../auth";

function roleLabel(role: Role | string) {
  switch (role) {
    case "superadmin":
      return "Platform";
    case "chairperson":
      return "Chairperson";
    case "admin":
      return "Admin";
    case "secretary":
      return "Secretary";
    case "treasurer":
      return "Treasurer";
    case "cashier":
      return "Cashier";
    case "committee":
      return "Committee";
    case "tenant":
      return "Tenant";
    default:
      return "Resident";
  }
}

function societyInitial(name: string) {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "S";
}

export function SelectSocietyPage() {
  const { user, client, setSession, clearSession } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<MembershipDto[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .listMemberships()
      .then((rows) => setMemberships(uniqueMembershipsBySociety(rows)))
      .catch(() => setMemberships([]));
  }, [client]);

  if (!user) return <Navigate to="/login" replace />;

  if (memberships !== null && memberships.length <= 1) {
    return <Navigate to="/dashboard" replace />;
  }

  async function pick(tenantId: string) {
    setBusy(tenantId);
    setError(null);
    try {
      const res = await client.selectTenant(tenantId);
      setSession(res.user, res.tokens);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : "Could not switch society",
      );
    } finally {
      setBusy(null);
    }
  }

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  const count = memberships?.length ?? 0;

  return (
    <div
      className="relative flex min-h-svh flex-col overflow-hidden bg-[#f3f0eb]"
      data-testid="select-society-page"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] lg:block"
        style={{
          background: "linear-gradient(165deg, #2a1a12 0%, #5c1830 52%, #8b1e3f 100%)",
          clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <SocietyHubLogo size={36} className="shrink-0" />
          <span className="text-[15px] font-semibold tracking-tight text-[var(--leaf-dark)]">
            SocietyHub
          </span>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-black/45 transition hover:text-[var(--ink)] lg:text-white/70 lg:hover:text-white"
          onClick={logout}
          data-testid="select-society-logout"
        >
          Log out
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 text-center">
            <SocietyHubLogo size={48} className="mx-auto" />
            <h1 className="mt-4 text-[1.65rem] font-semibold tracking-tight text-[var(--ink)]">
              Choose your society
            </h1>
            <p className="mt-1.5 text-sm text-black/50">
              {count > 0
                ? `You belong to ${count} societies. Pick one to continue.`
                : "You belong to more than one society. Pick one to continue."}
            </p>
          </div>

          <div
            className="space-y-3"
            data-testid="select-society-list"
            role="list"
          >
            {memberships === null && (
              <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-8 text-center text-sm text-black/45 shadow-sm">
                Loading your societies…
              </div>
            )}
            {memberships?.map((m) => {
              const loading = busy === m.tenantId;
              return (
                <button
                  key={m.tenantId}
                  type="button"
                  role="listitem"
                  data-testid="select-society-option"
                  disabled={busy !== null}
                  className="group flex w-full items-center gap-3.5 rounded-xl border border-black/[0.06] bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-[var(--saffron)]/50 hover:shadow-md disabled:opacity-60"
                  onClick={() => void pick(m.tenantId)}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{
                      background:
                        "linear-gradient(145deg, var(--saffron) 0%, var(--leaf-dark) 100%)",
                    }}
                    aria-hidden
                  >
                    {societyInitial(m.societyName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[var(--ink)]">
                      {m.societyName}
                    </span>
                    <span className="mt-0.5 block text-xs text-black/45">
                      {roleLabel(m.role)}
                      {m.canUseAdminMode ? " · Admin access" : ""}
                      {m.suspended ? " · Suspended" : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      loading
                        ? "bg-black/[0.04] text-black/45"
                        : "bg-[var(--mist)] text-[var(--leaf-dark)] group-hover:bg-[var(--saffron)] group-hover:text-white"
                    }`}
                  >
                    {loading ? "Opening…" : "Continue"}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p
              className="mt-4 rounded-md bg-[var(--danger)]/8 px-3 py-2 text-center text-sm text-[var(--danger)]"
              data-testid="select-society-error"
            >
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
