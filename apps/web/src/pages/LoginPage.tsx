import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

type Mode = "password" | "otp" | "pin" | "google";

export function LoginPage() {
  const { user, client, setSession } = useAuth();
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

  if (user) return <Navigate to="/complaints" replace />;

  async function loginPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await client.loginPassword(email, password);
      setSession(res.user, res.tokens);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    setError(null);
    try {
      const res = await client.verifyOtp(phone, code);
      setSession(res.user, res.tokens);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginPin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await client.loginPin(phone, pin);
      setSession(res.user, res.tokens);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginGoogle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await client.loginGoogle(`dev:${phone}`);
      setSession(res.user, res.tokens);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const modeLabel: Record<Mode, string> = {
    password: "Email",
    otp: "OTP",
    pin: "PIN",
    google: "Google",
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-4xl text-[var(--leaf-dark)]">SocietyHub</p>
      <p className="mt-2 text-black/60">
        Sign in for your society. Pilot: Keshav Heights.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["password", "otp", "pin", "google"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`btn text-sm ${mode === m ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode(m)}
          >
            {modeLabel[m]}
          </button>
        ))}
      </div>

      {mode === "password" && (
        <form className="mt-6 space-y-4" onSubmit={loginPassword}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
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
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-[var(--leaf)]">
              Forgot password?
            </Link>
          </div>
          <button className="btn btn-primary w-full" disabled={busy} type="submit">
            Sign in
          </button>
        </form>
      )}

      {mode === "otp" && (
        <form className="mt-6 space-y-4" onSubmit={otpSent ? verifyOtp : requestOtp}>
          <div>
            <label className="label" htmlFor="phone">
              Mobile
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
                OTP
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
          <button className="btn btn-primary w-full" disabled={busy} type="submit">
            {otpSent ? "Verify & continue" : "Send OTP"}
          </button>
        </form>
      )}

      {mode === "pin" && (
        <form className="mt-6 space-y-4" onSubmit={loginPin}>
          <div>
            <label className="label" htmlFor="phone-pin">
              Mobile
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
              PIN
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
          <button className="btn btn-primary w-full" disabled={busy} type="submit">
            Sign in with PIN
          </button>
        </form>
      )}

      {mode === "google" && (
        <form className="mt-6 space-y-4" onSubmit={loginGoogle}>
          <p className="text-sm text-black/60">
            Dev Google SSO uses your onboarded phone as{" "}
            <code>dev:&lt;phone&gt;</code>.
          </p>
          <div>
            <label className="label" htmlFor="phone-g">
              Mobile (dev)
            </label>
            <input
              id="phone-g"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={busy} type="submit">
            Continue with Google (dev)
          </button>
        </form>
      )}

      {devHint && <p className="mt-3 text-sm text-[var(--alert)]">{devHint}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
