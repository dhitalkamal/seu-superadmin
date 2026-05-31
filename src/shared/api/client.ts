import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { SUPERADMIN_AUTH_STORAGE_KEY, useAuthStore } from "@/shared/store/auth.store";

const LEGACY_AUTH_STORAGE_KEY = "sansaar-auth";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost";

function getAuthBlob(): string | null {
  return (
    localStorage.getItem(SUPERADMIN_AUTH_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
  );
}

/** Axios instance pointed at the Nginx gateway. */
const client = axios.create({
  baseURL: API_BASE,
  adapter: "fetch",
});

// json by default, but let axios auto-detect for FormData uploads
client.interceptors.request.use((config) => {
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = config.headers["Content-Type"] ?? "application/json";
  }
  return config;
});

// prevents multiple refresh calls when several requests 401 at once
let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function getAuthState(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = getAuthBlob();
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string; refreshToken?: string } };
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function setTokens(accessToken: string, refreshToken: string): void {
  // update localStorage directly so getAuthState reads the new values immediately
  try {
    const raw = getAuthBlob();
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
    parsed.state.refreshToken = refreshToken;
    localStorage.setItem(SUPERADMIN_AUTH_STORAGE_KEY, JSON.stringify(parsed));
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  } catch {
    // storage unavailable
  }
  // keep Zustand in-memory state in sync so any store readers get fresh tokens
  useAuthStore.getState().updateTokens(accessToken, refreshToken);
}

function forceLogout(): void {
  localStorage.removeItem(SUPERADMIN_AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  window.location.href = "/login";
}

// attach access token to every request
client.interceptors.request.use((config) => {
  const { accessToken } = getAuthState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// on 401: try to refresh the token silently before logging out
client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // only handle 401s, skip if already retried or if this IS the refresh call
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/token/refresh/")
    ) {
      // non-401 errors or refresh endpoint failed - force logout on auth errors
      if (error.response?.status === 401) forceLogout();
      return Promise.reject(error);
    }

    const { refreshToken } = getAuthState();
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    // if another request is already refreshing, queue this one
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retry = true;
            resolve(client(originalRequest));
          },
          reject: (err: unknown) => reject(err),
        });
        // safety timeout - reject queued requests if refresh takes too long
        setTimeout(() => reject(error), 10000);
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const res = await axios.post(`${API_BASE}/iam/api/v1/auth/token/refresh/`, {
        refresh: refreshToken,
      });
      const newAccess: string = res.data?.data?.access ?? res.data?.access;
      const newRefresh: string = res.data?.data?.refresh ?? res.data?.refresh ?? refreshToken;

      setTokens(newAccess, newRefresh);

      // retry all queued requests with the new token
      pendingQueue.forEach((p) => p.resolve(newAccess));
      pendingQueue = [];

      // retry the original request
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return client(originalRequest);
    } catch (refreshError) {
      pendingQueue.forEach((p) => p.reject(refreshError));
      pendingQueue = [];
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
