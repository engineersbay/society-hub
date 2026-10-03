import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ManageViewAs = "admin" | "tenant";

const VIEW_KEY = "sh_manage_view_as";

type ViewAsState = {
  viewAs: ManageViewAs;
  setViewAs: (mode: ManageViewAs) => void;
};

const ViewAsContext = createContext<ViewAsState | null>(null);

function readStored(): ManageViewAs {
  const raw = localStorage.getItem(VIEW_KEY);
  return raw === "tenant" ? "tenant" : "admin";
}

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<ManageViewAs>(readStored);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, viewAs);
  }, [viewAs]);

  function setViewAs(mode: ManageViewAs) {
    setViewAsState(mode);
  }

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs outside ViewAsProvider");
  return ctx;
}
