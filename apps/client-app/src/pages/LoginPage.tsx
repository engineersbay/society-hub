import { FormEvent, useCallback, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { GoogleSignInButton, googleSignInMode } from "@society-hub/ui";
import { useAuth } from "../auth";
import { LEGAL_LINKS } from "../lib/legal-links";

type Mode = "password" | "otp" | "pin" | "google";

const MANAGE_URL = import.meta.env.VITE_MANAGE_URL ?? "http://manage.localhost:5174";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const googleMode = googleSignInMode(GOOGLE_CLIENT_ID);

const FEATURE_BANDS = [
  {
    title: "Everyday society life, in one place",
    items: [
      {
        title: "Complaints",
        subtitle: "Raise & track issues to resolution",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h8M8 14h5m7-9H5a2 2 0 00-2 2v12l3-2h13a2 2 0 002-2V5a2 2 0 00-2-2z"
          />
        ),
      },
      {
        title: "Bills & payments",
        subtitle: "Dues, receipts, and reminders",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7h18M5 7v12a1 1 0 001 1h12a1 1 0 001-1V7M9 11h6M9 15h4"
          />
        ),
      },
      {
        title: "Notices",
        subtitle: "Society updates when they matter",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5.5V19m0-13.5L19 8v8l-8 2.5m0-13.5L5 8v8l6 2.5"
          />
        ),
      },
    ],
  },
  {
    title: "Gate, parking & shared spaces",
    items: [
      {
        title: "Visitors",
        subtitle: "Digital pass with QR & OTP",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM4 19a7 7 0 0114 0"
          />
        ),
      },
      {
        title: "Bookings",
        subtitle: "Reserve amenities without phone calls",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 5V3m8 2V3M4 9h16M6 7h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
        ),
      },
      {
        title: "Parking",
        subtitle: "Slots and vehicle records",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16h16M5 16l1.5-6h11L19 16M7.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm9 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
          />
        ),
      },
    ],
  },
] as const;

function FeatureIcon({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <svg
      className="mx-auto h-8 w-8 text-[var(--ink)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function LoginPage() {
  const { user, client, setSession, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function applySession(
    login: () => Promise<{
      user: Parameters<typeof setSession>[0];
      tokens: Parameters<typeof setSession>[1];
    }>,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await login();
      try {
        setSession(res.user, res.tokens);
        navigate("/select-society", { replace: true });
      } catch {
        setError("This account cannot use the Client App.");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const onGoogleCredential = useCallback(
    (idToken: string) => {
      void applySession(() => client.loginGoogle(idToken));
    },
    [client],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-black/50">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/select-society" replace />;

  async function loginPassword(e: FormEvent) {
    e.preventDefault();
    await applySession(() => client.loginPassword(email, password));
  }

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await client.requestOtp(phone);
      setOtpSent(true);
      if (res.devCode) setDevHint(`Dev OTP: ${res.devCode}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    await applySession(() => client.verifyOtp(phone, code));
  }

  async function loginPin(e: FormEvent) {
    e.preventDefault();
    await applySession(() => client.loginPin(phone, pin));
  }

  async function loginGoogle(e: FormEvent) {
    e.preventDefault();
    await applySession(() => client.loginGoogle(`dev:${phone}`));
  }

  const canSubmitPassword = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--paper)]"
      data-testid="client-login-page"
    >
      {/* Diagonal brand plane (desktop) */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block"
        style={{
          background:
            "linear-gradient(160deg, #3a1f18 0%, var(--leaf-dark) 55%, #5c1830 100%)",
          clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--saffron)] to-[var(--leaf-dark)] text-sm font-bold text-white">
            SH
          </div>
          <span className="font-display text-2xl text-[var(--leaf-dark)]">SocietyHub</span>
        </div>
        <a
          href={MANAGE_URL}
          className="text-sm font-medium text-[var(--leaf-dark)]/70 hover:text-[var(--leaf-dark)] lg:text-white/85 lg:hover:text-white"
        >
          Manage
        </a>
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-8 px-4 pb-8 pt-2 lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:pb-12 lg:pt-4">
        {/* Feature bands — Fassport platform left column */}
        <section className="mx-auto hidden w-full max-w-3xl flex-1 flex-col justify-center gap-5 lg:flex">
          {FEATURE_BANDS.map((band) => (
            <div
              key={band.title}
              className="overflow-hidden rounded-2xl border border-[var(--sand)]/70 bg-white shadow-[0_8px_28px_rgba(42,26,18,0.07)]"
            >
              <div
                className="px-4 py-3 text-center text-sm font-semibold tracking-wide text-white"
                style={{
                  background:
                    "linear-gradient(90deg, #2a1a12 0%, var(--leaf-dark) 50%, #3a1f18 100%)",
                }}
              >
                {band.title}
              </div>
              <div className="grid grid-cols-3 gap-2 px-4 py-6">
                {band.items.map((item) => (
                  <div key={item.title} className="px-2 text-center">
                    <FeatureIcon>{item.icon}</FeatureIcon>
                    <p className="mt-3 text-sm font-bold text-[var(--ink)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-snug text-black/50">{item.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Sign-in card */}
        <section className="mx-auto w-full max-w-[400px] shrink-0 lg:mr-6 lg:ml-auto">
          <div className="rounded-2xl border border-[var(--sand)]/60 bg-white p-7 shadow-[0_16px_48px_rgba(42,26,18,0.12)] sm:p-8">
            <p className="text-sm font-semibold text-black/45">Sign in</p>

            <div className="mt-5 flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--saffron)] to-[var(--leaf-dark)] text-base font-bold text-white">
                SH
              </div>
              <p className="font-display mt-3 text-3xl leading-none text-[var(--leaf-dark)]">
                SocietyHub
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                Resident sign-in
              </p>
            </div>

            {mode !== "password" && (
              <button
                type="button"
                className="mt-5 text-sm font-medium text-[var(--leaf)]"
                onClick={() => {
                  setMode("password");
                  setError(null);
                  setDevHint(null);
                }}
              >
                ← Back to email sign-in
              </button>
            )}

            {mode === "password" && (
              <form className="mt-7 space-y-4" onSubmit={loginPassword}>
                <div>
                  <label className="label" htmlFor="email">
                    Email *
                  </label>
                  <input
                    id="email"
                    data-testid="login-email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password *
                  </label>
                  <input
                    id="password"
                    data-testid="login-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:bg-[#d8d0c8] disabled:text-white disabled:shadow-none"
                  data-testid="login-submit"
                  disabled={!canSubmitPassword}
                  type="submit"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}

            {mode === "otp" && (
              <form className="mt-7 space-y-4" onSubmit={otpSent ? verifyOtp : requestOtp}>
                <div>
                  <label className="label" htmlFor="phone">
                    Mobile *
                  </label>
                  <input
                    id="phone"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                {otpSent && (
                  <div>
                    <label className="label" htmlFor="code">
                      OTP *
                    </label>
                    <input
                      id="code"
                      className="input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>
                )}
                <button className="btn btn-primary w-full py-2.5" disabled={busy} type="submit">
                  {otpSent ? "Verify & continue" : "Send OTP"}
                </button>
              </form>
            )}

            {mode === "pin" && (
              <form className="mt-7 space-y-4" onSubmit={loginPin}>
                <div>
                  <label className="label" htmlFor="phone-pin">
                    Mobile *
                  </label>
                  <input
                    id="phone-pin"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pin">
                    PIN *
                  </label>
                  <input
                    id="pin"
                    className="input"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-primary w-full py-2.5" disabled={busy} type="submit">
                  Sign in with PIN
                </button>
              </form>
            )}

            {mode === "google" && googleMode === "gis" && (
              <div className="mt-7 space-y-4">
                <p className="text-center text-sm text-black/55">
                  Continue with the Google account that matches your onboarded email.
                </p>
                <GoogleSignInButton
                  clientId={GOOGLE_CLIENT_ID}
                  disabled={busy}
                  onCredential={onGoogleCredential}
                />
              </div>
            )}

            {mode === "google" && googleMode === "dev" && (
              <form className="mt-7 space-y-4" onSubmit={loginGoogle}>
                <p className="text-sm text-black/55">
                  Dev Google SSO uses your onboarded phone as <code>dev:&lt;phone&gt;</code>.
                </p>
                <div>
                  <label className="label" htmlFor="phone-g">
                    Mobile (dev) *
                  </label>
                  <input
                    id="phone-g"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-primary w-full py-2.5" disabled={busy} type="submit">
                  Continue with Google (dev)
                </button>
              </form>
            )}

            {devHint && (
              <p className="mt-3 text-center text-sm text-[var(--alert)]">{devHint}</p>
            )}
            {error && (
              <p
                className="mt-3 rounded-lg bg-[var(--danger)]/8 px-3 py-2 text-center text-sm text-[var(--danger)]"
                data-testid="login-error"
              >
                {error}
              </p>
            )}

            {mode === "password" && (
              <>
                <div className="mt-6 flex items-center justify-between text-sm font-semibold">
                  <Link
                    to="/forgot-password"
                    className="text-[var(--ink)] hover:text-[var(--leaf-dark)]"
                  >
                    Forgot password?
                  </Link>
                  <a
                    href={`${MANAGE_URL}/onboard`}
                    className="text-[var(--ink)] hover:text-[var(--leaf-dark)]"
                  >
                    Create society
                  </a>
                </div>

                <div className="mt-6 border-t border-[var(--sand)] pt-4">
                  <p className="mb-2 text-center text-xs uppercase tracking-wide text-black/35">
                    Other ways
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm font-medium">
                    <button
                      type="button"
                      data-testid="login-mode-otp"
                      className="text-[var(--leaf)] hover:underline"
                      onClick={() => setMode("otp")}
                    >
                      OTP
                    </button>
                    <button
                      type="button"
                      data-testid="login-mode-pin"
                      className="text-[var(--leaf)] hover:underline"
                      onClick={() => setMode("pin")}
                    >
                      PIN
                    </button>
                    <button
                      type="button"
                      data-testid="login-mode-google"
                      className="text-[var(--leaf)] hover:underline"
                      onClick={() => setMode("google")}
                    >
                      Google
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-5 pb-6 text-center text-xs text-black/40 lg:text-black/35">
        <p>© SocietyHub {new Date().getFullYear()}</p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Link className="hover:underline" to={LEGAL_LINKS.terms}>
            Terms
          </Link>
          <span aria-hidden>•</span>
          <Link className="hover:underline" to={LEGAL_LINKS.privacy}>
            Privacy
          </Link>
          <span aria-hidden>•</span>
          <Link className="hover:underline" to={LEGAL_LINKS.home}>
            Home
          </Link>
        </p>
      </footer>
    </div>
  );
}
