import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type TicketPriority, type TicketStatus } from "@/shared/api/superadmin.api";

const PRIORITY_STYLE: Record<TicketPriority, { label: string; bg: string; color: string }> = {
  critical: { label: "Critical", bg: "#fee2e2", color: "#991b1b" },
  high: { label: "High", bg: "#fef3c7", color: "#92400e" },
  med: { label: "Med", bg: "#ede9fe", color: "#4c1d95" },
  low: { label: "Low", bg: "#f0fdf4", color: "#166534" },
};

const STATUS_STYLE: Record<TicketStatus, { label: string; bg: string; color: string }> = {
  open: { label: "Open", bg: "#eff6ff", color: "#1e40af" },
  in_progress: { label: "In progress", bg: "#fef9c3", color: "#854d0e" },
  escalated: { label: "Escalated", bg: "#fce7f3", color: "#9d174d" },
  resolved: { label: "Resolved", bg: "#f0fdf4", color: "#166534" },
  closed: { label: "Closed", bg: "var(--low)", color: "var(--on-mut)" },
};

export default function SupportPage() {
  const { toastEl, toast } = useToast();
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: superadminApi.listTickets,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      superadminApi.updateTicketStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast("Ticket updated");
    },
  });

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const escalatedCount = tickets.filter((t) => t.status === "escalated").length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Platform", "Support"]}
        title="Support tickets"
        sub="Organisation requests, bug reports, and escalations."
        actions={
          <>
            <button className="btn-sm">
              <MS n="filter_list" size={13} />
              Filter
            </button>
            <button className="btn-sm">
              <MS n="download" size={13} />
              Export
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          icon="support_agent"
          color="crl"
          label="Open"
          value={openCount.toString()}
          trendKind={openCount > 0 ? "warn" : "steady"}
        />
        <KPI
          icon="priority_high"
          color="pch"
          label="Escalated"
          value={escalatedCount.toString()}
          trendKind={escalatedCount > 0 ? "warn" : "steady"}
        />
        <KPI icon="check_circle" color="mnt" label="Resolved" value={resolvedCount.toString()} />
        <KPI
          icon="confirmation_number"
          color="lav"
          label="Total"
          value={tickets.length.toString()}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">All tickets</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10.5,
              color: "var(--on-mut)",
            }}
          >
            {tickets.length} total
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
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <MS
                n="confirmation_number"
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
                No tickets yet
              </p>
              <p
                style={{ fontSize: 13, color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}
              >
                Support tickets submitted by organisations will appear here.
              </p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Org</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const p = PRIORITY_STYLE[t.priority];
                  const s = STATUS_STYLE[t.status];
                  return (
                    <tr key={t.id}>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {t.id.slice(0, 8)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{t.subject}</td>
                      <td style={{ color: "var(--on-var)" }}>{t.org_name || "-"}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: p.bg,
                            color: p.color,
                          }}
                        >
                          {p.label}
                        </span>
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
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {t.status !== "resolved" && t.status !== "closed" && (
                            <button
                              className="btn-sm"
                              onClick={() =>
                                updateMutation.mutate({ id: t.id, status: "resolved" })
                              }
                              disabled={updateMutation.isPending}
                              style={{ fontSize: 11 }}
                            >
                              Resolve
                            </button>
                          )}
                          {t.status === "open" && (
                            <button
                              className="btn-sm"
                              onClick={() =>
                                updateMutation.mutate({ id: t.id, status: "escalated" })
                              }
                              disabled={updateMutation.isPending}
                              style={{ fontSize: 11 }}
                            >
                              Escalate
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
