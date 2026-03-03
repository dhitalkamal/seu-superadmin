import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";
import { usePagination } from "@/shared/lib/usePagination";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import Pagination from "@/shared/components/Pagination";
import DateRangeFilter, { getRangeCutoff, type Range } from "@/shared/components/DateRangeFilter";

/** color a dot next to the action badge based on the event type category */
function actionColor(eventType: string): string {
  if (eventType.includes("login") || eventType.includes("password") || eventType.includes("mfa"))
    return "#050a26";
  if (eventType.includes("suspend") || eventType.includes("reject") || eventType.includes("lock"))
    return "#e83151";
  if (
    eventType.includes("approve") ||
    eventType.includes("activate") ||
    eventType.includes("verify")
  )
    return "#16a34a";
  return "#dba13d";
}

/** short initials avatar from actor name */
function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
}

export default function AuditLogPage() {
  const { toastEl, toast } = useToast();
  const [range, setRange] = useState<Range>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: superadminApi.listAuditLog,
    refetchInterval: 60_000,
  });

  // filter entries by selected date range
  const cutoff = getRangeCutoff(range);
  const filteredEntries = useMemo(
    () => (cutoff ? entries.filter((e) => new Date(e.created_at) >= cutoff) : entries),
    [entries, cutoff]
  );

  const { page, totalPages, paged, from, to, total, setPage, next, prev } = usePagination(
    filteredEntries,
    20
  );

  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), []);

  const recent = entries.filter((e) => new Date(e.created_at) >= thirtyDaysAgo).length;
  const distinctActors = new Set(entries.map((e) => e.user_id)).size;
  const privileged = entries.filter(
    (e) =>
      e.event_type.includes("suspend") ||
      e.event_type.includes("approve") ||
      e.event_type.includes("reject") ||
      e.event_type.includes("delete")
  ).length;

  return (
    <AdminLayout crumbs={["Trust", "Audit log"]}>
      {toastEl}
      <PH
        title="Platform audit log"
        sub="Every privileged action across the platform - who, what, when, where, from which device."
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <button
              className="btn-sm"
              onClick={() => {
                const headers = [
                  "Timestamp",
                  "Actor",
                  "Role",
                  "Action",
                  "Target",
                  "Details",
                  "IP",
                  "User Agent",
                ];
                const rows = filteredEntries.map((e) => {
                  const meta = e.metadata as Record<string, string>;
                  const metaStr =
                    Object.entries(meta)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("; ") || "-";
                  const target = meta.target ?? meta.email ?? meta.org_name ?? meta.resource ?? "-";
                  return [
                    new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19),
                    e.actor_name,
                    e.actor_role,
                    e.event_type,
                    target,
                    metaStr,
                    e.ip_address ?? "internal",
                    e.user_agent ?? "internal",
                  ];
                });
                exportCSV(headers, rows, `audit-log-${new Date().toISOString().slice(0, 10)}`);
                toast("CSV exported");
              }}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() => {
                const headers = ["Timestamp", "Actor", "Role", "Action", "Target", "Details", "IP"];
                const rows = filteredEntries.map((e) => {
                  const meta = e.metadata as Record<string, string>;
                  const metaStr =
                    Object.entries(meta)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("; ") || "-";
                  const target = meta.target ?? meta.email ?? meta.org_name ?? meta.resource ?? "-";
                  return [
                    new Date(e.created_at).toISOString().replace("T", " ").slice(0, 19),
                    e.actor_name,
                    e.actor_role,
                    e.event_type,
                    target,
                    metaStr,
                    e.ip_address ?? "internal",
                  ];
                });
                exportPDF(
                  "Platform Audit Log",
                  headers,
                  rows,
                  `audit-log-${new Date().toISOString().slice(0, 10)}`
                );
              }}
            >
              <MS n="picture_as_pdf" size={13} />
              Export PDF
            </button>
            <button className="btn-sm" onClick={() => toast("Scheduled digest coming soon")}>
              <MS n="schedule_send" size={13} />
              Schedule digest
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          icon="history"
          color="lav"
          label="Events (30D)"
          value={recent.toLocaleString()}
          trend={`${entries.length} total`}
        />
        <KPI icon="person" color="pch" label="Distinct actors" value={distinctActors.toString()} />
        <KPI
          icon="warning"
          color="crl"
          label="Privileged actions"
          value={privileged.toString()}
          trend="approve/suspend/delete"
          trendKind={privileged > 0 ? "warn" : "steady"}
        />
        <KPI icon="lock" color="mnt" label="Retention" value="7y" trend="immutable storage" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent activity</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--on-mut)",
              textTransform: "uppercase",
            }}
          >
            Newest first - UTC
          </span>
        </div>
        <div className="panel-body flush">
          {isLoading ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--on-mut)",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Loading audit events...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <MS
                n="history"
                size={32}
                style={{ display: "block", margin: "0 auto 12px", opacity: 0.25 }}
              />
              <p
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 600,
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                No audit events yet
              </p>
              <p
                style={{ fontSize: 13, color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}
              >
                Platform actions will be recorded here as users and admins interact with the system.
              </p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Meta</th>
                  <th>Origin</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry) => {
                  const meta = entry.metadata as Record<string, string>;
                  const metaStr =
                    Object.entries(meta)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ") || "-";
                  const color = actionColor(entry.event_type);
                  const ini = initials(entry.actor_name);
                  const ua = entry.user_agent ?? "internal";
                  const origin = entry.ip_address ?? "internal";
                  return (
                    <tr key={entry.id}>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(entry.created_at).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg,#050a26,#3b3a72)",
                              color: "white",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 10,
                              fontFamily: "Manrope, sans-serif",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {ini}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                              {entry.actor_name}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--on-mut)",
                                fontFamily: "Manrope, sans-serif",
                              }}
                            >
                              {entry.actor_role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: color + "18",
                            color,
                          }}
                        >
                          {entry.event_type}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: 13,
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {meta.target ?? meta.email ?? meta.org_name ?? meta.resource ?? "-"}
                      </td>
                      <td
                        style={{
                          fontSize: 11.5,
                          color: "var(--on-mut)",
                          fontFamily: "JetBrains Mono, monospace",
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {metaStr}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        <div>{origin}</div>
                        <div
                          style={{
                            fontSize: 10,
                            marginTop: 1,
                            maxWidth: 140,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ua.slice(0, 40)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPrev={prev}
          onNext={next}
          onPage={setPage}
        />
      </div>
    </AdminLayout>
  );
}
