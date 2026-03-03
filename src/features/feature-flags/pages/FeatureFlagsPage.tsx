import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { SparkLine } from "@/shared/components/charts";
import superadminApi from "@/shared/api/superadmin.api";
import type { FeatureFlag } from "@/shared/api/superadmin.api";

/** Create flag form state. */
type CreateForm = {
  key: string;
  label: string;
  enabled: boolean;
  rollout_percentage: number;
};

/** Risk label derived from rollout percentage for display. */
function riskLevel(pct: number): string {
  if (pct === 0) return "off";
  if (pct < 25) return "high";
  if (pct < 75) return "med";
  return "low";
}

/** Feature flags wired to the real IAM API. Supports create, toggle, rollout, and delete. */
export default function FeatureFlagsPage() {
  const { toast, toastEl } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    key: "",
    label: "",
    enabled: true,
    rollout_percentage: 0,
  });

  // fetch all flags from the real IAM backend
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: superadminApi.listFeatureFlags,
  });

  // create a new flag
  const createMutation = useMutation({
    mutationFn: () =>
      superadminApi.createFeatureFlag({
        key: form.key,
        label: form.label,
        enabled: form.enabled,
        rollout_percentage: form.rollout_percentage,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag created");
      setShowCreate(false);
      setForm({ key: "", label: "", enabled: true, rollout_percentage: 0 });
    },
    onError: () => toast("Failed to create flag"),
  });

  // toggle enabled state for a flag
  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      superadminApi.updateFeatureFlag(key, { enabled }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast(`Flag ${vars.enabled ? "enabled" : "disabled"}`);
    },
    onError: () => toast("Update failed"),
  });

  // update rollout percentage for a flag
  const rolloutMutation = useMutation({
    mutationFn: ({ key, pct }: { key: string; pct: number }) =>
      superadminApi.updateFeatureFlag(key, { rollout_percentage: pct }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast(`Rollout set to ${vars.pct}%`);
    },
    onError: () => toast("Update failed"),
  });

  // kill-switch: disable and zero out rollout
  const killMutation = useMutation({
    mutationFn: async (key: string) => {
      await superadminApi.updateFeatureFlag(key, { enabled: false, rollout_percentage: 0 });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag kill-switched");
    },
    onError: () => toast("Kill-switch failed"),
  });

  // delete a flag permanently
  const deleteMutation = useMutation({
    mutationFn: (key: string) => superadminApi.deleteFeatureFlag(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast("Flag deleted");
    },
    onError: () => toast("Delete failed"),
  });

  const activeCount = flags.filter((f) => f.enabled).length;
  const inRollout = flags.filter((f) => f.enabled && f.rollout_percentage < 100).length;

  return (
    <AdminLayout crumbs={["Trust", "Feature Flags"]}>
      {toastEl}
      <PH
        title="Feature flags"
        sub="Progressive rollout, kill-switches, and impact tracking. Changes apply within 60 seconds."
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
        <KPI icon="trending_up" color="mnt" label="In rollout" value={String(inRollout)} trend="enabled, not 100%" />
        <KPI icon="flag" color="pch" label="Total flags" value={String(flags.length)} />
        <KPI icon="undo" color="crl" label="Disabled" value={String(flags.length - activeCount)} />
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
                  Key (snake_case)
                </label>
                <input
                  id="ff-key"
                  type="text"
                  className="input"
                  placeholder="e.g. new_reg_flow"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="ff-label" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Label
                </label>
                <input
                  id="ff-label"
                  type="text"
                  className="input"
                  placeholder="Human-readable name"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Enabled</label>
              <div
                className={`toggle ${form.enabled ? "on" : "off"}`}
                onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              />
              <label htmlFor="ff-pct" style={{ fontSize: 12, fontWeight: 600, marginLeft: 16 }}>
                Rollout %
              </label>
              <input
                id="ff-pct"
                type="number"
                min={0}
                max={100}
                className="input"
                style={{ width: 80 }}
                value={form.rollout_percentage}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rollout_percentage: Math.min(100, Math.max(0, Number(e.target.value))),
                  }))
                }
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn-sm"
                onClick={() => {
                  setShowCreate(false);
                  setForm({ key: "", label: "", enabled: true, rollout_percentage: 0 });
                }}
              >
                Cancel
              </button>
              <button
                className="btn-sm primary"
                disabled={!form.key.trim() || !form.label.trim() || createMutation.isPending}
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
            Create your first flag using the button above.
          </p>
        </div>
      )}

      {/* flag cards */}
      {flags.map((f: FeatureFlag) => {
        const risk = riskLevel(f.rollout_percentage);
        // placeholder sparkline based on rollout pct - no historical data in this model
        const sparkData = Array.from({ length: 12 }, (_, i) =>
          Math.min(f.rollout_percentage, (f.rollout_percentage / 11) * i)
        );

        return (
          <div key={f.key} className="flag-c">
            <div className="flag-c-h">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 16, letterSpacing: "-0.025em" }}>
                    {f.label}
                  </span>
                  {f.rollout_percentage > 0 && (
                    <span className={`pill risk-${risk}`}>Risk · {risk}</span>
                  )}
                </div>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--on-mut)" }}>
                  {f.key}
                </span>
              </div>
              {/* toggle calls real API */}
              <div
                className={`toggle ${f.enabled ? "on" : "off"}`}
                onClick={() =>
                  !toggleMutation.isPending &&
                  toggleMutation.mutate({ key: f.key, enabled: !f.enabled })
                }
              />
            </div>

            <div className="flag-c-meta">
              <div>
                <div className="flag-c-meta-k">Status</div>
                <div className="flag-c-meta-v">{f.enabled ? "Enabled" : "Disabled"}</div>
              </div>
              <div>
                <div className="flag-c-meta-k">Rollout</div>
                <div className="flag-c-meta-v">{f.rollout_percentage}%</div>
              </div>
              <div>
                <div className="flag-c-meta-k">Trend · 12 steps</div>
                <div style={{ marginTop: 2 }}>
                  <SparkLine
                    data={sparkData}
                    height={28}
                    color={risk === "high" ? "#e83151" : risk === "med" ? "#dba13d" : "#16a34a"}
                  />
                </div>
              </div>
              <div>
                <div className="flag-c-meta-k">Key</div>
                <div className="flag-c-meta-v" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                  {f.key}
                </div>
              </div>
            </div>

            <div className="flag-c-roll">
              <span
                style={{
                  fontSize: 10,
                  color: "var(--on-mut)",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  minWidth: 64,
                }}
              >
                Rollout
              </span>
              <div className="flag-c-track">
                <div className="flag-c-fill" style={{ width: `${f.rollout_percentage}%` }} />
                <div className="flag-c-stops">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <div key={s} className="flag-c-stop" />
                  ))}
                </div>
              </div>
              <span className="flag-c-pct">{f.rollout_percentage}%</span>
            </div>

            <div className="flag-c-foot">
              <span style={{ fontSize: 12, color: "var(--on-mut)" }}>
                Set rollout percentage:
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[0, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    className="btn-sm"
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      background: f.rollout_percentage === p ? "var(--low)" : "white",
                    }}
                    disabled={rolloutMutation.isPending}
                    onClick={() => rolloutMutation.mutate({ key: f.key, pct: p })}
                  >
                    {p}%
                  </button>
                ))}
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
        );
      })}
    </AdminLayout>
  );
}
