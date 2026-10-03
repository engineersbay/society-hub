import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiClientError } from "@society-hub/sdk";
import { useAuth } from "../auth";
import { useSelectedSociety } from "../selected-society";
import { useViewAs } from "../view-as";

const DEFAULT_PRIMARY = "#2F5D3A";
const DEFAULT_SECONDARY = "#C4A880";
const DEFAULT_TERTIARY = "#616161";
const ROOT_DOMAIN = import.meta.env.VITE_SOCIETYHUB_ROOT_DOMAIN ?? "localhost:5173";

type BrandingTab = "theme" | "media";

type ThemeState = {
  enabled: boolean;
  primary: string;
  secondary: string;
  tertiary: string;
};

type MediaState = {
  logoLight: string;
  logoDark: string;
  icon: string;
};

function ColorRow({
  id,
  label,
  value,
  saved,
  onChange,
  onUndo,
  required,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  saved: string;
  onChange: (next: string) => void;
  onUndo: () => void;
  required?: boolean;
  testId?: string;
}) {
  const dirty = value !== saved;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="label mb-0" htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </label>
        {dirty && (
          <button type="button" className="text-xs font-medium text-[var(--leaf)]" onClick={onUndo}>
            Undo
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          id={id}
          type="color"
          className="h-10 w-14 cursor-pointer rounded border border-[var(--sand)]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
        <input
          className="input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
          required={required}
        />
      </div>
    </div>
  );
}

function MediaSlot({
  label,
  value,
  onChange,
  testId,
  hint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  testId: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--sand)] bg-[var(--mist)]/30 p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-black/45">{hint}</p>
      <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-[var(--sand)] bg-white">
        {value ? (
          <p className="max-w-full truncate px-3 text-xs text-black/55">{value}</p>
        ) : (
          <p className="text-xs text-black/35">No image yet</p>
        )}
      </div>
      <input
        className="input mt-3"
        placeholder="Blob path or https://…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
    </div>
  );
}

export function BrandingPage() {
  const { client, user } = useAuth();
  const { viewAs } = useViewAs();
  const { selectedSociety, selectedSocietyId, refreshSocieties } = useSelectedSociety();
  const [tab, setTab] = useState<BrandingTab>("theme");
  const [theme, setTheme] = useState<ThemeState>({
    enabled: false,
    primary: DEFAULT_PRIMARY,
    secondary: DEFAULT_SECONDARY,
    tertiary: DEFAULT_TERTIARY,
  });
  const [media, setMedia] = useState<MediaState>({
    logoLight: "",
    logoDark: "",
    icon: "",
  });
  const [savedTheme, setSavedTheme] = useState(theme);
  const [savedMedia, setSavedMedia] = useState(media);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSociety) return;
    const nextTheme: ThemeState = {
      enabled: Boolean(selectedSociety.brandingEnabled),
      primary: selectedSociety.brandColor || DEFAULT_PRIMARY,
      secondary: selectedSociety.brandSecondaryColor || DEFAULT_SECONDARY,
      tertiary: selectedSociety.brandTertiaryColor || DEFAULT_TERTIARY,
    };
    const nextMedia: MediaState = {
      logoLight: selectedSociety.brandLogoBlobPath ?? "",
      logoDark: selectedSociety.brandLogoDarkBlobPath ?? "",
      icon: selectedSociety.brandIconBlobPath ?? "",
    };
    setTheme(nextTheme);
    setMedia(nextMedia);
    setSavedTheme(nextTheme);
    setSavedMedia(nextMedia);
  }, [selectedSociety]);

  const themeDirty = useMemo(
    () =>
      theme.enabled !== savedTheme.enabled ||
      theme.primary !== savedTheme.primary ||
      theme.secondary !== savedTheme.secondary ||
      theme.tertiary !== savedTheme.tertiary,
    [theme, savedTheme],
  );
  const mediaDirty = useMemo(
    () =>
      media.logoLight !== savedMedia.logoLight ||
      media.logoDark !== savedMedia.logoDark ||
      media.icon !== savedMedia.icon,
    [media, savedMedia],
  );
  const dirty = themeDirty || mediaDirty;

  if (user?.role !== "superadmin") return <Navigate to="/login" replace />;
  if (viewAs !== "tenant") return <Navigate to="/dashboard" replace />;
  if (!selectedSocietyId) return <Navigate to="/societies" replace />;

  async function persist() {
    if (!selectedSocietyId) return;
    if (theme.enabled && !theme.primary) {
      setError("Primary brand color is required when white-label is on");
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await client.updateManageSocietySettings(selectedSocietyId, {
        brandingEnabled: theme.enabled,
        brandColor: theme.primary,
        brandSecondaryColor: theme.secondary || null,
        brandTertiaryColor: theme.tertiary || null,
        brandLogoBlobPath: media.logoLight || null,
        brandLogoDarkBlobPath: media.logoDark || null,
        brandIconBlobPath: media.icon || null,
      });
      setSavedTheme(theme);
      setSavedMedia(media);
      await refreshSocieties();
      setMsg("Branding saved");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body.message : "Failed to save");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    await persist();
  }

  function resetAll() {
    setTheme(savedTheme);
    setMedia(savedMedia);
  }

  const letter = (selectedSociety?.name ?? "S").slice(0, 1).toUpperCase();
  const previewColor = theme.enabled ? theme.primary : DEFAULT_PRIMARY;

  return (
    <div data-testid="manage-branding-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Branding</h1>
          <p className="mt-1 text-sm text-black/55">
            Manage Client App branding for {selectedSociety?.name ?? "this society"}.
          </p>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={resetAll}>
              Reset all
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void persist()}
              data-testid="branding-save"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
      {msg && <p className="mt-2 text-sm text-[var(--leaf)]">{msg}</p>}

      <div className="mt-4 flex gap-1 border-b border-[var(--sand)]">
        {(
          [
            ["theme", "Theme"],
            ["media", "Media"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`branding-tab-${id}`}
            className={[
              "px-4 py-2 text-sm font-medium",
              tab === id
                ? "border-b-2 border-[var(--leaf)] text-[var(--leaf-dark)]"
                : "text-black/50 hover:text-[var(--leaf-dark)]",
            ].join(" ")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="mt-5" onSubmit={save}>
        {tab === "theme" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card space-y-4 p-5" data-testid="branding-theme-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Theme</p>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>White-label Client App</span>
                <input
                  type="checkbox"
                  checked={theme.enabled}
                  onChange={(e) => setTheme((t) => ({ ...t, enabled: e.target.checked }))}
                  data-testid="branding-enabled"
                />
              </label>
              <ColorRow
                id="brand-primary"
                label="Primary color"
                value={theme.primary}
                saved={savedTheme.primary}
                onChange={(primary) => setTheme((t) => ({ ...t, primary }))}
                onUndo={() => setTheme((t) => ({ ...t, primary: savedTheme.primary }))}
                required={theme.enabled}
                testId="branding-color"
              />
              <ColorRow
                id="brand-secondary"
                label="Secondary color"
                value={theme.secondary}
                saved={savedTheme.secondary}
                onChange={(secondary) => setTheme((t) => ({ ...t, secondary }))}
                onUndo={() => setTheme((t) => ({ ...t, secondary: savedTheme.secondary }))}
              />
              <ColorRow
                id="brand-tertiary"
                label="Tertiary color"
                value={theme.tertiary}
                saved={savedTheme.tertiary}
                onChange={(tertiary) => setTheme((t) => ({ ...t, tertiary }))}
                onUndo={() => setTheme((t) => ({ ...t, tertiary: savedTheme.tertiary }))}
              />
              <p className="text-xs text-black/45">
                Client App uses primary for active nav and primary buttons. Secondary and tertiary
                are stored for future theming.
              </p>
            </div>

            <div className="card space-y-4 p-5" data-testid="branding-preview">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                Live preview
              </p>
              <div
                className="rounded-xl border-2 p-4"
                style={{ borderColor: theme.enabled ? theme.primary : "var(--sand)" }}
              >
                <div className="mb-2 flex justify-end">
                  <span className="rounded bg-[var(--mist)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--leaf-dark)]">
                    Default
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ background: previewColor }}
                  >
                    {letter}
                  </div>
                  <div>
                    <p className="font-display text-lg" style={{ color: previewColor }}>
                      {theme.enabled ? selectedSociety?.name : "SocietyHub"}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                      {(selectedSociety?.slug || "society")}.{ROOT_DOMAIN}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                    style={{ background: theme.primary }}
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                    style={{ background: theme.secondary }}
                  >
                    Secondary
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                    style={{ background: theme.tertiary }}
                  >
                    Tertiary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "media" && (
          <div data-testid="branding-media-card">
            <p className="mb-4 text-sm text-black/55">
              Customize images shown in the Client App. Logo light is required for a full white-label
              mark; without it the shell shows a letter from the society name.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MediaSlot
                label="Logo light"
                hint="Used on light Client App chrome"
                value={media.logoLight}
                onChange={(logoLight) => setMedia((m) => ({ ...m, logoLight }))}
                testId="branding-logo-path"
              />
              <MediaSlot
                label="Logo dark"
                hint="Optional dark-surface logo"
                value={media.logoDark}
                onChange={(logoDark) => setMedia((m) => ({ ...m, logoDark }))}
                testId="branding-logo-dark-path"
              />
              <MediaSlot
                label="Icon"
                hint="Square mark / favicon-style"
                value={media.icon}
                onChange={(icon) => setMedia((m) => ({ ...m, icon }))}
                testId="branding-icon-path"
              />
            </div>
          </div>
        )}

        {dirty && (
          <div className="mt-5 flex gap-2 lg:hidden">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetAll}>
              Reset all
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
