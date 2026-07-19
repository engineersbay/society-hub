import { FormEvent, useState } from "react";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function SetPinPage() {
  const { client, user, setSession } = useAuth();
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
      setMessage("PIN saved. You can use PIN login next time.");
      setPin("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-2xl">Set PIN</h1>
      <p className="mt-1 text-sm text-black/55">4–6 digits for quick login.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
        <button className="btn btn-primary" type="submit">
          Save PIN
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
