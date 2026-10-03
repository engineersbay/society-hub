import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SocietyDto } from "@society-hub/types";
import { useAuth } from "./auth";

const SOCIETY_KEY = "sh_manage_society";

type SelectedSocietyState = {
  societies: SocietyDto[];
  selectedSocietyId: string | null;
  selectedSociety: SocietyDto | null;
  loading: boolean;
  setSelectedSocietyId: (id: string) => void;
  refreshSocieties: () => Promise<SocietyDto[]>;
};

const SelectedSocietyContext = createContext<SelectedSocietyState | null>(null);

export function SelectedSocietyProvider({ children }: { children: ReactNode }) {
  const { client, user } = useAuth();
  const [societies, setSocieties] = useState<SocietyDto[]>([]);
  const [selectedSocietyId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(SOCIETY_KEY),
  );
  const [loading, setLoading] = useState(true);

  const refreshSocieties = useCallback(async () => {
    const rows = await client.listSocieties();
    setSocieties(rows);
    setSelectedId((current) => {
      if (current && rows.some((s) => s.id === current)) return current;
      const first = rows[0]?.id ?? null;
      if (first) localStorage.setItem(SOCIETY_KEY, first);
      else localStorage.removeItem(SOCIETY_KEY);
      return first;
    });
    return rows;
  }, [client]);

  useEffect(() => {
    if (!user) {
      setSocieties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refreshSocieties()
      .catch(() => setSocieties([]))
      .finally(() => setLoading(false));
  }, [user, refreshSocieties]);

  function setSelectedSocietyId(id: string) {
    localStorage.setItem(SOCIETY_KEY, id);
    setSelectedId(id);
  }

  const selectedSociety = useMemo(
    () => societies.find((s) => s.id === selectedSocietyId) ?? null,
    [societies, selectedSocietyId],
  );

  return (
    <SelectedSocietyContext.Provider
      value={{
        societies,
        selectedSocietyId,
        selectedSociety,
        loading,
        setSelectedSocietyId,
        refreshSocieties,
      }}
    >
      {children}
    </SelectedSocietyContext.Provider>
  );
}

export function useSelectedSociety() {
  const ctx = useContext(SelectedSocietyContext);
  if (!ctx) throw new Error("useSelectedSociety outside SelectedSocietyProvider");
  return ctx;
}
