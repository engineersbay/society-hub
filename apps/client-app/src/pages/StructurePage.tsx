import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { BuildingDto, FlatDto, SocietyDto, WingDto } from "@society-hub/types";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { canUseAdminMode } from "../app-mode";
import { Icon } from "../components/icons";

function BuildingBlock({ building }: { building: BuildingDto }) {
  const { client } = useAuth();
  const [wings, setWings] = useState<WingDto[]>([]);
  const [flatsByWing, setFlatsByWing] = useState<Record<string, FlatDto[]>>({});
  const [newWing, setNewWing] = useState("");
  const [draft, setDraft] = useState<
    Record<string, { number: string; floor: string; parkingSlot: string }>
  >({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const d = draft[wingId] ?? { number: "", floor: "", parkingSlot: "" };
    if (!d.number.trim()) return;
    setError(null);
    try {
      await client.createFlat(wingId, {
        number: d.number.trim(),
        floor: d.floor === "" ? null : Number(d.floor),
        parkingSlot: d.parkingSlot.trim() || null,
      });
      setDraft((m) => ({ ...m, [wingId]: { number: "", floor: "", parkingSlot: "" } }));
      loadFlats(wingId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to add flat");
    }
  }

  return (
    <div className="card p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid="structure-building-toggle"
      >
        <span className="text-sm font-semibold">{building.name}</span>
        <Icon name="chevronDown" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {wings.map((w) => {
            const d = draft[w.id] ?? { number: "", floor: "", parkingSlot: "" };
            const flats = flatsByWing[w.id];
            const byFloor = new Map<number | "unset", FlatDto[]>();
            (flats ?? []).forEach((f) => {
              const key = f.floor ?? "unset";
              const list = byFloor.get(key) ?? [];
              list.push(f);
              byFloor.set(key, list);
            });

            return (
              <div key={w.id} className="rounded-lg border border-[var(--sand)] p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm font-medium"
                  onClick={() => loadFlats(w.id)}
                >
                  <span>Wing {w.name}</span>
                  <span className="text-xs text-black/40">View flats by floor</span>
                </button>
                {flats && (
                  <div className="mt-2 space-y-2">
                    {flats.length === 0 && (
                      <p className="text-xs text-black/40">No flats yet.</p>
                    )}
                    {[...byFloor.entries()].map(([floor, list]) => (
                      <div key={String(floor)}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-black/40">
                          {floor === "unset" ? "No floor set" : `Floor ${floor}`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {list.map((f) => (
                            <span key={f.id} className="badge" title={f.parkingSlot ?? undefined}>
                              {f.number}
                              {f.parkingSlot ? ` · ${f.parkingSlot}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  className="mt-3 grid gap-2 sm:grid-cols-4"
                  onSubmit={(e) => addFlat(w.id, e)}
                  data-testid="structure-add-flat-form"
                >
                  <input
                    className="input !py-1.5 text-sm"
                    placeholder="Flat no."
                    value={d.number}
                    onChange={(e) =>
                      setDraft((m) => ({ ...m, [w.id]: { ...d, number: e.target.value } }))
                    }
                    required
                  />
                  <input
                    className="input !py-1.5 text-sm"
                    placeholder="Floor"
                    inputMode="numeric"
                    value={d.floor}
                    onChange={(e) =>
                      setDraft((m) => ({ ...m, [w.id]: { ...d, floor: e.target.value } }))
                    }
                  />
                  <input
                    className="input !py-1.5 text-sm"
                    placeholder="Parking slot"
                    value={d.parkingSlot}
                    onChange={(e) =>
                      setDraft((m) => ({
                        ...m,
                        [w.id]: { ...d, parkingSlot: e.target.value },
                      }))
                    }
                  />
                  <button className="btn btn-ghost btn-sm" type="submit">
                    Add flat
                  </button>
                </form>
              </div>
            );
          })}
          <form className="flex gap-2" onSubmit={addWing}>
            <input
              className="input text-sm"
              placeholder="New wing name (e.g. B)"
              value={newWing}
              onChange={(e) => setNewWing(e.target.value)}
              data-testid="structure-new-wing"
            />
            <button className="btn btn-ghost btn-sm" type="submit">
              Add wing
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function StructurePage() {
  const { client, user } = useAuth();
  const [society, setSociety] = useState<SocietyDto | null>(null);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [newBuilding, setNewBuilding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const allowed = canUseAdminMode(user?.role);
  const tenantId = user?.tenantId;

  useEffect(() => {
    if (!allowed || !tenantId) return;
    client.getSociety(tenantId).then(setSociety).catch(() => undefined);
    client
      .listBuildings(tenantId)
      .then(setBuildings)
      .catch(() => setBuildings([]));
  }, [client, tenantId, allowed]);

  if (!allowed || !tenantId) return <Navigate to="/dashboard" replace />;
  const societyId = tenantId;

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
      <div className="mb-4">
        <h1 className="font-display text-xl sm:text-2xl">{society?.name ?? "Society structure"}</h1>
        <p className="mt-0.5 text-sm text-black/55">
          Buildings → wings → floors → flats. Needed so residents raise tickets on the right flat.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold">Buildings</h2>
      <div className="space-y-2">
        {buildings.map((b) => (
          <BuildingBlock key={b.id} building={b} />
        ))}
        {buildings.length === 0 && (
          <div className="empty-state" data-testid="structure-empty">
            No buildings added yet.
          </div>
        )}
      </div>

      <form className="card mt-4 flex flex-wrap items-end gap-2 p-4" onSubmit={addBuilding}>
        <div className="flex-1">
          <label className="label" htmlFor="new-building">
            Add building
          </label>
          <input
            id="new-building"
            className="input"
            value={newBuilding}
            onChange={(e) => setNewBuilding(e.target.value)}
            placeholder="Tower A"
            data-testid="structure-new-building"
          />
        </div>
        <button className="btn btn-primary" type="submit" data-testid="structure-add-building">
          Add
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
