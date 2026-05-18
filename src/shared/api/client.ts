import axios from "axios";

/** Axios instance pointed at the Nginx gateway. */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  // Read from Zustand persisted store (key: sansaar-auth)
  try {
    const raw = localStorage.getItem("sansaar-auth");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // storage unavailable; proceed without auth header
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sansaar-auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
