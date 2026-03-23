import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import superadminApi, { type DisputeStatus, type DisputeReason } from "@/shared/api/superadmin.api";

// * style maps

const STATUS_STYLE: Record<DisputeStatus, { label: string; bg: string; color: string }> = {
  open: { label: "Open", bg: "#eff6ff", color: "#1e40af" },
  under_review: { label: "Under Review", bg: "#fef9c3", color: "#854d0e" },
  resolved: { label: "Resolved", bg: "#f0fdf4", color: "#166534" },
  closed: { label: "Closed", bg: "var(--low)", color: "var(--on-mut)" },
};

const REASON_LABELS: Record<DisputeReason, string> = {
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent",
  not_received: "Not received",
  subscription_cancelled: "Subscription cancelled",
  other: "Other",
};

/**
 * Superadmin disputes dashboard  - lists all payment disputes platform-wide
 * and lets admins advance them through the lifecycle (open → under_review → resolved/closed).
 */
export default function DisputesPage() {
  const { toastEl, toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<DisputeStatus | "all">("all");

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: superadminApi.listAllDisputes,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DisputeStatus }) =>
      superadminApi.updateDisputeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast("Dispute updated");
    },
    onError: () => toast("Failed to update dispute"),
  });

  // * Computed stats
  const openCount = disputes.filter((d) => d.status === "open").length;
  const reviewCount = disputes.filter((d) => d.status === "under_review").length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;

  const filtered = filter === "all" ? disputes : disputes.filter((d) => d.status === filter);

  // * export helpers - format filtered disputes as rows for csv/pdf
  const exportHeaders = ["ID", "Order", "Status", "Reason", "Created"];
  function buildExportRows() {
    return filtered.map((d) => [
      d.id.slice(0, 8),
      d.order_id.slice(0, 8),
      STATUS_STYLE[d.status].label,
      d.reason,
      new Date(d.created_at).toLocaleDateString(),
    ]);
  }

  function handleExportCSV() {
    exportCSV(exportHeaders, buildExportRows(), "disputes");
  }

  function handleExportPDF() {
    exportPDF("Payment Disputes", exportHeaders, buildExportRows(), "disputes");
  }

  return (
    <AdminLayout crumbs={["Trust", "Disputes"]}>
      {toastEl}
      <PH
        title="Payment Disputes"
        sub="Review and resolve payment disputes across the platform."
        actions={
          <>
            <button className="btn-sm" onClick={handleExportCSV}>
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button className="btn-sm" onClick={handleExportPDF}>
              <MS n="picture_as_pdf" size={13} />
              Export PDF
            </button>
          </>
        }
      />

      {/* KPI row */}
      <div className="kpi-grid">
        <KPI
          icon="report_problem"
          color="crl"
          label="Open"
          value={openCount.toString()}
          trendKind={openCount > 0 ? "warn" : "steady"}
        />
        <KPI
          icon="hourglass_top"
          color="pch"
          label="Under Review"
          value={reviewCount.toString()}
          trendKind={reviewCount > 0 ? "warn" : "steady"}
        />
        <KPI icon="check_circle" color="mnt" label="Resolved" value={resolvedCount.toString()} />
        <KPI icon="gavel" color="lav" label="Total" value={disputes.length.toString()} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "open", "under_review", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            className="btn-sm"
            onClick={() => setFilter(s)}
            style={{
              background: filter === s ? "#111" : undefined,
              color: filter === s ? "#fff" : undefined,
              fontSize: 11,
            }}
          >
            {s === "all" ? "All" : STATUS_STYLE[s].label}
            {s !== "all" && ` (${disputes.filter((d) => d.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Disputes table */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Disputes</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10.5,
              color: "var(--on-mut)",
            }}
          >
            {filtered.length} {filter === "all" ? "total" : "matching"}
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
              Loading disputes...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <MS
                n="gavel"
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
                No disputes
              </p>
              <p
                style={{ fontSize: 13, color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}
              >
                Payment disputes will appear here when users open them.
              </p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Order</th>
                  <th>Reason</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Resolved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const s = STATUS_STYLE[d.status];
                  return (
                    <tr key={d.id}>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {d.id.slice(0, 8)}
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                        {d.order_id.slice(0, 8)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{REASON_LABELS[d.reason] ?? d.reason}</td>
                      <td
                        style={{
                          color: "var(--on-var)",
                          maxWidth: 260,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {d.description || "-"}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: s.bg,
                            color: s.color,
                          }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {d.resolved_at ? new Date(d.resolved_at).toLocaleDateString() : "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {d.status === "open" && (
                            <button
                              className="btn-sm"
                              onClick={() =>
                                updateMutation.mutate({ id: d.id, status: "under_review" })
                              }
                              disabled={updateMutation.isPending}
                              style={{ fontSize: 11 }}
                            >
                              Review
                            </button>
                          )}
                          {(d.status === "open" || d.status === "under_review") && (
                            <button
                              className="btn-sm"
                              onClick={() =>
                                updateMutation.mutate({ id: d.id, status: "resolved" })
                              }
                              disabled={updateMutation.isPending}
                              style={{ fontSize: 11 }}
                            >
                              Resolve
                            </button>
                          )}
                          {d.status === "resolved" && (
                            <button
                              className="btn-sm"
                              onClick={() => updateMutation.mutate({ id: d.id, status: "closed" })}
                              disabled={updateMutation.isPending}
                              style={{ fontSize: 11 }}
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
