import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { AreaChart, DonutChart } from "@/shared/components/charts";
import superadminApi, { PLAN_CATALOGUE, type Org } from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import { usePagination } from "@/shared/lib/usePagination";
import Pagination from "@/shared/components/Pagination";

/** plan-name to color for the donut + legend */
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

/** map subscription status to pill css class */
const SUB_STATUS_PILL: Record<string, string> = {
  active: "active",
  cancelled: "suspended",
  past_due: "pending",
  expired: "draft",
};

/** map payment status to pill css class */
const PAY_STATUS_PILL: Record<string, string> = {
  paid: "active",
  succeeded: "active",
  failed: "suspended",
  pending: "pending",
  refunded: "scheduled",
};

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
  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: superadminApi.listOrders,
  });
  const orders = ordersData?.results ?? [];
  const { data: orgAnalytics } = useQuery({
    queryKey: ["org-analytics"],
    queryFn: superadminApi.getAnalytics,
  });

  // * subscriptions list
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => superadminApi.listSubscriptions(),
  });

  // * selected subscription for payment detail drill-down
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const { data: payments = [] } = useQuery({
    queryKey: ["sub-payments", selectedSubId],
    queryFn: () => superadminApi.getSubscriptionPayments(selectedSubId!),
    enabled: !!selectedSubId,
  });

  // * paginate subscriptions client-side (10 per page)
  const {
    page: subPage,
    totalPages: subTotalPages,
    paged: pagedSubs,
    total: subTotal,
    setPage: setSubPage,
    next: subNext,
    prev: subPrev,
    from: subFrom,
    to: subTo,
  } = usePagination(subscriptions, 10);

  const { totalMrr, segments, topOrgs, priceMap } = useBillingMetrics(orgs);
  const arr = totalMrr * 12;
  const paidOrgs = orgs.filter((o) => (priceMap[o.plan] ?? 0) > 0).length;
  const FORECAST = Array.from({ length: 10 }, (_, i) =>
    Math.round(totalMrr * Math.pow(1.05, i + 1))
  );

  // compute net churn from real analytics: compare new orgs vs previous period
  const newOrgs30d = orgAnalytics?.orgs?.new_30d ?? 0;
  const prevOrgs30d = orgAnalytics?.orgs?.prev_30d ?? 0;
  const churnRate =
    prevOrgs30d > 0 ? Math.abs(((newOrgs30d - prevOrgs30d) / prevOrgs30d) * 100).toFixed(1) : "0";
  const churnDirection = newOrgs30d >= prevOrgs30d ? "growth" : "churn";

  // recent orders for invoice table (latest 10)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <AdminLayout crumbs={["Platform", "Billing"]}>
      {toastEl}
      <PH
        title="Platform billing & revenue"
        sub="MRR, subscriptions, plan distribution, and platform-wide financial metrics."
        actions={
          <>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Organization", "Plan", "MRR", "ARR", "Created"];
                const rows = orgs.map((o) => {
                  const mrr = priceMap[o.plan] ?? 0;
                  return [
                    o.name,
                    o.plan,
                    `NPR ${mrr.toLocaleString()}`,
                    `NPR ${(mrr * 12).toLocaleString()}`,
                    new Date(o.created_at).toLocaleDateString(),
                  ];
                });
                exportCSV(headers, rows, "billing-export");
              }}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Organization", "Plan", "MRR", "ARR", "Created"];
                const rows = orgs.map((o) => {
                  const mrr = priceMap[o.plan] ?? 0;
                  return [
                    o.name,
                    o.plan,
                    `NPR ${mrr.toLocaleString()}`,
                    `NPR ${(mrr * 12).toLocaleString()}`,
                    new Date(o.created_at).toLocaleDateString(),
                  ];
                });
                exportPDF("Platform Billing", headers, rows, "billing-export");
              }}
            >
              <MS n="print" size={13} />
              Export PDF
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
          icon={churnDirection === "growth" ? "trending_up" : "trending_down"}
          color={churnDirection === "growth" ? "mnt" : "crl"}
          label="30d growth rate"
          value={`${churnRate}%`}
          trend={`${newOrgs30d} new vs ${prevOrgs30d} prev`}
          trendKind={churnDirection === "growth" ? "up" : "down"}
        />
        <KPI
          icon="receipt"
          color="crl"
          label="Total orders"
          value={orders.length.toString()}
          trend={`${orders.filter((o) => o.status === "completed").length} completed`}
        />
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
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                color: "var(--on-mut)",
                fontStyle: "italic",
              }}
            >
              Projected at 5% monthly growth
            </span>
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

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Recent orders</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10.5,
                color: "var(--on-mut)",
              }}
            >
              {orders.length} total
            </span>
          </div>
          <div className="panel-body flush">
            {recentOrders.length > 0 ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Gateway</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="pill scheduled" style={{ fontSize: 9.5 }}>
                          {o.gateway}
                        </span>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {o.currency} {Number(o.total_amount).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`pill ${o.status === "completed" ? "active" : o.status === "failed" ? "suspended" : "pending"}`}
                          style={{ fontSize: 9.5 }}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--on-mut)",
                  padding: "28px 20px",
                  fontSize: 13,
                }}
              >
                <MS
                  n="receipt_long"
                  size={28}
                  style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
                />
                No payment orders yet.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* subscriptions table + payment detail */}
      <div className="chart-grid-2">
        {/* active subscriptions table with pagination */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Active subscriptions</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10.5,
                color: "var(--on-mut)",
              }}
            >
              {subscriptions.length} total
            </span>
          </div>
          <div className="panel-body flush">
            {pagedSubs.length > 0 ? (
              <>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Org ID</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Gateway</th>
                      <th>Amount</th>
                      <th>Period</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSubs.map((sub) => (
                      <tr key={sub.id}>
                        <td
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11.5,
                          }}
                        >
                          {sub.org_id.slice(0, 8)}
                        </td>
                        <td>
                          <span className="pill scheduled" style={{ fontSize: 9.5 }}>
                            {sub.plan}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${SUB_STATUS_PILL[sub.status] ?? "draft"}`}
                            style={{ fontSize: 9.5 }}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{sub.gateway}</td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          {sub.currency} {Number(sub.amount).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                          {new Date(sub.current_period_start).toLocaleDateString()} -{" "}
                          {new Date(sub.current_period_end).toLocaleDateString()}
                        </td>
                        <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="btn-sm"
                            style={{ fontSize: 10, whiteSpace: "nowrap" }}
                            onClick={() => setSelectedSubId(sub.id)}
                          >
                            <MS n="payments" size={12} />
                            View payments
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "0 16px" }}>
                  <Pagination
                    page={subPage}
                    totalPages={subTotalPages}
                    from={subFrom}
                    to={subTo}
                    total={subTotal}
                    onPrev={subPrev}
                    onNext={subNext}
                    onPage={setSubPage}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--on-mut)",
                  padding: "28px 20px",
                  fontSize: 13,
                }}
              >
                <MS
                  n="credit_card"
                  size={28}
                  style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
                />
                No subscriptions found.
              </div>
            )}
          </div>
        </div>

        {/* payment history for selected subscription */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Payment history</span>
            {selectedSubId && (
              <button
                className="btn-sm"
                style={{ fontSize: 10 }}
                onClick={() => setSelectedSubId(null)}
              >
                <MS n="close" size={12} />
                Close
              </button>
            )}
          </div>
          <div className="panel-body flush">
            {!selectedSubId ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--on-mut)",
                  padding: "28px 20px",
                  fontSize: 13,
                }}
              >
                <MS
                  n="info"
                  size={28}
                  style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
                />
                Select a subscription to view its payment history.
              </div>
            ) : payments.length > 0 ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th>Period start</th>
                    <th>Period end</th>
                    <th>Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {Number(p.amount).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.currency}</td>
                      <td>
                        <span
                          className={`pill ${PAY_STATUS_PILL[p.status] ?? "draft"}`}
                          style={{ fontSize: 9.5 }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                        {new Date(p.period_start).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                        {new Date(p.period_end).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--on-mut)",
                  padding: "28px 20px",
                  fontSize: 13,
                }}
              >
                <MS
                  n="receipt_long"
                  size={28}
                  style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }}
                />
                No payments for this subscription.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
