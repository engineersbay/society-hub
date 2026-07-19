import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { InvitationDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { canUseAdminMode } from "../app-mode";

export function InvitesPage() {
  const { client, user } = useAuth();
  const [items, setItems] = useState<InvitationDto[] | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("resident");
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelWhatsapp, setChannelWhatsapp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = canUseAdminMode(user?.role);

  function load() {
    client
      .listInvitations()
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    if (!allowed) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, allowed]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const channels: Array<"email" | "whatsapp"> = [];
      if (channelEmail) channels.push("email");
      if (channelWhatsapp) channels.push("whatsapp");
      if (channels.length === 0) {
        setError("Select at least one channel (email or WhatsApp).");
        return;
      }
      const res = await client.createInvitation({
        email: email || null,
        phone: phone || null,
        role,
        channels,
      });
      const parts: string[] = [];
      if (res.delivery?.email) {
        parts.push(res.delivery.email.ok ? "email sent" : `email failed: ${res.delivery.email.error}`);
      }
      if (res.delivery?.whatsapp) {
        parts.push(
          res.delivery.whatsapp.ok
            ? "WhatsApp queued"
            : `WhatsApp failed: ${res.delivery.whatsapp.error}`,
        );
      }
      setMessage(parts.length ? `Invite created (${parts.join("; ")})` : "Invite created");
      setEmail("");
      setPhone("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sh-page sh-page-wide" data-testid="invites-page">
      <div className="sh-page-header">
        <div>
          <h1 className="font-display text-xl sm:text-2xl">Invites</h1>
          <p className="mt-0.5 text-sm text-black/55">
            Invite by email and/or WhatsApp. Without provider keys, delivery is stubbed locally.
          </p>
        </div>
      </div>

      <form className="card sh-section space-y-3" onSubmit={onSubmit} data-testid="invites-form">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-phone">
              Phone (WhatsApp)
            </label>
            <input
              id="invite-phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9198xxxxxxxx"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="invite-role">
            Role
          </label>
          <select
            id="invite-role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="resident">Resident</option>
            <option value="chairperson">Chairperson</option>
            <option value="secretary">Secretary</option>
            <option value="committee">Committee</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channelEmail}
              onChange={(e) => setChannelEmail(e.target.checked)}
            />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channelWhatsapp}
              onChange={(e) => setChannelWhatsapp(e.target.checked)}
            />
            WhatsApp (Gupshup)
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit" data-testid="invites-submit">
          Send invite
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="border-b border-[var(--sand)] text-xs uppercase tracking-wide text-black/45">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td className="px-4 py-4 text-black/45" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-black/45" colSpan={4}>
                  No invites sent yet.
                </td>
              </tr>
            )}
            {items?.map((r) => (
              <tr key={r.id} className="border-b border-[var(--sand)]/70 last:border-0">
                <td className="px-4 py-3">{r.email ?? r.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge">{r.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      r.status === "accepted"
                        ? "badge-success"
                        : r.status === "revoked"
                          ? "badge-danger"
                          : ""
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-black/50">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
