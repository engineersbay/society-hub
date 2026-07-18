import { FormEvent, useState } from "react";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function AccountPage() {
  const { client, user, setSession } = useAuth();
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function savePin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await client.setPin(pin);
      if (user) {
        setSession(
          { ...user, hasPin: true },
          {
            accessToken: localStorage.getItem("sh_access")!,
            refreshToken: localStorage.getItem("sh_refresh")!,
            expiresIn: 900,
          },
        );
      }
      setMessage("PIN saved.");
      setPin("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    try {
      await client.changePassword(currentPassword, newPassword);
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  return (
    <div className="max-w-md space-y-10">
      <div>
        <h1 className="font-display text-2xl">Account</h1>
        <p className="mt-1 text-sm text-black/55">
          {user?.email ?? "No email"} · {user?.role}
        </p>
      </div>

      <section>
        <h2 className="font-semibold">Reset password</h2>
        <p className="mt-1 text-sm text-black/55">
          Change your password while signed in.
        </p>
        <form className="mt-4 space-y-3" onSubmit={changePassword}>
          <div>
            <label className="label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Update password
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold">PIN</h2>
        <p className="mt-1 text-sm text-black/55">4–6 digits for quick mobile login.</p>
        <form className="mt-4 space-y-3" onSubmit={savePin}>
          <div>
            <label className="label" htmlFor="pin">
              New PIN
            </label>
            <input
              id="pin"
              className="input"
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-ghost" type="submit">
            Save PIN
          </button>
        </form>
      </section>

      {message && <p className="text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
