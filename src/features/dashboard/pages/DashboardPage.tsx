import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS } from "@/shared/components/v8";
import { AreaChart, Funnel, DonutChart, Bars } from "@/shared/components/charts";
import superadminApi, { PLAN_CATALOGUE } from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import DateRangeFilter, { getRangeCutoff, type Range } from "@/shared/components/DateRangeFilter";

const MO = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// * plan colors keyed by plan name
const PLAN_COLORS: Record<string, string> = {
  Free: "#9ca3af",
  Starter: "#dba13d",
  Pro: "#e83151",
  NGO: "#16a34a",
  Enterprise: "#050a26",
};

/** formats a number as NPR with k/L shorthand */
function fmtNpr(v: number): string {
  if (v >= 100000) return `NPR ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `NPR ${(v / 1000).toFixed(1)}k`;
  return `NPR ${v.toLocaleString()}`;
}

// * widget registry; each entry defines a dashboard section
type WidgetId = "kpis" | "org-status" | "mrr" | "funnel" | "activity";

const WIDGET_META: Record<WidgetId, { label: string; icon: string }> = {
  kpis: { label: "KPI Row", icon: "grid_view" },
  "org-status": { label: "Org Status Breakdown", icon: "domain_verification" },
  mrr: { label: "MRR + Plan Mix", icon: "trending_up" },
  funnel: { label: "Funnel / Churn / Users", icon: "filter_alt" },
  activity: { label: "Recent Org Activity", icon: "history" },
};

const DEFAULT_ORDER: WidgetId[] = ["kpis", "org-status", "mrr", "funnel", "activity"];

const LS_ORDER = "seu-dashboard-order";
const LS_HIDDEN = "seu-dashboard-hidden";

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(LS_ORDER);
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetId[];
      // merge to handle new widgets added after initial save
      const known = new Set(DEFAULT_ORDER);
      const saved = parsed.filter((id) => known.has(id));
      const missing = DEFAULT_ORDER.filter((id) => !saved.includes(id));
      return [...saved, ...missing];
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_ORDER];
}

function loadHidden(): Set<WidgetId> {
  try {
    const raw = localStorage.getItem(LS_HIDDEN);
    if (raw) return new Set(JSON.parse(raw) as WidgetId[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function StatBox({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
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
        {label}
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
        {value}
      </div>
      {note && (
        <div
          style={{
            fontSize: 10.5,
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--on-mut)",
            marginTop: 3,
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

/** Slide-in panel listing all widgets with visibility toggles and drag handles for reorder. */
function CustomizeDrawer({
  order,
  hidden,
  onToggle,
  onReorder,
  onClose,
}: {
  order: WidgetId[];
  hidden: Set<WidgetId>;
  onToggle: (id: WidgetId) => void;
  onReorder: (next: WidgetId[]) => void;
  onClose: () => void;
}) {
  const dragId = useRef<WidgetId | null>(null);

  function handleDragStart(id: WidgetId) {
    dragId.current = id;
  }

  function handleDrop(targetId: WidgetId) {
    if (!dragId.current || dragId.current === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId.current);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    onReorder(next);
    dragId.current = null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(2px)",
        }}
      />
      {/* drawer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 320,
          height: "100%",
          background: "var(--surface)",
          borderLeft: "1px solid var(--outline)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--outline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.02em",
                color: "var(--on-bg)",
              }}
            >
              Customize Dashboard
            </p>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--on-mut)",
                marginTop: 2,
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Toggle visibility and drag to reorder
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--outline)",
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className="ms" style={{ fontSize: 18, color: "var(--on-var)" }}>
              close
            </span>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {order.map((id) => {
            const meta = WIDGET_META[id];
            const visible = !hidden.has(id);
            return (
              <div
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--outline)",
                  background: visible ? "var(--bg)" : "var(--low)",
                  cursor: "grab",
                  opacity: visible ? 1 : 0.5,
                  transition: "opacity 0.15s",
                }}
              >
                <span
                  className="ms"
                  style={{ fontSize: 16, color: "var(--on-mut)", cursor: "grab" }}
                >
                  drag_indicator
                </span>
                <span
                  className="ms"
                  style={{ fontSize: 16, color: visible ? "var(--primary)" : "var(--on-mut)" }}
                >
                  {meta.icon}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: "Manrope, sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--on-bg)",
                  }}
                >
                  {meta.label}
                </span>
                <button
                  onClick={() => onToggle(id)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: visible ? "#16a34a" : "var(--mid)",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: visible ? "calc(100% - 18px)" : 2,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--outline)" }}>
          <button
            onClick={() => {
              onReorder([...DEFAULT_ORDER]);
              DEFAULT_ORDER.forEach((id) => {
                if (hidden.has(id)) onToggle(id);
              });
            }}
            className="btn-sm"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <MS n="restart_alt" size={13} />
            Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [order, setOrder] = useState<WidgetId[]>(loadOrder);
  const [hidden, setHidden] = useState<Set<WidgetId>>(loadHidden);
  const [showCustomize, setShowCustomize] = useState(false);
  const [range, setRange] = useState<Range>("12mo");

  const toggleWidget = useCallback((id: WidgetId) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(LS_HIDDEN, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const reorder = useCallback((next: WidgetId[]) => {
    setOrder(next);
    localStorage.setItem(LS_ORDER, JSON.stringify(next));
  }, []);

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: superadminApi.listOrgs,
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: superadminApi.listUsers,
  });
  const { data: eventsPage } = useQuery({
    queryKey: ["platform-events"],
    queryFn: () => superadminApi.listEvents(),
  });
  const { data: userAnalytics } = useQuery({
    queryKey: ["user-analytics"],
    queryFn: superadminApi.getUserAnalytics,
  });
  const { data: orgAnalytics } = useQuery({
    queryKey: ["org-analytics"],
    queryFn: superadminApi.getAnalytics,
  });
  const { data: paymentAnalytics } = useQuery({
    queryKey: ["payment-analytics"],
    queryFn: superadminApi.getPaymentAnalytics,
  });

  const events = eventsPage?.results ?? [];
  const priceMap = Object.fromEntries(PLAN_CATALOGUE.map((p) => [p.name.toLowerCase(), p.price]));

  // apply date range filter to screen data
  const cutoff = getRangeCutoff(range);
  const filteredOrgs = cutoff ? orgs.filter((o) => new Date(o.created_at) >= cutoff) : orgs;
  const filteredUsers = cutoff ? users.filter((u) => new Date(u.date_joined) >= cutoff) : users;
  const filteredEvents = cutoff ? events.filter((e) => new Date(e.created_at) >= cutoff) : events;

  const totalMrr = filteredOrgs.reduce((sum, o) => sum + (priceMap[o.plan] ?? 0), 0);

  // real cumulative MRR series from user monthly_series (scaled to MRR)
  const userSeries = userAnalytics?.monthly_series ?? [];
  const mrrSeries =
    userSeries.length > 0 && totalMrr > 0
      ? userSeries.map((v) =>
          Math.round((v / Math.max(1, userSeries[userSeries.length - 1])) * totalMrr)
        )
      : (Array(12).fill(0) as number[]);

  // real org monthly creation series for the churn/growth chart
  const orgMonthlySeries = orgAnalytics?.orgs?.monthly_series ?? [];
  const orgMonthlyBars = orgMonthlySeries.map((v, i) => ({
    l: MO[i % 12],
    v,
    c:
      v > (orgMonthlySeries[i - 1] ?? v)
        ? "#16a34a"
        : v < (orgMonthlySeries[i - 1] ?? v)
          ? "#e83151"
          : "#dba13d",
  }));

  const regularUsers = filteredUsers.filter((u) => !u.is_superuser);
  const pending = filteredOrgs.filter((o) => o.status === "pending_review").length;
  const active = filteredOrgs.filter((o) => o.status === "active").length;
  const suspended = filteredOrgs.filter((o) => o.status === "suspended").length;
  const activeUsers = regularUsers.filter((u) => u.is_active).length;
  const verifiedUsers = regularUsers.filter((u) => u.is_email_verified).length;
  const publishedEvents = filteredEvents.filter((e) => e.status === "published").length;
  const loading = orgsLoading || usersLoading;

  // * map widget ids to their rendered JSX
  function renderWidget(id: WidgetId) {
    if (hidden.has(id)) return null;

    switch (id) {
      case "kpis":
        return (
          <div key="kpis" className="kpi-grid">
            <KPI
              icon="domain"
              color="nav"
              label="Organizations"
              value={orgs.length.toString()}
              trend={pending > 0 ? `${pending} pending` : "All reviewed"}
              trendKind={pending > 0 ? "warn" : "steady"}
            />
            <KPI
              icon="group"
              color="lav"
              label="Total users"
              value={regularUsers.length.toLocaleString()}
              trend={`${activeUsers} active`}
            />
            <KPI
              icon="event"
              color="pch"
              label="Published events"
              value={publishedEvents.toString()}
              trend={`${events.length} total`}
            />
            <KPI
              icon="payments"
              color="mnt"
              label="Revenue"
              value={paymentAnalytics ? fmtNpr(parseFloat(paymentAnalytics.total_revenue)) : "--"}
              trend={paymentAnalytics ? `${paymentAnalytics.active_subscriptions} active subs` : ""}
            />
          </div>
        );

      case "org-status":
        return (
          <div key="org-status" className="chart-grid-21">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Org status breakdown</span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono,monospace",
                    fontSize: 10.5,
                    color: "var(--on-mut)",
                  }}
                >
                  {orgs.length} total
                </span>
              </div>
              <div
                className="panel-body"
                style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}
              >
                <StatBox label="Pending review" value={pending} note="needs action" />
                <StatBox label="Active" value={active} note="live" />
                <StatBox label="Suspended" value={suspended} note="blocked" />
                <StatBox
                  label="Verified"
                  value={filteredOrgs.filter((o) => o.is_verified).length}
                  note="KYC done"
                />
              </div>
            </div>
            <div className="depth">
              <div className="depth-ic">
                <MS n="cloud_done" size={112} />
              </div>
              <h4>Platform Status</h4>
              <p>
                {filteredOrgs.length} workspaces, {regularUsers.length} users,{" "}
                {filteredEvents.length} events.
                {pending > 0 ? ` ${pending} orgs awaiting review.` : " All orgs reviewed."}
              </p>
              <div className="depth-status">
                <span className="pulse" />
                Operational
              </div>
            </div>
          </div>
        );

      case "mrr": {
        // compute per-plan counts and percentages from filtered org data
        const planCounts: Record<string, number> = {};
        filteredOrgs.forEach((o) => {
          planCounts[o.plan] = (planCounts[o.plan] ?? 0) + 1;
        });
        const planSegments = Object.entries(planCounts)
          .filter(([, c]) => c > 0)
          .map(([plan, count]) => ({
            plan,
            count,
            color: PLAN_COLORS[plan] ?? "#9ca3af",
            pct: filteredOrgs.length > 0 ? Math.round((count / filteredOrgs.length) * 100) : 0,
          }));
        return (
          <div key="mrr" className="chart-grid-21">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">MRR trend (estimated)</span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontFamily: "JetBrains Mono,monospace",
                    color: "var(--on-mut)",
                  }}
                >
                  derived from plan pricing, not actual transactions
                </span>
                <span
                  style={{
                    fontFamily: "Space Grotesk",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {fmtNpr(totalMrr)}
                  {totalMrr > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#16a34a",
                        fontFamily: "JetBrains Mono,monospace",
                        marginLeft: 6,
                      }}
                    >
                      live
                    </span>
                  )}
                </span>
              </div>
              <div className="panel-body">
                <AreaChart data={mrrSeries} height={220} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Plan mix</span>
              </div>
              <div className="panel-body">
                <div className="donut-wrap">
                  <DonutChart
                    size={150}
                    label={filteredOrgs.length.toString()}
                    sub="orgs"
                    segments={
                      planSegments.length > 0
                        ? planSegments.map((s) => ({ pct: s.pct, color: s.color }))
                        : [{ pct: 100, color: "#9ca3af" }]
                    }
                  />
                  <div className="donut-leg">
                    {planSegments.length > 0 ? (
                      planSegments.map((s) => (
                        <div key={s.plan} className="donut-leg-it">
                          <span className="donut-leg-d" style={{ background: s.color }} />
                          <span className="donut-leg-l">{s.plan}</span>
                          <span className="donut-leg-p">{s.pct}%</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--on-mut)" }}>No orgs yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "funnel":
        return (
          <div key="funnel" className="chart-grid-3">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Acquisition funnel</span>
              </div>
              <div className="panel-body">
                <Funnel
                  stages={[
                    { l: "Signed up", v: regularUsers.length, c: "#050a26", c2: "#3b3a72" },
                    { l: "Created org", v: orgs.length, c: "#5a2c5e", c2: "#7a1d12" },
                    { l: "Active org", v: active, c: "#e83151", c2: "#dba13d" },
                  ]}
                />
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Org growth - monthly</span>
              </div>
              <div
                className="panel-body"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {orgMonthlyBars.length > 0 ? (
                  <Bars data={orgMonthlyBars} height={140} />
                ) : (
                  <div
                    style={{
                      height: 140,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--on-mut)",
                      fontSize: 13,
                    }}
                  >
                    No data yet
                  </div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">User stats</span>
              </div>
              <div
                className="panel-body"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <StatBox label="Total" value={regularUsers.length} />
                <StatBox label="Active" value={activeUsers} />
                <StatBox label="Verified" value={verifiedUsers} />
                <StatBox label="Staff" value={regularUsers.filter((u) => u.is_staff).length} />
              </div>
            </div>
          </div>
        );

      case "activity":
        return (
          <div key="activity" className="panel" style={{ marginBottom: 18 }}>
            <div className="panel-head">
              <span className="panel-title">Recent org activity</span>
            </div>
            <div className="panel-body">
              <div className="tl">
                {filteredOrgs.slice(0, 6).map((org, i) => (
                  <div key={i} className="tl-it">
                    <div className="tl-mk">
                      <div
                        className={`tl-dot ${org.status === "active" ? "success" : org.status === "suspended" ? "coral" : ""}`}
                      />
                      <div className="tl-rail" />
                    </div>
                    <div className="tl-body">
                      <div className="tl-t">{org.name}</div>
                      <div className="tl-s">{org.contact_email}</div>
                      <div className="tl-time">
                        <span
                          className={`pill ${org.status === "active" ? "active" : org.status === "suspended" ? "suspended" : "pending"}`}
                          style={{ fontSize: 9 }}
                        >
                          {org.status.replace("_", " ")}
                        </span>{" "}
                        <span>{new Date(org.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredOrgs.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--on-mut)",
                      fontFamily: "Manrope,sans-serif",
                    }}
                  >
                    No organizations yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AdminLayout crumbs={["Platform", "Dashboard"]}>
      {showCustomize && (
        <CustomizeDrawer
          order={order}
          hidden={hidden}
          onToggle={toggleWidget}
          onReorder={reorder}
          onClose={() => setShowCustomize(false)}
        />
      )}

      <PH
        title="Platform dashboard"
        sub="Real-time metrics across all SEU workspaces."
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <button className="btn-sm" onClick={() => setShowCustomize(true)}>
              <MS n="tune" size={13} />
              Customize
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const cutoff = getRangeCutoff(range);
                const filtered = cutoff
                  ? orgs.filter((o) => new Date(o.created_at) >= cutoff)
                  : orgs;
                const headers = ["Name", "Status", "Plan", "Email", "Created"];
                const rows = filtered.map((o) => [
                  o.name,
                  o.status,
                  o.plan,
                  o.contact_email,
                  new Date(o.created_at).toLocaleDateString(),
                ]);
                exportCSV(headers, rows, "dashboard-orgs");
              }}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const cutoff = getRangeCutoff(range);
                const filtered = cutoff
                  ? orgs.filter((o) => new Date(o.created_at) >= cutoff)
                  : orgs;
                const headers = ["Name", "Status", "Plan", "Email", "Created"];
                const rows = filtered.map((o) => [
                  o.name,
                  o.status,
                  o.plan,
                  o.contact_email,
                  new Date(o.created_at).toLocaleDateString(),
                ]);
                exportPDF("Platform Dashboard - Organizations", headers, rows, "dashboard-orgs");
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
            fontFamily: "Manrope,sans-serif",
          }}
        >
          Loading platform data...
        </div>
      ) : (
        order.map((id) => renderWidget(id))
      )}
    </AdminLayout>
  );
}
