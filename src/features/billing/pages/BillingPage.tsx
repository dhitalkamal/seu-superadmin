import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { AreaChart, DonutChart } from "@/shared/components/charts";
import superadminApi, { PLAN_CATALOGUE, type Org } from "@/shared/api/superadmin.api";

/** plan-name to colour for the donut + legend */
const PLAN_COLORS: Record<string, string> = {
  enterprise: "#050a26",
  pro: "#e83151",
  starter: "#dba13d",
  ngo: "#16a34a",
  free: "#9ca3af",
};

/** plan-name to icon gradient for the orgs table */
const PLAN_GRADIENTS: Record<string, string> = {
  enterprise: "linear-gradient(135deg,#050a26,#121d3f)",
  pro: "linear-gradient(135deg,#5a2c5e,#7a1d12)",
  starter: "linear-gradient(135deg,#b32a1f,#e83151)",
  ngo: "linear-gradient(135deg,#1b4a5c,#3b3a72)",
  free: "linear-gradient(135deg,#6b6c75,#9ca3af)",
};

/**
 * Derive billing KPIs from the org list.
 * MRR = sum of monthly prices for every org with a paid plan.
 */
function useBillingMetrics(orgs: Org[]) {
  return useMemo(() => {
    const priceMap = Object.fromEntries(PLAN_CATALOGUE.map((p) => [p.name, p.price]));

    // * per-plan breakdown: count + total MRR contribution
    const planBreakdown: Record<string, { count: number; mrr: number }> = {};
    let totalMrr = 0;

    for (const org of orgs) {
      const plan = org.plan ?? "Free";
      const price = priceMap[plan] ?? 0;
      if (!planBreakdown[plan]) planBreakdown[plan] = { count: 0, mrr: 0 };
      planBreakdown[plan].count += 1;
      planBreakdown[plan].mrr += price;
      totalMrr += price;
    }

    // * donut segments: only plans with >0 orgs, ordered by MRR desc
    const segments = Object.entries(planBreakdown)
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].mrr - a[1].mrr)
      .map(([plan, v]) => ({
        plan,
        label: PLAN_CATALOGUE.find((p) => p.name === plan)?.name ?? plan,
        color: PLAN_COLORS[plan.toLowerCase()] ?? "#9ca3af",
        count: v.count,
        mrr: v.mrr,
        pct: totalMrr > 0 ? Math.round((v.mrr / totalMrr) * 100) : 0,
      }));

    // * top orgs by plan price, then by created_at desc
    const topOrgs = [...orgs]
      .filter((o) => (priceMap[o.plan] ?? 0) > 0)
      .sort((a, b) => (priceMap[b.plan] ?? 0) - (priceMap[a.plan] ?? 0))
      .slice(0, 5);

    return { totalMrr, segments, topOrgs, priceMap };
  }, [orgs]);
}

/**
 * Format NPR amount, e.g. 84200 becomes "NPR 84.2k"
 * @param v - raw number in NPR
 * @returns formatted string
 */
function fmtNpr(v: number): string {
  if (v >= 100000) return `NPR ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `NPR ${(v / 1000).toFixed(1)}k`;
  return `NPR ${v.toLocaleString()}`;
}

/**
 * Platform billing dashboard. Plan distribution and top orgs are
 * derived from real org data; waterfall + forecast are static placeholders
 * until a dedicated aggregation API is built.
 */
export default function BillingPage() {
  const { toastEl } = useToast();

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: superadminApi.listOrgs,
  });

  const { totalMrr, segments, topOrgs, priceMap } = useBillingMetrics(orgs);
  const arr = totalMrr * 12;
  const paidOrgs = orgs.filter((o) => (priceMap[o.plan] ?? 0) > 0).length;
  // build a 10-month forward projection from current MRR at 5% monthly growth
  const FORECAST = Array.from({ length: 10 }, (_, i) =>
    Math.round(totalMrr * Math.pow(1.05, i + 1))
  );

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Platform", "Billing"]}
        title="Platform billing & revenue"
        sub="MRR, subscriptions, plan distribution, and platform-wide financial metrics."
        actions={
          <>
            <button className="btn-sm">
              <MS n="download" size={13} />
              Export
            </button>
          </>
        }
      />

      {/* KPI row: MRR + ARR are computed from real plan data */}
      <div className="kpi-grid">
        <KPI
          icon="trending_up"
          color="lav"
          label="MRR"
          value={fmtNpr(totalMrr)}
          trend={`${paidOrgs} paid orgs`}
        />
        <KPI
          icon="receipt_long"
          color="pch"
          label="Annual run rate"
          value={fmtNpr(arr)}
          trend={`${orgs.length} total orgs`}
        />
        <KPI
          icon="trending_down"
          color="mnt"
          label="Net churn"
          value="N/A"
          trend="needs aggregation"
        />
        <KPI icon="paid" color="crl" label="LTV : CAC" value="N/A" trend="needs aggregation" />
      </div>

      <div className="chart-grid-2">
        {/* donut: real plan distribution from org data */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Revenue by plan tier</span>
          </div>
          <div className="panel-body">
            <div className="donut-wrap">
              <DonutChart
                size={200}
                label={fmtNpr(totalMrr)}
                sub="Total MRR"
                segments={
                  segments.length > 0
                    ? segments.map((s) => ({ pct: s.pct, color: s.color }))
                    : [{ pct: 100, color: "#9ca3af" }]
                }
              />
              <div className="donut-leg">
                {segments.map((s, i) => (
                  <div
                    key={s.plan}
                    style={{
                      padding: "8px 0",
                      borderBottom:
                        i < segments.length - 1 ? "1px solid var(--outline)" : undefined,
                    }}
                  >
                    <div className="donut-leg-it" style={{ marginBottom: 4 }}>
                      <span className="donut-leg-d" style={{ background: s.color }} />
                      <span
                        className="donut-leg-l"
                        style={{ fontWeight: 700, color: "var(--on-bg)" }}
                      >
                        {PLAN_CATALOGUE.find((p) => p.name === s.plan)?.name ?? s.plan}
                      </span>
                      <span className="donut-leg-v">{fmtNpr(s.mrr)}</span>
                      <span className="donut-leg-p">{s.pct}%</span>
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--on-mut)",
                        paddingLeft: 18,
                        fontFamily: "JetBrains Mono, monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.count} {s.count === 1 ? "org" : "orgs"}
                    </div>
                  </div>
                ))}
                {segments.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--on-mut)", padding: "12px 0" }}>
                    No paid plans yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* forecast: static placeholder */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Revenue forecast (10 months out)</span>
          </div>
          <div className="panel-body">
            <AreaChart data={FORECAST} height={200} color="#7a1d12" accent="#dba13d" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 10,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--outline)",
              }}
            >
              {[
                ["Base", fmtNpr(FORECAST[FORECAST.length - 1]), "10 mo"],
                ["Stretch", fmtNpr(Math.round(totalMrr * Math.pow(1.08, 10))), "10 mo"],
                ["Conservative", fmtNpr(Math.round(totalMrr * Math.pow(1.03, 10))), "10 mo"],
              ].map((r, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--on-mut)",
                    }}
                  >
                    {r[0]}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Grotesk",
                      fontWeight: 700,
                      fontSize: 17,
                      letterSpacing: "-0.025em",
                      marginTop: 3,
                    }}
                  >
                    {r[1]}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--on-mut)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {r[2]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-grid-2">
        {/* top orgs: real data sorted by plan price */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Top organizations by plan</span>
          </div>
          <div className="panel-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Plan</th>
                  <th>MRR</th>
                  <th>ARR</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {topOrgs.map((o) => {
                  const planPrice = priceMap[o.plan] ?? 0;
                  const planLabel = PLAN_CATALOGUE.find((p) => p.name === o.plan)?.name ?? o.plan;
                  const grad = PLAN_GRADIENTS[o.plan.toLowerCase()] ?? PLAN_GRADIENTS.free;
                  return (
                    <tr key={o.id}>
                      <td>
                        <div className="ev-cell">
                          <div className="ev-icon" style={{ background: grad, color: "white" }}>
                            {o.name?.[0]?.toUpperCase() ?? "O"}
                          </div>
                          <span className="ev-name">{o.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pill scheduled">{planLabel}</span>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        NPR {planPrice.toLocaleString()}
                      </td>
                      <td
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {fmtNpr(planPrice * 12)}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {topOrgs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "var(--on-mut)", padding: 28 }}
                    >
                      No paid subscriptions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* recent invoices placeholder: real data needs a list-all-payments admin endpoint */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Recent invoices</span>
          </div>
          <div
            className="panel-body"
            style={{
              textAlign: "center",
              color: "var(--on-mut)",
              padding: "36px 20px",
              fontSize: 13,
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <MS
              n="receipt_long"
              size={28}
              style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
            />
            Invoice history will appear here once organisations start subscribing to paid plans.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
