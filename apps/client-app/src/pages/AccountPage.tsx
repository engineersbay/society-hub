import { FormEvent, useEffect, useState } from "react";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";

export function AccountPage() {
  const { client, user, setSession } = useAuth();
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .getProfile()
      .then((profile) => {
        setEmergencyContact(profile.emergencyContact ?? "");
        setVehicleNumber(profile.vehicleNumber ?? "");
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    try {
      await client.updateProfile({
        emergencyContact: emergencyContact || null,
        vehicleNumber: vehicleNumber || null,
      });
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="font-display text-2xl">Account</h1>
        <p className="mt-1 text-sm text-black/55">
          {user?.email ?? user?.phone ?? "No contact"} · {user?.role}
          {user?.flatNumber ? ` · Flat ${user.flatNumber}` : ""}
        </p>
      </div>

      <section className="card p-6">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-black/55">
          Helpful for security and society records.
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveProfile}>
          <div>
            <label className="label" htmlFor="account-emergency-contact">
              Emergency contact
            </label>
            <input
              id="account-emergency-contact"
              data-testid="account-emergency-contact"
              className="input"
              placeholder="Name & phone number"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="account-vehicle-number">
              Vehicle number
            </label>
            <input
              id="account-vehicle-number"
              data-testid="account-vehicle-number"
              className="input"
              placeholder="MH12AB1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save profile
          </button>
        </form>
        {profileMessage && <p className="mt-2 text-sm text-[var(--leaf)]">{profileMessage}</p>}
        {profileError && <p className="mt-2 text-sm text-[var(--danger)]">{profileError}</p>}
      </section>

      <section className="card p-6">
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

      <section className="card p-6">
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
