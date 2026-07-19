import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthTokens, Role, UserDto } from "@society-hub/types";
import { createSocietyHubClient, type SocietyHubClient } from "@society-hub/sdk";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * Client App allows society staff, residents, and Manage platform employees.
 * Platform roles (e.g. superadmin) land in Admin mode by default.
 */
const ALLOWED_ROLES: Role[] = [
  "superadmin",
  "chairperson",
  "admin",
  "secretary",
  "treasurer",
  "cashier",
  "committee",
  "resident",
  "tenant",
];

type AuthState = {
  user: UserDto | null;
  client: SocietyHubClient;
  setSession: (user: UserDto, tokens: AuthTokens) => void;
  clearSession: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

const ACCESS_KEY = "sh_web_access";
const REFRESH_KEY = "sh_web_refresh";
const USER_KEY = "sh_web_user";

function isAllowed(user: UserDto) {
  return (ALLOWED_ROLES as string[]).includes(user.role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const client = createSocietyHubClient({
    baseUrl: API_URL,
    getAccessToken: () => localStorage.getItem(ACCESS_KEY),
    getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
    onTokens: (tokens) => {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    },
  });

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    const access = localStorage.getItem(ACCESS_KEY);
    if (raw && access) {
      try {
        const parsed = JSON.parse(raw) as UserDto;
        if (!isAllowed(parsed)) {
          clearStorage();
          setLoading(false);
          return;
        }
        setUser(parsed);
        client
          .me()
          .then((me) => {
            if (!isAllowed(me)) {
              clearStorage();
              setUser(null);
              return;
            }
            setUser(me);
            localStorage.setItem(USER_KEY, JSON.stringify(me));
          })
          .catch(() => {
            clearStorage();
            setUser(null);
          })
          .finally(() => setLoading(false));
        return;
      } catch {
        clearStorage();
      }
    }
    setLoading(false);
  }, []);

  function clearStorage() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function setSession(next: UserDto, tokens: AuthTokens) {
    if (!isAllowed(next)) {
      clearStorage();
      setUser(null);
      throw new Error("ROLE_NOT_ALLOWED");
    }
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  }

  function clearSession() {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh) {
      void client.logout(refresh).catch(() => undefined);
    }
    clearStorage();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, client, setSession, clearSession, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
