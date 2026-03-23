import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import superadminApi, { type TicketPriority, type TicketStatus } from "@/shared/api/superadmin.api";

type TicketFilter = {
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
};

/** Dropdown filter panel for support tickets. */
function TicketFilterDropdown({
  filter,
  onChange,
  onClose,
}: {
  filter: TicketFilter;
  onChange: (f: TicketFilter) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const statuses: { value: TicketStatus | "all"; label: string }[] = [
    { value: "all", label: "All statuses" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "escalated", label: "Escalated" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  const priorities: { value: TicketPriority | "all"; label: string }[] = [
    { value: "all", label: "All priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "med", label: "Med" },
    { value: "low", label: "Low" },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        zIndex: 100,
        background: "var(--surface)",
        border: "1px solid var(--mid)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        padding: 14,
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--on-mut)",
            marginBottom: 6,
          }}
        >
          Status
        </p>
        <select
          value={filter.status}
          onChange={(e) => onChange({ ...filter, status: e.target.value as TicketStatus | "all" })}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--outline)",
            background: "var(--low)",
            color: "var(--on-bg)",
            fontSize: 12,
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--on-mut)",
            marginBottom: 6,
          }}
        >
          Priority
        </p>
        <select
          value={filter.priority}
          onChange={(e) =>
            onChange({ ...filter, priority: e.target.value as TicketPriority | "all" })
          }
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--outline)",
            background: "var(--low)",
            color: "var(--on-bg)",
            fontSize: 12,
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onChange({ status: "all", priority: "all" })}
        style={{
          padding: "5px 10px",
          borderRadius: 7,
          border: "1px solid var(--outline)",
          background: "transparent",
          fontSize: 11.5,
          cursor: "pointer",
          color: "var(--on-mut)",
          fontFamily: "Manrope, sans-serif",
          textAlign: "left",
        }}
      >
        Reset filters
      </button>
    </div>
  );
}

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

  // * create ticket form state
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high" | "critical">("med");
  const [showFilter, setShowFilter] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>({ status: "all", priority: "all" });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: superadminApi.listTickets,
  });

  // * create ticket mutation - resets form on success
  const createMutation = useMutation({
    mutationFn: () => superadminApi.createTicket({ subject, message, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast("Ticket created");
      setShowCreate(false);
      setSubject("");
      setMessage("");
      setPriority("med");
    },
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

  // apply client-side filter
  const filteredTickets = tickets.filter((t) => {
    const matchStatus = ticketFilter.status === "all" ? true : t.status === ticketFilter.status;
    const matchPriority =
      ticketFilter.priority === "all" ? true : t.priority === ticketFilter.priority;
    return matchStatus && matchPriority;
  });

  const hasActiveFilter = ticketFilter.status !== "all" || ticketFilter.priority !== "all";

  // * export helpers - format tickets as rows for csv/pdf
  const exportHeaders = ["Subject", "Status", "Priority", "Created"];
  function buildExportRows() {
    return tickets.map((t) => [
      t.subject,
      STATUS_STYLE[t.status].label,
      PRIORITY_STYLE[t.priority].label,
      new Date(t.created_at).toLocaleDateString(),
    ]);
  }

  function handleExportCSV() {
    exportCSV(exportHeaders, buildExportRows(), "support-tickets");
  }

  function handleExportPDF() {
    exportPDF("Support Tickets", exportHeaders, buildExportRows(), "support-tickets");
  }

  return (
    <AdminLayout crumbs={["Platform", "Support"]}>
      {toastEl}
      <PH
        title="Support tickets"
        sub="Organization requests, bug reports, and escalations."
        actions={
          <>
            <button className="btn-sm" onClick={() => setShowCreate((v) => !v)}>
              <MS n="add" size={13} />
              New ticket
            </button>
            <div style={{ position: "relative" }}>
              <button
                className="btn-sm"
                onClick={() => setShowFilter((v) => !v)}
                style={{ fontWeight: hasActiveFilter ? 700 : undefined }}
              >
                <MS n="filter_list" size={13} />
                Filter{hasActiveFilter ? " · active" : ""}
              </button>
              {showFilter && (
                <TicketFilterDropdown
                  filter={ticketFilter}
                  onChange={(f) => setTicketFilter(f)}
                  onClose={() => setShowFilter(false)}
                />
              )}
            </div>
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

      {/* create ticket form */}
      {showCreate && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Create ticket</span>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label
                htmlFor="ticket-subject"
                style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
              >
                Subject
              </label>
              <input
                id="ticket-subject"
                type="text"
                className="input"
                placeholder="Brief summary of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="ticket-message"
                style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
              >
                Message
              </label>
              <textarea
                id="ticket-message"
                className="input"
                rows={3}
                placeholder="Describe the issue in detail"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="ticket-priority"
                style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
              >
                Priority
              </label>
              <select
                id="ticket-priority"
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "med" | "high" | "critical")}
              >
                <option value="low">Low</option>
                <option value="med">Med</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn-sm"
                onClick={() => {
                  setShowCreate(false);
                  setSubject("");
                  setMessage("");
                  setPriority("med");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-sm"
                disabled={!subject.trim() || !message.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Submit ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {hasActiveFilter ? `${filteredTickets.length} of ${tickets.length}` : `${tickets.length} total`}
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
          ) : filteredTickets.length === 0 ? (
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
                Support tickets submitted by organizations will appear here.
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
                {filteredTickets.map((t) => {
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
