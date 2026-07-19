import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function ForgotPasswordPage() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDevHint(null);
    try {
      const res = await client.forgotPassword(email);
      if (res.devCode) setDevHint(`Dev reset code: ${res.devCode}`);
      const params = new URLSearchParams({ email });
      if (res.devCode) params.set("code", res.devCode);
      navigate(`/reset-password?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-3xl text-[var(--leaf-dark)]">Forgot password</p>
      <p className="mt-2 text-sm text-black/60">
        Enter your email and we will send a reset code.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-full" disabled={busy} type="submit">
          Send reset code
        </button>
      </form>
      {devHint && <p className="mt-3 text-sm text-[var(--alert)]">{devHint}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      <p className="mt-6 text-sm">
        <Link to="/login" className="text-[var(--leaf)]">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
