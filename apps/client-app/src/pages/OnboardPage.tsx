import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { FlatDto, ResidentImportResultDto } from "@society-hub/types";
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
    <ShPage wide>
      <ShPageHeader
        title="Onboard residents"
        description={
          <>
            Add one resident or bulk-import via CSV. Flats must exist under{" "}
            <Link to="/structure" className="text-[var(--leaf)]">
              Structure
            </Link>{" "}
            first.
          </>
        }
      />

      <ShSplit>
        <form
          className="card sh-section space-y-3"
          onSubmit={onSubmit}
          data-testid="onboard-form"
        >
          <h2 className="text-sm font-semibold">Single resident</h2>
          <ShFormGrid>
            <ShField label="Society" htmlFor="onboard-society-name" className="sh-span-2">
              <input
                id="onboard-society-name"
                data-testid="onboard-society-name"
                className="input bg-[var(--mist)]/50"
                value={societyName ?? "—"}
                readOnly
                disabled
              />
            </ShField>
            <ShField label="Resident name" htmlFor="name">
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </ShField>
            <ShField label="Phone" htmlFor="phone">
              <input
                id="phone"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </ShField>
            <ShField label="Email" htmlFor="onboard-email">
              <input
                id="onboard-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </ShField>
            <ShField label="Flat" htmlFor="flat">
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
            </ShField>
          </ShFormGrid>
          <button className="btn btn-primary" data-testid="onboard-submit" type="submit">
            Onboard
          </button>
        </form>

        <ShSection
          title="Bulk import (CSV)"
          description="Re-upload updates existing residents matched by phone."
          testId="onboard-csv"
        >
          <p className="mb-2 text-[11px] leading-snug text-black/50">
            Headers: name, phone, email, flatNumber, wingName, floor, parkingSlot, isOwner,
            emergencyContact, vehicleNumber
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <a
              className="btn btn-ghost btn-sm"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
              download="residents-template.csv"
            >
              Download template
            </a>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={sendInvites}
                onChange={(e) => setSendInvites(e.target.checked)}
              />
              Invite new
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={forceInvite}
                onChange={(e) => setForceInvite(e.target.checked)}
              />
              Re-invite
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={createMissingFlats}
                onChange={(e) => setCreateMissingFlats(e.target.checked)}
              />
              Create missing flats
            </label>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-xs"
            data-testid="onboard-csv-input"
            disabled={busyImport}
            onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)}
          />
          {importResult && (
            <p className="mt-2 text-xs text-[var(--leaf)]" data-testid="onboard-csv-result">
              Created {importResult.created} · Updated {importResult.updated} · Unchanged{" "}
              {importResult.unchanged} · Invited {importResult.invited} · Skipped{" "}
              {importResult.skipped}
            </p>
          )}
          {importErrors.length > 0 && (
            <ul className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-[var(--mist)]/40 p-2 text-[11px] text-[var(--danger)]">
              {importErrors.slice(0, 30).map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </ShSection>
      </ShSplit>

      {message && <p className="mt-3 text-sm text-[var(--leaf)]">{message}</p>}
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </ShPage>
  );
}
