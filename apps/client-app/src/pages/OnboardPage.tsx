import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { FlatDto, ResidentImportResultDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { canUseAdminMode } from "../app-mode";
import { mapResidentCsvRows, parseCsv } from "../lib/resident-csv";

const CSV_TEMPLATE = `name,phone,email,flatNumber,wingName,floor,parkingSlot,isOwner,emergencyContact,vehicleNumber
Demo Resident,8888888888,resident@example.com,101,A,1,P-101,true,9999999999,MH12AB1234
`;

export function OnboardPage() {
  const { user, client } = useAuth();
  const [flats, setFlats] = useState<FlatDto[]>([]);
  const [societyName, setSocietyName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [flatId, setFlatId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ResidentImportResultDto | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [sendInvites, setSendInvites] = useState(true);
  const [createMissingFlats, setCreateMissingFlats] = useState(false);
  const [forceInvite, setForceInvite] = useState(false);
  const [busyImport, setBusyImport] = useState(false);
  const allowed = canUseAdminMode(user?.role);

  useEffect(() => {
    if (!allowed) return;
    client.listFlats().then((rows) => {
      setFlats(rows);
      if (rows[0]) setFlatId(rows[0].id);
    });
    client
      .listMemberships()
      .then((rows) => {
        const mine = rows.find((r) => r.tenantId === user?.tenantId);
        if (mine) setSocietyName(mine.societyName);
      })
      .catch(() => undefined);
  }, [client, user, allowed]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await client.onboardResident({ name, phone, flatId, email });
      setMessage(`Onboarded ${res.user.name} (${res.user.phone})`);
      setName("");
      setPhone("");
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed");
    }
  }

  async function onCsvSelected(file: File | null) {
    setImportResult(null);
    setImportErrors([]);
    setError(null);
    if (!file) return;
    setBusyImport(true);
    try {
      const text = await file.text();
      const raw = parseCsv(text);
      const mapped = mapResidentCsvRows(raw);
      if (mapped.errors.length) {
        setImportErrors(mapped.errors);
      }
      if (mapped.rows.length === 0) {
        setError("No valid rows to import. Fix CSV errors and try again.");
        return;
      }
      const result = await client.importResidents({
        rows: mapped.rows,
        sendInvites,
        forceInvite,
        updateFlats: true,
        createMissingFlats,
      });
      setImportResult(result);
      setImportErrors([...mapped.errors, ...result.errors]);
      setMessage(
        `Import finished: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.invited} invited, ${result.skipped} skipped.`,
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "CSV import failed");
    } finally {
      setBusyImport(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl">Onboard residents</h1>
        <p className="mt-1 text-sm text-black/55">
          Add one resident or bulk-import via CSV. Flats must exist under{" "}
          <Link to="/structure" className="text-[var(--leaf)]">
            Structure
          </Link>{" "}
          first.
        </p>
      </div>

      <form className="card space-y-4 p-6" onSubmit={onSubmit} data-testid="onboard-form">
        <h2 className="font-semibold">Single resident</h2>
        <div>
          <label className="label" htmlFor="onboard-society-name">
            Society
          </label>
          <input
            id="onboard-society-name"
            data-testid="onboard-society-name"
            className="input bg-[var(--mist)]/50"
            value={societyName ?? "—"}
            readOnly
            disabled
          />
        </div>
        <div>
          <label className="label" htmlFor="name">
            Resident name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="onboard-email">
            Email
          </label>
          <input
            id="onboard-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="flat">
            Flat
          </label>
          <select
            id="flat"
            className="input"
            value={flatId}
            onChange={(e) => setFlatId(e.target.value)}
            required
          >
            {flats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.wingName ? `${f.wingName}-` : ""}
                {f.number}
                {f.floor != null ? ` · Fl ${f.floor}` : ""}
                {f.parkingSlot ? ` · ${f.parkingSlot}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" data-testid="onboard-submit" type="submit">
          Onboard
        </button>
      </form>

      <div className="card space-y-4 p-6" data-testid="onboard-csv">
        <h2 className="font-semibold">Bulk import (CSV)</h2>
        <p className="text-sm text-black/55">
          Headers:{" "}
          <code className="text-xs">
            name, phone, email, flatNumber, wingName, floor, parkingSlot, isOwner,
            emergencyContact, vehicleNumber
          </code>
          . Re-upload the same file to update existing residents (matched by phone).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="btn btn-ghost btn-sm"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
            download="residents-template.csv"
          >
            Download template
          </a>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
            />
            Invite new residents
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceInvite}
              onChange={(e) => setForceInvite(e.target.checked)}
            />
            Re-invite existing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createMissingFlats}
              onChange={(e) => setCreateMissingFlats(e.target.checked)}
            />
            Create missing flats (needs wingName)
          </label>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          data-testid="onboard-csv-input"
          disabled={busyImport}
          onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)}
        />
        {importResult && (
          <p className="text-sm text-[var(--leaf)]" data-testid="onboard-csv-result">
            Created {importResult.created} · Updated {importResult.updated} · Unchanged{" "}
            {importResult.unchanged} · Invited {importResult.invited} · Skipped{" "}
            {importResult.skipped}
          </p>
        )}
        {importErrors.length > 0 && (
          <ul className="max-h-40 overflow-y-auto rounded-lg bg-[var(--mist)]/40 p-3 text-xs text-[var(--danger)]">
            {importErrors.slice(0, 30).map((err) => (
              <li key={`${err.row}-${err.message}`}>
                Row {err.row}: {err.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <p className="text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
