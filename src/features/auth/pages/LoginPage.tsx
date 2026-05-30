import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/auth.store";
import client from "@/shared/api/client";

type LoginResponse = {
  data: {
    mfa_required: boolean;
    user_id: string;
    access_token: string;
    refresh_token: string;
  };
};

type MeResponse = {
  data: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_superuser: boolean;
  };
};

/** Superadmin login page. Only staff/superusers can proceed. */
export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post<LoginResponse>("/iam/api/v1/auth/login/", { email, password });
      const { access_token, refresh_token, mfa_required } = res.data.data;

      if (mfa_required) {
        setError("MFA is enabled on this account. Use the main app to complete sign-in.");
        setLoading(false);
        return;
      }

      // fetch full user profile with the new token
      const meRes = await client.get<MeResponse>("/iam/api/v1/profile/me/", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const user = meRes.data.data;

      if (!user.is_staff && !user.is_superuser) {
        setError("Access denied: staff or superuser account required.");
        setLoading(false);
        return;
      }
      setAuth(
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser,
          role: "super-admin",
        },
        access_token,
        refresh_token
      );
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setError(msg ?? "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 24,
          padding: "40px 44px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          border: "1px solid var(--outline)",
        }}
      >
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #e83151, #dba13d)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            S
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.02em",
                color: "var(--on-bg)",
              }}
            >
              Sansaar
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--secondary)",
                marginTop: 1,
              }}
            >
              Super Admin
            </p>
          </div>
        </div>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.03em",
            color: "var(--on-bg)",
            marginBottom: 6,
          }}
        >
          Platform console
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--on-var)",
            marginBottom: 28,
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Staff and superuser accounts only.
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "11px 14px",
              fontSize: 13,
              color: "#991b1b",
              fontFamily: "Manrope, sans-serif",
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--on-mut)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sansaar.org"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--outline)",
                borderRadius: 10,
                fontFamily: "Manrope, sans-serif",
                fontSize: 14,
                outline: "none",
                background: "white",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--outline)")}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--on-mut)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 14px",
                  border: "1px solid var(--outline)",
                  borderRadius: 10,
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--outline)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--on-mut)",
                }}
              >
                <span className="ms" style={{ fontSize: 18 }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px",
              borderRadius: 12,
              background: loading ? "var(--mid)" : "linear-gradient(135deg, #050a26, #121d3f)",
              color: loading ? "var(--on-mut)" : "white",
              border: "none",
              fontFamily: "Manrope, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "all 200ms",
            }}
          >
            {loading ? "Signing in..." : "Sign in to console"}
          </button>
        </form>
      </div>
    </div>
  );
}
