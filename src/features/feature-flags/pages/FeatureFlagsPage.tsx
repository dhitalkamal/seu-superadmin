import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";
import type { FeatureFlag } from "@/shared/api/superadmin.api";

/** Available subscription plans for scoping flags. */
const PLANS = ["free", "starter", "professional", "enterprise", "unlimited"];

/** Create flag form state. */
type CreateForm = {
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  enabled_plans: string[];
};

/** Feature flags wired to the real IAM API. Supports create, toggle, scope, and delete. */
export default function FeatureFlagsPage() {
  const { toast, toastEl } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    key: "",
    name: "",
    description: "",
    is_enabled: true,
    enabled_plans: [],
  });

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: superadminApi.listFeatureFlags,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      superadminApi.createFeatureFlag({
        key: form.key,
        name: form.name,
        description: form.description,
        is_enabled: form.is_enabled,
        enabled_plans: form.enabled_plans,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag created");
      setShowCreate(false);
      setForm({ key: "", name: "", description: "", is_enabled: true, enabled_plans: [] });
    },
    onError: () => toast("Failed to create flag"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, is_enabled }: { key: string; is_enabled: boolean }) =>
      superadminApi.updateFeatureFlag(key, { is_enabled }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast(`Flag ${vars.is_enabled ? "enabled" : "disabled"}`);
    },
    onError: () => toast("Update failed"),
  });

  const plansMutation = useMutation({
    mutationFn: ({ key, enabled_plans }: { key: string; enabled_plans: string[] }) =>
      superadminApi.updateFeatureFlag(key, { enabled_plans }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Plans updated");
    },
    onError: () => toast("Update failed"),
  });

  const killMutation = useMutation({
    mutationFn: async (key: string) => {
      await superadminApi.updateFeatureFlag(key, { is_enabled: false, enabled_plans: [], enabled_org_ids: [] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag kill-switched");
    },
    onError: () => toast("Kill-switch failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => superadminApi.deleteFeatureFlag(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag deleted");
    },
    onError: () => toast("Delete failed"),
  });

  const activeCount = flags.filter((f) => f.is_enabled).length;
  const scopedCount = flags.filter((f) => f.enabled_plans.length > 0).length;

  /** Toggle a plan in a flag's enabled_plans list. */
  function togglePlan(flag: FeatureFlag, plan: string) {
    const current = flag.enabled_plans ?? [];
    const next = current.includes(plan) ? current.filter((p) => p !== plan) : [...current, plan];
    plansMutation.mutate({ key: flag.key, enabled_plans: next });
  }

  return (
    <AdminLayout crumbs={["Trust", "Feature Flags"]}>
      {toastEl}
      <PH
        title="Feature flags"
        sub="Toggle platform features, scope to plans or organizations. Changes apply within 60 seconds."
        actions={
          <>
            <button className="btn-sm" onClick={() => setShowCreate((v) => !v)}>
              <MS n="add" size={13} />
              New flag
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI icon="toggle_on" color="lav" label="Active flags" value={String(activeCount)} />
        <KPI icon="tune" color="mnt" label="Plan-scoped" value={String(scopedCount)} trend="limited to specific plans" />
        <KPI icon="flag" color="pch" label="Total flags" value={String(flags.length)} />
        <KPI icon="toggle_off" color="crl" label="Disabled" value={String(flags.length - activeCount)} />
      </div>

      {/* create flag form */}
      {showCreate && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <span className="panel-title">New feature flag</span>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="ff-key" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Key (snake_case) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="ff-key"
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. enable_khalti_payments"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="ff-name" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="ff-name"
                  type="text"
                  className="input"
                  required
                  placeholder="Human-readable name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label htmlFor="ff-desc" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Description
              </label>
              <input
                id="ff-desc"
                type="text"
                className="input"
                placeholder="What does this flag control?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Enabled</label>
              <div
                className={`toggle ${form.is_enabled ? "on" : "off"}`}
                onClick={() => setForm((f) => ({ ...f, is_enabled: !f.is_enabled }))}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Enabled for plans
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="btn-sm"
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: form.enabled_plans.includes(p) ? "#050a26" : "white",
                      color: form.enabled_plans.includes(p) ? "white" : "var(--on-bg)",
                      borderColor: form.enabled_plans.includes(p) ? "transparent" : undefined,
                    }}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        enabled_plans: f.enabled_plans.includes(p)
                          ? f.enabled_plans.filter((x) => x !== p)
                          : [...f.enabled_plans, p],
                      }))
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--on-mut)", marginTop: 4 }}>
                Leave empty to enable for all plans.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn-sm"
                onClick={() => {
                  setShowCreate(false);
                  setForm({ key: "", name: "", description: "", is_enabled: true, enabled_plans: [] });
                }}
              >
                Cancel
              </button>
              <button
                className="btn-sm primary"
                disabled={!form.key.trim() || !form.name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create flag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* loading state */}
      {isLoading && (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}>
          Loading feature flags...
        </div>
      )}

      {/* empty state */}
      {!isLoading && flags.length === 0 && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <MS n="toggle_on" size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.25 }} />
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            No feature flags yet
          </p>
          <p style={{ fontSize: 13, color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}>
            Click &quot;New flag&quot; above to create your first feature flag.
          </p>
        </div>
      )}

      {/* flag cards */}
      {flags.map((f: FeatureFlag) => (
        <div key={f.key} className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-body" style={{ padding: "16px 20px" }}>
            {/* header row: name + toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 16, letterSpacing: "-0.025em" }}>
                    {f.name}
                  </span>
                  <span className={`pill ${f.is_enabled ? "active" : "draft"}`}>
                    {f.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                  {f.enabled_plans.length > 0 && (
                    <span className="pill pending">{f.enabled_plans.length} plan{f.enabled_plans.length > 1 ? "s" : ""}</span>
                  )}
                </div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--on-mut)" }}>
                  {f.key}
                </span>
                {f.description && (
                  <p style={{ fontSize: 12.5, color: "var(--on-var)", marginTop: 4, lineHeight: 1.4 }}>
                    {f.description}
                  </p>
                )}
              </div>
              <div
                className={`toggle ${f.is_enabled ? "on" : "off"}`}
                onClick={() =>
                  !toggleMutation.isPending &&
                  toggleMutation.mutate({ key: f.key, is_enabled: !f.is_enabled })
                }
              />
            </div>

            {/* plan scope */}
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--outline)", marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
                Plan scope
              </span>
              <p style={{ fontSize: 11, color: "var(--on-mut)", marginBottom: 8 }}>
                {f.enabled_plans.length === 0 ? "All plans (no restriction)" : `Restricted to: ${f.enabled_plans.join(", ")}`}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PLANS.map((p) => (
                  <button
                    key={p}
                    className="btn-sm"
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      background: f.enabled_plans.includes(p) ? "#050a26" : "white",
                      color: f.enabled_plans.includes(p) ? "white" : "var(--on-bg)",
                      borderColor: f.enabled_plans.includes(p) ? "transparent" : undefined,
                    }}
                    disabled={plansMutation.isPending}
                    onClick={() => togglePlan(f, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* org scope + meta */}
            <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: "1px solid var(--outline)", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
                  Org scope
                </span>
                <p style={{ fontSize: 11.5, color: "var(--on-var)", marginTop: 2 }}>
                  {f.enabled_org_ids.length === 0 ? "All organizations" : `${f.enabled_org_ids.length} org(s)`}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
                  Created
                </span>
                <p style={{ fontSize: 11.5, color: "var(--on-var)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                  {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>
                  Updated
                </span>
                <p style={{ fontSize: 11.5, color: "var(--on-var)", marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                  {new Date(f.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "flex-start" }}>
                <button
                  className="btn-sm danger"
                  disabled={killMutation.isPending}
                  onClick={() => killMutation.mutate(f.key)}
                >
                  <MS n="emergency_home" size={13} />
                  Kill
                </button>
                <button
                  className="btn-sm"
                  style={{ fontSize: 11 }}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete flag "${f.key}"?`)) deleteMutation.mutate(f.key);
                  }}
                >
                  <MS n="delete" size={13} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </AdminLayout>
  );
}
