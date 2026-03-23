import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS } from "@/shared/components/v8";
import { AreaChart, Bars } from "@/shared/components/charts";
import superadminApi from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import DateRangeFilter, { getRangeCutoff, type Range } from "@/shared/components/DateRangeFilter";

const MO = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Growth trend string comparing current 30d to previous 30d. */
function growthTrend(
  current: number,
  previous: number
): { text: string; kind: "up" | "down" | "steady" } {
  if (previous === 0) return { text: "new", kind: "steady" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `+${pct}%`, kind: "up" };
  if (pct < 0) return { text: `${pct}%`, kind: "down" };
  return { text: "0%", kind: "steady" };
}

/** Platform analytics with real data from 3 backend analytics endpoints. */
export default function PlatformAnalyticsPage() {
  const [range, setRange] = useState<Range>("12mo");

  const { data: userAnalytics, isLoading: uLoading } = useQuery({
    queryKey: ["user-analytics"],
    queryFn: superadminApi.getUserAnalytics,
  });
  const { data: eventAnalytics, isLoading: eLoading } = useQuery({
    queryKey: ["event-analytics"],
    queryFn: superadminApi.getEventAnalytics,
  });
  const { data: orgAnalytics, isLoading: oLoading } = useQuery({
    queryKey: ["org-analytics"],
    queryFn: superadminApi.getAnalytics,
  });

  const loading = uLoading || eLoading || oLoading;

  // trim monthly_series arrays to match the selected date range
  const cutoff = getRangeCutoff(range);
  function trimSeries(series: number[]): number[] {
    if (!cutoff || series.length === 0) return series;
    const now = new Date();
    const msPerMonth = 30.44 * 86400000;
    const monthsBack = Math.ceil((now.getTime() - cutoff.getTime()) / msPerMonth);
    return series.slice(-Math.min(monthsBack, series.length));
  }

  const userSeries = trimSeries(userAnalytics?.monthly_series ?? []);
  const eventSeries = trimSeries(eventAnalytics?.monthly_series ?? []);
  const orgSeries = trimSeries(orgAnalytics?.orgs?.monthly_series ?? []);
  const topEvents = eventAnalytics?.top_events ?? [];

  const userGrowth = growthTrend(
    userAnalytics?.new_users_30d ?? 0,
    userAnalytics?.prev_users_30d ?? 0
  );
  const orgGrowth = growthTrend(
    orgAnalytics?.orgs?.new_30d ?? 0,
    orgAnalytics?.orgs?.prev_30d ?? 0
  );
  const eventGrowth = growthTrend(
    eventAnalytics?.new_events_30d ?? 0,
    eventAnalytics?.prev_events_30d ?? 0
  );

  // engagement: derive from org status counts
  const totalOrgs = orgAnalytics?.orgs?.total ?? 0;
  const activeOrgs = orgAnalytics?.orgs?.active ?? 0;
  const activePct = totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0;
  const verifiedOrgs = orgAnalytics?.orgs?.verified ?? 0;
  const verifiedPct = totalOrgs > 0 ? Math.round((verifiedOrgs / totalOrgs) * 100) : 0;

  return (
    <AdminLayout crumbs={["Operations", "Analytics"]}>
      <PH
        title="Platform analytics"
        sub="Growth, engagement, and event performance from real platform data."
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Title", "Status", "Type", "Registered"];
                const rows = topEvents.map((e) => [
                  e.title,
                  e.status,
                  e.event_type ?? "",
                  String(e.registered_count),
                ]);
                exportCSV(headers, rows, "platform-analytics-events");
              }}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Title", "Status", "Type", "Registered"];
                const rows = topEvents.map((e) => [
                  e.title,
                  e.status,
                  e.event_type ?? "",
                  String(e.registered_count),
                ]);
                exportPDF(
                  "Platform Analytics - Top Events",
                  headers,
                  rows,
                  "platform-analytics-events"
                );
              }}
            >
              <MS n="picture_as_pdf" size={13} />
              Export PDF
            </button>
          </>
        }
      />

      {loading ? (
        <div
          style={{
            padding: "60px 0",
            textAlign: "center",
            color: "var(--on-mut)",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <KPI
              icon="domain"
              color="nav"
              label="New orgs (30d)"
              value={String(orgAnalytics?.orgs?.new_30d ?? 0)}
              trend={orgGrowth.text}
              trendKind={orgGrowth.kind}
            />
            <KPI
              icon="group"
              color="lav"
              label="New users (30d)"
              value={String(userAnalytics?.new_users_30d ?? 0)}
              trend={userGrowth.text}
              trendKind={userGrowth.kind}
            />
            <KPI
              icon="event"
              color="pch"
              label="New events (30d)"
              value={String(eventAnalytics?.new_events_30d ?? 0)}
              trend={eventGrowth.text}
              trendKind={eventGrowth.kind}
            />
            <KPI
              icon="confirmation_number"
              color="mnt"
              label="Total events"
              value={String(eventAnalytics?.total_events ?? 0)}
              trend={`${topEvents.length} with registrations`}
            />
          </div>

          {/* user growth + events created charts */}
          <div className="chart-grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Total users - 12 months</span>
                <span
                  style={{
                    fontFamily: "Space Grotesk",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {(userAnalytics?.total_users ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="panel-body">
                {userSeries.length > 0 ? (
                  <AreaChart data={userSeries} height={220} />
                ) : (
                  <div
                    style={{
                      height: 220,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--on-mut)",
                      fontSize: 13,
                    }}
                  >
                    No user data yet
                  </div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Events created - monthly</span>
              </div>
              <div
                className="panel-body"
                style={{ height: 264, display: "flex", alignItems: "center", padding: "18px 22px" }}
              >
                {eventSeries.length > 0 ? (
                  <Bars
                    data={eventSeries.map((v, i) => ({
                      l: MO[i % 12],
                      v,
                      c: i === eventSeries.length - 1 ? "#e83151" : "#121d3f",
                    }))}
                    height={220}
                  />
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--on-mut)",
                      fontSize: 13,
                    }}
                  >
                    No event data yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* engagement + top events */}
          <div className="chart-grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Organization engagement</span>
              </div>
              <div className="panel-body">
                {[
                  ["Active orgs", activeOrgs, `${activePct}%`],
                  ["Verified orgs", verifiedOrgs, `${verifiedPct}%`],
                  [
                    "Pending review",
                    orgAnalytics?.orgs?.pending ?? 0,
                    `${totalOrgs > 0 ? Math.round(((orgAnalytics?.orgs?.pending ?? 0) / totalOrgs) * 100) : 0}%`,
                  ],
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 0",
                      borderBottom: i < 2 ? "1px solid var(--outline)" : undefined,
                    }}
                  >
                    <div
                      style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r[0]}</span>
                      <span
                        style={{
                          fontFamily: "Space Grotesk",
                          fontWeight: 700,
                          fontSize: 16,
                          letterSpacing: "-0.025em",
                        }}
                      >
                        {r[1]}{" "}
                        <span style={{ fontSize: 11, color: "var(--on-mut)", fontWeight: 500 }}>
                          {r[2]}
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "var(--mid)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: String(r[2]),
                          background: "linear-gradient(90deg,#050a26,#3b3a72)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Top events by attendance</span>
              </div>
              <div className="panel-body flush">
                {topEvents.length > 0 ? (
                  <table className="tbl">
                    <tbody>
                      {topEvents.slice(0, 5).map((e, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{e.title}</td>
                          <td style={{ fontSize: 11, color: "var(--on-mut)" }}>
                            <span
                              className={`pill ${e.status === "published" ? "active" : "pending"}`}
                              style={{ fontSize: 9 }}
                            >
                              {e.status}
                            </span>
                          </td>
                          <td
                            style={{
                              fontFamily: "Space Grotesk",
                              fontWeight: 700,
                              fontSize: 14,
                              letterSpacing: "-0.02em",
                              textAlign: "right",
                            }}
                          >
                            {e.registered_count.toLocaleString()}
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
                    No events with registrations yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* org growth + ticket stats */}
          <div className="chart-grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Organizations created - monthly</span>
              </div>
              <div
                className="panel-body"
                style={{ height: 264, display: "flex", alignItems: "center", padding: "18px 22px" }}
              >
                {orgSeries.length > 0 ? (
                  <Bars
                    data={orgSeries.map((v, i) => ({
                      l: MO[i % 12],
                      v,
                      c: i === orgSeries.length - 1 ? "#dba13d" : "#121d3f",
                    }))}
                    height={220}
                  />
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--on-mut)",
                      fontSize: 13,
                    }}
                  >
                    No org data yet
                  </div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Support tickets</span>
              </div>
              <div
                className="panel-body"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <div style={{ padding: "12px 14px", background: "var(--low)", borderRadius: 9 }}>
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--on-mut)",
                    }}
                  >
                    Open
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Grotesk",
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: "-0.03em",
                      marginTop: 3,
                    }}
                  >
                    {orgAnalytics?.tickets?.open ?? 0}
                  </div>
                </div>
                <div style={{ padding: "12px 14px", background: "var(--low)", borderRadius: 9 }}>
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--on-mut)",
                    }}
                  >
                    Escalated
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Grotesk",
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: "-0.03em",
                      marginTop: 3,
                      color: "var(--error)",
                    }}
                  >
                    {orgAnalytics?.tickets?.escalated ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
