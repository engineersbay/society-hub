import { useEffect, useRef, useState } from "react";
import { useSelectedSociety } from "../selected-society";
import { Icon } from "./icons";

export function SocietySwitcher() {
  const {
    societies,
    selectedSociety,
    selectedSocietyId,
    setSelectedSocietyId,
    loading,
  } = useSelectedSociety();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = societies.filter((s) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      s.name.toLowerCase().includes(needle) ||
      s.id.toLowerCase().includes(needle) ||
      (s.city ?? "").toLowerCase().includes(needle)
    );
  });

  const letter = (selectedSociety?.name ?? "S").slice(0, 1).toUpperCase();

  return (
    <div className="relative px-3 pb-2" ref={boxRef}>
      <button
        type="button"
        data-testid="society-switcher"
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--sand)] bg-white px-2 py-2 text-left shadow-[0_1px_4px_1px_rgba(184,115,51,0.2)] hover:border-[var(--leaf)]"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--sand)] bg-[var(--mist)]/50 text-xs font-bold text-[var(--leaf-dark)]">
          {letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-black/45">
            Society
          </span>
          <span className="block truncate text-sm font-semibold text-[var(--ink)]">
            {loading
              ? "Loading…"
              : selectedSociety?.name ?? (societies.length ? "Select society" : "No societies")}
          </span>
        </span>
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-black/45" />
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 top-full z-30 mt-1 max-h-80 overflow-hidden rounded-lg border border-[var(--sand)] bg-white shadow-lg sm:left-0 sm:right-auto sm:w-[22rem]"
          data-testid="society-switcher-panel"
        >
          {societies.length > 6 && (
            <div className="border-b border-[var(--sand)] p-2">
              <input
                className="input w-full text-sm"
                placeholder="Filter societies…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                data-testid="society-switcher-filter"
              />
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-black/45">No societies match.</li>
            )}
            {filtered.map((s) => {
              const selected = s.id === selectedSocietyId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    data-testid="society-switcher-option"
                    className={[
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--mist)]/70",
                      selected
                        ? "bg-[var(--mist)]/50 font-semibold text-[var(--leaf-dark)] shadow-[0_1px_4px_2px_rgba(184,115,51,0.2)]"
                        : "",
                    ].join(" ")}
                    onClick={() => {
                      setSelectedSocietyId(s.id);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--sand)] bg-[var(--mist)]/40 text-[10px] font-bold">
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-[10px] text-black/40">
                        {s.city ? `${s.city} · ` : ""}
                        {s.id.slice(0, 8)}…
                        {s.status === "suspended" ? " · Suspended" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
