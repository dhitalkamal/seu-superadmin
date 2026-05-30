import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SUPERADMIN_AUTH_STORAGE_KEY = "sansaar-superadmin-auth";
const LEGACY_AUTH_STORAGE_KEY = "sansaar-auth";

function migrateLegacyAuthStorage(): void {
  const hasSuperadminAuth = localStorage.getItem(SUPERADMIN_AUTH_STORAGE_KEY);
  if (hasSuperadminAuth) return;

  const legacyAuth = localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
  if (!legacyAuth) return;

  localStorage.setItem(SUPERADMIN_AUTH_STORAGE_KEY, legacyAuth);
}

migrateLegacyAuthStorage();

type Role =
  | "attendee"
  | "organizer"
  | "super-admin"
  | "platform-mgr"
  | "compliance"
  | "fin-admin"
  | "support"
  | "moderator";

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  // django admin flags - present when the IAM service includes them in the token payload
  is_staff?: boolean;
  is_superuser?: boolean;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  /** Updates only the tokens after a silent refresh, does not touch user or isAuthenticated. */
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
};

/** Persisted auth store -- survives page refresh via localStorage. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      updateTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: SUPERADMIN_AUTH_STORAGE_KEY }
  )
);
