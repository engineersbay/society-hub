import { FormEvent, useCallback, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { GoogleSignInButton, googleSignInMode } from "@society-hub/ui";
import { useAuth } from "../auth";

type Mode = "password" | "otp" | "pin" | "google";

const WEB_URL =
  import.meta.env.VITE_APP_ORIGIN ??
  import.meta.env.VITE_WEB_URL ??
  "http://app.localhost:5173";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const googleMode = googleSignInMode(GOOGLE_CLIENT_ID);

const FEATURE_BANDS = [
  {
    title: "Operate every society from one desk",
    items: [
      {
        title: "Societies",
        subtitle: "Onboard, switch, and inspect tenants",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21V9l9-6 9 6v12M9 21V12h6v9"
          />
        ),
      },
      {
        title: "Platform billing",
        subtitle: "Plans, invoices, coupons, Razorpay",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7h16M6 7v10a1 1 0 001 1h10a1 1 0 001-1V7M9 11h6"
          />
        ),
      },
      {
        title: "Support",
        subtitle: "Tickets and platform employees",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h8M8 14h5m7-9H5a2 2 0 00-2 2v12l3-2h13a2 2 0 002-2V5a2 2 0 00-2-2z"
          />
        ),
      },
    ],
  },
  {
    title: "Brand, domain, and access",
    items: [
      {
        title: "Branding",
        subtitle: "Logo and color on the Client App",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.5-9 4 6 2-3.5L20 16H4zM8 19h8"
          />
        ),
      },
      {
        title: "Domains",
        subtitle: "Slug or custom host per society",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.2 4 5.4 4 9s-1.5 6.8-4 9m0-18c-2.5 2.2-4 5.4-4 9s1.5 6.8 4 9M3.5 9h17M3.5 15h17"
          />
        ),
      },
      {
        title: "View as",
        subtitle: "Admin vs tenant without mixing roles",
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM4 20a8 8 0 0116 0"
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
        navigate("/dashboard", { replace: true });
      } catch {
        setError(
          `Manage is for SocietyHub platform employees only. Society staff use the Client App: ${WEB_URL}`,
        );
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
  if (user) return <Navigate to="/dashboard" replace />;

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

  function backToPassword() {
    setMode("password");
    setError(null);
    setDevHint(null);
  }

  const canSubmitPassword = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <div
      className="relative flex min-h-svh flex-col overflow-hidden bg-[#f3f0eb]"
      data-testid="manage-login-page"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block"
        style={{
          background: "linear-gradient(165deg, #2a1a12 0%, #5c1830 52%, #8b1e3f 100%)",
          clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--leaf-dark)] text-[11px] font-bold text-white">
            SH
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--leaf-dark)]">
            SocietyHub
          </span>
        </div>
        <a
          href={WEB_URL}
          className="text-sm font-medium text-black/45 transition hover:text-[var(--ink)] lg:text-white/70 lg:hover:text-white"
        >
          Client App
        </a>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-8 px-5 pb-4 pt-2 lg:flex-row lg:items-center lg:gap-10 lg:px-10 lg:pb-8">
        <section className="mx-auto hidden w-full max-w-3xl flex-1 flex-col justify-center gap-5 lg:flex">
          {FEATURE_BANDS.map((band) => (
            <div
              key={band.title}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(42,26,18,0.08)]"
            >
              <div
                className="px-4 py-3 text-center text-[13px] font-semibold tracking-[0.04em] text-white"
                style={{
                  background: "linear-gradient(90deg, #1f1210 0%, #5c1830 100%)",
                }}
              >
                {band.title}
              </div>
              <div className="grid grid-cols-3 gap-1 px-3 py-7">
                {band.items.map((item) => (
                  <div key={item.title} className="px-3 text-center">
                    <FeatureIcon>{item.icon}</FeatureIcon>
                    <p className="mt-3 text-[13px] font-semibold text-[var(--ink)]">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-black/45">{item.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto w-full max-w-[400px] shrink-0 lg:mr-4 lg:ml-auto">
          <div className="rounded-xl bg-white px-7 py-8 shadow-[0_20px_60px_rgba(20,10,8,0.18)] sm:px-8">
            <p className="text-sm font-medium text-black/40">Sign in</p>

            <div className="mt-6 text-center">
              <p className="text-[1.85rem] font-semibold tracking-tight text-[var(--leaf-dark)]">
                SocietyHub
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/35">
                Manage
              </p>
            </div>

            {mode !== "password" && (
              <button
                type="button"
                data-testid="login-mode-password"
                className="mt-5 text-sm font-medium text-[var(--leaf)]"
                onClick={backToPassword}
              >
                ← Email sign-in
              </button>
            )}

            {mode === "password" && (
              <form className="mt-8 space-y-4" onSubmit={loginPassword}>
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
                  className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:bg-[#d4cdc6] disabled:text-white disabled:shadow-none"
                  data-testid="login-submit"
                  disabled={!canSubmitPassword}
                  type="submit"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}

            {mode === "otp" && (
              <form className="mt-8 space-y-4" onSubmit={otpSent ? verifyOtp : requestOtp}>
                <div>
                  <label className="label" htmlFor="phone">
                    Mobile *
                  </label>
                  <input
                    id="phone"
                    className="input"
                    data-testid="login-phone"
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
              <form className="mt-8 space-y-4" onSubmit={loginPin}>
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
              <div className="mt-8 space-y-4">
                <p className="text-center text-sm text-black/50">
                  Use the Google account tied to your platform employee login.
                </p>
                <GoogleSignInButton
                  clientId={GOOGLE_CLIENT_ID}
                  disabled={busy}
                  onCredential={onGoogleCredential}
                />
              </div>
            )}

            {mode === "google" && googleMode === "dev" && (
              <form className="mt-8 space-y-4" onSubmit={loginGoogle}>
                <p className="text-sm text-black/50">
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

            {devHint && <p className="mt-3 text-center text-sm text-[var(--alert)]">{devHint}</p>}
            {error && (
              <p
                className="mt-3 rounded-md bg-[var(--danger)]/8 px-3 py-2 text-center text-sm text-[var(--danger)]"
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
                  <Link
                    to="/onboard"
                    className="text-[var(--ink)] hover:text-[var(--leaf-dark)]"
                    data-testid="login-create-society"
                  >
                    Create society
                  </Link>
                </div>
                <p className="mt-5 text-center text-[12px] text-black/40">
                  <button
                    type="button"
                    data-testid="login-mode-otp"
                    className="hover:text-[var(--ink)]"
                    onClick={() => setMode("otp")}
                  >
                    OTP
                  </button>
                  <span className="mx-2 text-black/20">·</span>
                  <button
                    type="button"
                    data-testid="login-mode-pin"
                    className="hover:text-[var(--ink)]"
                    onClick={() => setMode("pin")}
                  >
                    PIN
                  </button>
                  <span className="mx-2 text-black/20">·</span>
                  <button
                    type="button"
                    data-testid="login-mode-google"
                    className="hover:text-[var(--ink)]"
                    onClick={() => setMode("google")}
                  >
                    Google
                  </button>
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-6 pb-5 text-center text-[11px] text-black/35 lg:text-black/30">
        <p>© SocietyHub {new Date().getFullYear()}</p>
        <p className="mt-1">
          Platform employees ·{" "}
          <a className="hover:underline" href={WEB_URL}>
            Client App
          </a>
        </p>
      </footer>
    </div>
  );
}
