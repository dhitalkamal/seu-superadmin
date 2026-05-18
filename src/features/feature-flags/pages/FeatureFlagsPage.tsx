import { useState } from "react";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { SparkLine } from "@/shared/components/charts";

type Flag = {
  n: string;
  k: string;
  sc: string;
  pct: number;
  on: boolean;
  risk: string;
  owner: string;
  impact: number[];
  imp: string;
  cohort: string;
};

/** Feature flags - v8 faithful port with rollout sliders, SparkLine impact charts, and kill-switches. */
export default function FeatureFlagsPage() {
  const { toast, toastEl } = useToast();
  const [flags, setFlags] = useState<Flag[]>([
    {
      n: "New registration flow",
      k: "new_reg_flow",
      sc: "All orgs",
      pct: 100,
      on: true,
      risk: "low",
      owner: "M. Chen",
      impact: [42, 48, 55, 62, 68, 74, 80, 84, 88, 91, 94, 97],
      imp: "+12% completion",
      cohort: "48 / 48 orgs",
    },
    {
      n: "AI event descriptions",
      k: "ai_descriptions",
      sc: "Institution+",
      pct: 45,
      on: true,
      risk: "med",
      owner: "S. Jenkins",
      impact: [5, 8, 12, 18, 22, 28, 32, 38, 42, 44, 44, 45],
      imp: "+6% engagement",
      cohort: "22 / 48 orgs",
    },
    {
      n: "Volunteer marketplace",
      k: "volunteer_mkt",
      sc: "Beta orgs",
      pct: 12,
      on: true,
      risk: "high",
      owner: "R. Patel",
      impact: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12],
      imp: "New surface",
      cohort: "6 / 48 orgs",
    },
    {
      n: "Multi-currency",
      k: "multi_currency",
      sc: "Council only",
      pct: 100,
      on: true,
      risk: "low",
      owner: "A. Sterling",
      impact: [80, 85, 90, 95, 98, 100, 100, 100, 100, 100, 100, 100],
      imp: "$184k processed",
      cohort: "4 / 4 council orgs",
    },
    {
      n: "Dark mode (public site)",
      k: "dark_public",
      sc: "Disabled",
      pct: 0,
      on: false,
      risk: "low",
      owner: "S. Jenkins",
      impact: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      imp: "-",
      cohort: "0 / 48 orgs",
    },
    {
      n: "Mobile check-in",
      k: "mobile_checkin",
      sc: "All orgs",
      pct: 80,
      on: true,
      risk: "med",
      owner: "M. Chen",
      impact: [10, 20, 30, 40, 50, 55, 60, 65, 70, 75, 78, 80],
      imp: "+34% on-time check-in",
      cohort: "38 / 48 orgs",
    },
  ]);

  function tog(i: number) {
    setFlags((prev) => prev.map((f, j) => (j === i ? { ...f, on: !f.on } : f)));
    toast(flags[i].n + (flags[i].on ? " disabled" : " enabled"));
  }

  function setPct(i: number, v: number) {
    setFlags((prev) => prev.map((f, j) => (j === i ? { ...f, pct: v } : f)));
  }

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Trust", "Feature Flags"]}
        title="Feature flags"
        sub="Progressive rollout, kill-switches, impact tracking. Changes apply within 60 seconds."
        actions={
          <>
            <button className="btn-sm">
              <MS n="history" size={13} />
              Audit log
            </button>
            <button className="btn-sm primary" onClick={() => toast("New flag wizard")}>
              <MS n="add" size={13} />
              New flag
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI icon="toggle_on" color="lav" label="Active flags" value="14" trend="+2" />
        <KPI icon="trending_up" color="mnt" label="In rollout" value="3" trend="this week" />
        <KPI icon="speed" color="pch" label="Avg time to 100%" value="12d" />
        <KPI icon="undo" color="crl" label="Rolled back (30d)" value="1" />
      </div>

      {flags.map((f, i) => (
        <div key={i} className="flag-c">
          <div className="flag-c-h">
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "Space Grotesk",
                    fontWeight: 600,
                    fontSize: 16,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {f.n}
                </span>
                <span className={`pill risk-${f.risk}`}>Risk · {f.risk}</span>
                <span className="pill draft">{f.sc}</span>
              </div>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "var(--on-mut)",
                }}
              >
                {f.k}
              </span>
            </div>
            <div className={`toggle ${f.on ? "on" : "off"}`} onClick={() => tog(i)} />
          </div>

          <div className="flag-c-meta">
            <div>
              <div className="flag-c-meta-k">Cohort</div>
              <div className="flag-c-meta-v">{f.cohort}</div>
            </div>
            <div>
              <div className="flag-c-meta-k">Owner</div>
              <div className="flag-c-meta-v">{f.owner}</div>
            </div>
            <div>
              <div className="flag-c-meta-k">Impact · 12 wk</div>
              <div style={{ marginTop: 2 }}>
                <SparkLine
                  data={f.impact}
                  height={28}
                  color={f.risk === "high" ? "#e83151" : f.risk === "med" ? "#dba13d" : "#16a34a"}
                />
              </div>
            </div>
            <div>
              <div className="flag-c-meta-k">Outcome</div>
              <div
                className="flag-c-meta-v"
                style={{ color: f.imp.includes("+") ? `#16a34a` : "var(--on-bg)" }}
              >
                {f.imp}
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
              <div className="flag-c-fill" style={{ width: `${f.pct}%` }} />
              <div className="flag-c-stops">
                {[0, 1, 2, 3, 4].map((s) => (
                  <div key={s} className="flag-c-stop" />
                ))}
              </div>
            </div>
            <span className="flag-c-pct">{f.pct}%</span>
          </div>

          <div className="flag-c-foot">
            <span>
              Last change ·{" "}
              <strong>{f.n === "Mobile check-in" ? "2 hours ago" : "Yesterday"}</strong> by{" "}
              {f.owner}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  className="btn-sm"
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background: f.pct === p ? "var(--low)" : "white",
                  }}
                  onClick={() => {
                    setPct(i, p);
                    toast(f.n + " set to " + p + "%");
                  }}
                >
                  {p}%
                </button>
              ))}
              <button
                className="btn-sm danger"
                onClick={() => {
                  setPct(i, 0);
                  if (f.on) tog(i);
                  toast(f.n + " kill-switched");
                }}
              >
                <MS n="emergency_home" size={13} />
                Kill
              </button>
            </div>
          </div>
        </div>
      ))}
    </AdminLayout>
  );
}
