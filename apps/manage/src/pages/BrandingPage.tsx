import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";

const DEFAULT_COLOR = "#2F5D3A";

export function BrandingPage() {
  const { client, user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId, refreshSocieties } = useSelectedSociety();
  const [enabled, setEnabled] = useState(false);
  const [brandColor, setBrandColor] = useState(DEFAULT_COLOR);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState({ enabled: false, brandColor: DEFAULT_COLOR, logoPath: null as string | null });

  useEffect(() => {
    if (!selectedSociety) return;
    const next = {
      enabled: Boolean(selectedSociety.brandingEnabled),
      brandColor: selectedSociety.brandColor || DEFAULT_COLOR,
      logoPath: selectedSociety.brandLogoBlobPath ?? null,
    };
    setEnabled(next.enabled);
    setBrandColor(next.brandColor);
    setLogoPath(next.logoPath);
    setSaved(next);
  }, [selectedSociety]);

  const dirty = useMemo(
    () =>
      enabled !== saved.enabled ||
      brandColor !== saved.brandColor ||
      logoPath !== saved.logoPath,
    [enabled, brandColor, logoPath, saved],
  );

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selectedSocietyId) return;
    setError(null);
    setMsg(null);
    try {
      await client.updateManageSocietySettings(selectedSocietyId, {
        brandingEnabled: enabled,
        brandColor,
        brandLogoBlobPath: logoPath,
      });
      setSaved({ enabled, brandColor, logoPath });
      await refreshSocieties();
      setMsg("Branding saved");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to save");
    }
  }

  const letter = (selectedSociety?.name ?? "S").slice(0, 1).toUpperCase();

  return (
    <div data-testid="manage-branding-page">
      <h1 className="font-display text-2xl">Branding</h1>
      <p className="mt-1 text-sm text-black/55">
        Logo and brand color for {selectedSociety?.name ?? "this society"} in the Client App.
      </p>
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
      {msg && <p className="mt-2 text-sm text-[var(--leaf)]">{msg}</p>}

      <form className="mt-4 grid gap-6 lg:grid-cols-2" onSubmit={save}>
        <div className="card space-y-4 p-5">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>White-label Client App</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              data-testid="branding-enabled"
            />
          </label>
          <div>
            <label className="label" htmlFor="brand-color">
              Brand color
            </label>
            <div className="flex gap-2">
              <input
                id="brand-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-[var(--sand)]"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                data-testid="branding-color"
              />
              <input
                className="input flex-1"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                required={enabled}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="brand-logo">
              Brand logo path
            </label>
            <input
              id="brand-logo"
              className="input"
              placeholder="uploads/… or leave blank for letter mark"
              value={logoPath ?? ""}
              onChange={(e) => setLogoPath(e.target.value || null)}
              data-testid="branding-logo-path"
            />
            <p className="mt-1 text-xs text-black/45">
              Upload via society media later; paste a stored blob path for now.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={!dirty}>
              Save branding
            </button>
            {dirty && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEnabled(saved.enabled);
                  setBrandColor(saved.brandColor);
                  setLogoPath(saved.logoPath);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="card p-5" data-testid="branding-preview">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/45">
            Client App preview
          </p>
          <div
            className="rounded-xl border border-[var(--sand)] p-4"
            style={enabled ? { borderColor: brandColor } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: enabled ? brandColor : "var(--leaf-dark)" }}
              >
                {letter}
              </div>
              <div>
                <p className="font-display text-lg" style={enabled ? { color: brandColor } : undefined}>
                  {enabled ? selectedSociety?.name : "SocietyHub"}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
                  {enabled ? "Resident portal" : "Client App"}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn mt-4 text-sm text-white"
              style={{ background: enabled ? brandColor : "var(--saffron)" }}
            >
              Primary action
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
