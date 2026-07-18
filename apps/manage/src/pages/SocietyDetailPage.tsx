import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import type { BuildingDto, FlatDto, SocietyDto, WingDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { Icon } from "../components/icons";

function BuildingBlock({ building }: { building: BuildingDto }) {
  const { client } = useAuth();
  const [wings, setWings] = useState<WingDto[]>([]);
  const [flatsByWing, setFlatsByWing] = useState<Record<string, FlatDto[]>>({});
  const [newWing, setNewWing] = useState("");
  const [newFlat, setNewFlat] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  function loadWings() {
    client
      .listWings(building.id)
      .then((rows) => setWings(rows))
      .catch(() => setWings([]));
  }

  useEffect(() => {
    if (open) loadWings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function loadFlats(wingId: string) {
    client
      .listFlatsForWing(wingId)
      .then((rows) => setFlatsByWing((m) => ({ ...m, [wingId]: rows })))
      .catch(() => setFlatsByWing((m) => ({ ...m, [wingId]: [] })));
  }

  async function addWing(e: FormEvent) {
    e.preventDefault();
    if (!newWing.trim()) return;
    try {
      await client.createWing(building.id, newWing.trim());
      setNewWing("");
      loadWings();
    } catch {
      // best effort
    }
  }

  async function addFlat(wingId: string, e: FormEvent) {
    e.preventDefault();
    const value = newFlat[wingId]?.trim();
    if (!value) return;
    try {
      await client.createFlat(wingId, value);
      setNewFlat((m) => ({ ...m, [wingId]: "" }));
      loadFlats(wingId);
    } catch {
      // best effort
    }
  }

  return (
    <div className="card p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid="structure-building-toggle"
      >
        <span className="font-semibold">{building.name}</span>
        <Icon name="chevronDown" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {wings.map((w) => (
            <div key={w.id} className="rounded-lg border border-[var(--sand)] p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-sm font-medium"
                onClick={() => loadFlats(w.id)}
              >
                <span>Wing {w.name}</span>
                <span className="text-xs text-black/40">View flats</span>
              </button>
              {flatsByWing[w.id] && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {flatsByWing[w.id]!.length === 0 && (
                    <p className="text-xs text-black/40">No flats yet.</p>
                  )}
                  {flatsByWing[w.id]!.map((f) => (
                    <span key={f.id} className="badge">{f.number}</span>
                  ))}
                </div>
              )}
              <form className="mt-2 flex gap-2" onSubmit={(e) => addFlat(w.id, e)}>
                <input
                  className="input !py-1.5 text-sm"
                  placeholder="Flat number"
                  value={newFlat[w.id] ?? ""}
                  onChange={(e) => setNewFlat((m) => ({ ...m, [w.id]: e.target.value }))}
                />
                <button className="btn btn-ghost btn-sm" type="submit">Add flat</button>
              </form>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={addWing}>
            <input
              className="input text-sm"
              placeholder="New wing name (e.g. B)"
              value={newWing}
              onChange={(e) => setNewWing(e.target.value)}
              data-testid="structure-new-wing"
            />
            <button className="btn btn-ghost btn-sm" type="submit">Add wing</button>
          </form>
        </div>
      )}
    </div>
  );
}

export function SocietyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { client, user } = useAuth();
  const [society, setSociety] = useState<SocietyDto | null>(null);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [newBuilding, setNewBuilding] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    client.getSociety(id).then(setSociety).catch(() => undefined);
    client
      .listBuildings(id)
      .then(setBuildings)
      .catch(() => setBuildings([]));
  }, [client, id]);

  if (user?.role !== "superadmin" && user?.tenantId !== id) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!id) return null;
  const societyId = id;

  async function addBuilding(e: FormEvent) {
    e.preventDefault();
    if (!newBuilding.trim()) return;
    setError(null);
    try {
      await client.createBuilding(societyId, newBuilding.trim());
      setNewBuilding("");
      client.listBuildings(societyId).then(setBuildings).catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to add building");
    }
  }

  return (
    <div>
      <Link to="/societies" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--leaf)]">
        <Icon name="back" className="h-4 w-4" />
        All societies
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl">{society?.name ?? "Society"}</h1>
        <p className="mt-1 text-sm text-black/55">
          {[society?.city, society?.pincode].filter(Boolean).join(" · ") || society?.address || ""}
        </p>
        {society?.chairpersonName && (
          <p className="mt-1 text-sm text-black/55">
            Chairperson: {society.chairpersonName}
            {society.chairpersonPhone ? ` · ${society.chairpersonPhone}` : ""}
            {society.chairpersonEmail ? ` · ${society.chairpersonEmail}` : ""}
          </p>
        )}
      </div>

      <h2 className="mb-3 font-semibold">Structure</h2>
      <div className="space-y-4">
        {buildings.map((b) => (
          <BuildingBlock key={b.id} building={b} />
        ))}
        {buildings.length === 0 && (
          <div className="empty-state" data-testid="structure-empty">No buildings added yet.</div>
        )}
      </div>

      <form className="card mt-4 flex flex-wrap items-end gap-2 p-4" onSubmit={addBuilding}>
        <div className="flex-1">
          <label className="label" htmlFor="new-building">Add building</label>
          <input
            id="new-building"
            className="input"
            placeholder="e.g. Tower B"
            value={newBuilding}
            onChange={(e) => setNewBuilding(e.target.value)}
            data-testid="structure-new-building"
          />
        </div>
        <button className="btn btn-primary" type="submit" data-testid="structure-add-building">
          Add building
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
