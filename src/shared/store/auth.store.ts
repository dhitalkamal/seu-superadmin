import { create } from "zustand";
import { persist } from "zustand/middleware";

type Role =
  | "attendee"
  | "organiser"
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
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
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
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "sansaar-auth" }
  )
);
