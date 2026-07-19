import { FormEvent, useEffect, useState } from "react";
import type { ResidentProfileDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import {
  ShField,
  ShFormGrid,
  ShPage,
  ShPageHeader,
  ShSection,
  ShSplit,
} from "@society-hub/ui";
import { useAuth } from "../auth";

export function AccountPage() {
  const { client, user, setSession } = useAuth();
  const [pin, setPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [profile, setProfile] = useState<ResidentProfileDto | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .getProfile()
      .then((next) => {
        setProfile(next);
        setEmergencyContact(next.emergencyContact ?? "");
        setVehicleNumber(next.vehicleNumber ?? "");
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
            accessToken: localStorage.getItem("sh_web_access")!,
            refreshToken: localStorage.getItem("sh_web_refresh")!,
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
      const next = await client.updateProfile({
        emergencyContact: emergencyContact || null,
        vehicleNumber: vehicleNumber || null,
      });
      setProfile(next);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  const flat = profile?.flat ?? null;
  const flatLabel = flat
    ? [flat.wingName ? `${flat.wingName}-` : "", flat.number].join("")
    : user?.flatNumber
      ? `Flat ${user.flatNumber}`
      : null;

  return (
    <ShPage wide>
      <ShPageHeader
        title="Account"
        description={
          <>
            {user?.email ?? user?.phone ?? "No contact"} · {user?.role}
            {flatLabel
              ? ` · ${flatLabel.startsWith("Flat") ? flatLabel : `Flat ${flatLabel}`}`
              : ""}
          </>
        }
      />

      <ShSplit>
        <ShSection
          title="My flat"
          description="Society home linked to your account."
          testId="account-flat-details"
        >
          {flat ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Society
                </dt>
                <dd className="font-medium" data-testid="account-society-name">
                  {profile?.societyName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Flat
                </dt>
                <dd className="font-medium" data-testid="account-flat-number">
                  {flat.wingName ? `${flat.wingName}-${flat.number}` : flat.number}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Building
                </dt>
                <dd className="font-medium" data-testid="account-building-name">
                  {flat.buildingName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Wing
                </dt>
                <dd className="font-medium" data-testid="account-wing-name">
                  {flat.wingName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Floor
                </dt>
                <dd className="font-medium" data-testid="account-floor">
                  {flat.floor != null ? flat.floor : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Parking
                </dt>
                <dd className="font-medium" data-testid="account-parking">
                  {flat.parkingSlot ?? "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Occupancy
                </dt>
                <dd className="font-medium" data-testid="account-occupancy">
                  {flat.isOwner ? "Owner" : "Tenant / occupant"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-black/55" data-testid="account-flat-empty">
              No flat linked yet. Ask an admin to onboard you.
            </p>
          )}
        </ShSection>

        <ShSection title="Profile" description="For security and society records.">
          <form className="space-y-2.5" onSubmit={saveProfile}>
            <ShFormGrid>
              <ShField label="Emergency contact" htmlFor="account-emergency-contact">
                <input
                  id="account-emergency-contact"
                  data-testid="account-emergency-contact"
                  className="input"
                  placeholder="Name & phone"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </ShField>
              <ShField label="Vehicle number" htmlFor="account-vehicle-number">
                <input
                  id="account-vehicle-number"
                  data-testid="account-vehicle-number"
                  className="input"
                  placeholder="MH12AB1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                />
              </ShField>
            </ShFormGrid>
            <button className="btn btn-primary" type="submit">
              Save profile
            </button>
          </form>
          {profileMessage && (
            <p className="mt-2 text-sm text-[var(--leaf)]">{profileMessage}</p>
          )}
          {profileError && (
            <p className="mt-2 text-sm text-[var(--danger)]">{profileError}</p>
          )}
        </ShSection>

        <ShSection title="Reset password" description="Change password while signed in.">
          <form className="space-y-2.5" onSubmit={changePassword}>
            <ShField label="Current password" htmlFor="currentPassword">
              <input
                id="currentPassword"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </ShField>
            <ShFormGrid>
              <ShField label="New password" htmlFor="newPassword">
                <input
                  id="newPassword"
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </ShField>
              <ShField label="Confirm" htmlFor="confirmPassword">
                <input
                  id="confirmPassword"
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </ShField>
            </ShFormGrid>
            <button className="btn btn-primary" type="submit">
              Update password
            </button>
          </form>
        </ShSection>

        <ShSection title="PIN" description="4–6 digits for quick mobile login.">
          <form className="flex flex-wrap items-end gap-2" onSubmit={savePin}>
            <ShField label="New PIN" htmlFor="pin" className="min-w-[10rem] flex-1">
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
            </ShField>
            <button className="btn btn-ghost" type="submit">
              Save PIN
            </button>
          </form>
        </ShSection>
      </ShSplit>

      {message && <p className="mt-3 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </ShPage>
  );
}
