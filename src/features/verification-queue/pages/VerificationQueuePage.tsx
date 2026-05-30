import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type Org, type OrgType } from "@/shared/api/superadmin.api";
import { usePagination } from "@/shared/lib/usePagination";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import Pagination from "@/shared/components/Pagination";

// filter state type for the queue
type QueueFilter = {
  status: "pending_review" | "all";
  orgType: OrgType | "all";
};

/** Dropdown filter panel for the verification queue. */
function FilterDropdown({
  filter,
  onChange,
  onClose,
}: {
  filter: QueueFilter;
  onChange: (f: QueueFilter) => void;
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

  const orgTypes: { value: OrgType | "all"; label: string }[] = [
    { value: "all", label: "All types" },
    { value: "company", label: "Company" },
    { value: "ngo", label: "NGO" },
    { value: "community", label: "Community" },
    { value: "educational", label: "Educational" },
    { value: "government", label: "Government" },
    { value: "individual", label: "Individual" },
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
        <div style={{ display: "flex", gap: 6 }}>
          {(["pending_review", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...filter, status: s })}
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: "1px solid var(--outline)",
                background: filter.status === s ? "var(--low)" : "transparent",
                fontWeight: filter.status === s ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
                color: "var(--on-bg)",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              {s === "pending_review" ? "Pending" : "All"}
            </button>
          ))}
        </div>
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
          Org type
        </p>
        <select
          value={filter.orgType}
          onChange={(e) => onChange({ ...filter, orgType: e.target.value as OrgType | "all" })}
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
          {orgTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onChange({ status: "pending_review", orgType: "all" })}
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

// *  Table Row

/** Single pending-org row inside the verification queue table. */
function VqRow({
  org,
  onAction,
  onReview,
}: {
  org: Org;
  onAction: (a: string, id: string) => void;
  onReview: (id: string) => void;
}) {
  const mark = org.name?.[0]?.toUpperCase() ?? "O";
  const hasLocation = !!(org.city || org.country);
  const location = [org.city, org.country].filter(Boolean).join(", ") || "-";
  const orgType = (org.org_type || "company")
    .replace("_", " ")
    .replace(/^\w/, (c: string) => c.toUpperCase());
  const daysAgo = Math.floor((Date.now() - new Date(org.created_at).getTime()) / 86_400_000);
  const urgency = daysAgo >= 3;

  return (
    <tr>
      {/* org identity */}
      <td>
        <div className="ev-cell">
          <div
            className="ev-icon"
            style={{ background: "linear-gradient(135deg,#5a4ba3,#a08ae8)", color: "white" }}
          >
            {mark}
          </div>
          <div>
            <div className="ev-name">{org.name}</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--on-mut)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              @{org.slug}
            </div>
          </div>
        </div>
      </td>

      {/* org type */}
      <td>
        <span className="pill" style={{ fontSize: 10.5 }}>
          {orgType}
        </span>
      </td>

      {/* contact */}
      <td>
        <div style={{ fontSize: 12.5 }}>{org.contact_email}</div>
        {org.phone && (
          <div
            style={{
              fontSize: 11,
              color: "var(--on-mut)",
              fontFamily: "JetBrains Mono, monospace",
              marginTop: 2,
            }}
          >
            {org.phone}
          </div>
        )}
      </td>

      {/* location */}
      <td>
        {hasLocation ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MS n="location_on" size={13} style={{ color: "var(--on-mut)" }} />
            <span style={{ fontSize: 12.5 }}>{location}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--on-mut)" }}>-</span>
        )}
      </td>

      {/* checklist - quick pass/fail icons for key verification items */}
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          <CheckDot ok={!!org.contact_email} title="Email" />
          <CheckDot ok={!!org.website} title="Website" />
          <CheckDot ok={hasLocation} title="Location" />
          <CheckDot ok={!!org.phone} title="Phone" />
        </div>
      </td>

      {/* submitted date + urgency */}
      <td>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
          {new Date(org.created_at).toLocaleDateString()}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: urgency ? "#dc2626" : "var(--on-mut)",
            fontFamily: "JetBrains Mono, monospace",
            marginTop: 2,
          }}
        >
          {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
        </div>
      </td>

      {/* actions */}
      <td>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button
            className="btn-sm"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onReview(org.id)}
          >
            <MS n="open_in_new" size={12} />
            Review
          </button>
          <button
            className="btn-sm primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onAction("approve", org.id)}
          >
            <MS n="check" size={12} />
            Approve
          </button>
          <button
            className="btn-sm danger"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onAction("reject", org.id)}
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}

// *  Check Dot

/** Tiny pass/fail indicator for the checklist column. */
function CheckDot({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span
      title={`${title}: ${ok ? "provided" : "missing"}`}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
        display: "inline-grid",
        placeItems: "center",
        cursor: "default",
      }}
    >
      <MS n={ok ? "check" : "close"} size={11} style={{ color: ok ? "#22c55e" : "#ef4444" }} />
    </span>
  );
}

// *  Helpers

/** Format avg_review_hours into a readable string. Returns "< 1h" for sub-hour values. */
function formatAvgReviewTime(hours: number | undefined): string {
  if (hours === undefined || hours === null) return "N/A";
  if (hours < 1) return "< 1h";
  return `${hours.toFixed(1)}h`;
}

// *  Page

/** Verification queue - table of pending organizations awaiting admin review. */
export default function VerificationQueuePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, toastEl } = useToast();
  const [showFilter, setShowFilter] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>({
    status: "pending_review",
    orgType: "all",
  });
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: superadminApi.listOrgs,
    refetchInterval: 15_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: superadminApi.getAnalytics,
    refetchInterval: 60_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => superadminApi.approveOrg(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organization approved - dashboard access granted");
    },
  });
  const reject = useMutation({
    mutationFn: (id: string) => superadminApi.rejectOrg(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organization rejected");
    },
  });

  /** Route approve/reject to the right mutation. */
  function handleAction(action: string, id: string) {
    if (action === "approve") approve.mutate(id);
    else if (action === "reject") reject.mutate(id);
  }

  const pendingOrgs = orgs.filter((o) => o.status === "pending_review");
  const approvedOrgs = orgs.filter((o) => o.status === "active" || o.status === "approved");
  const suspendedOrgs = orgs.filter((o) => o.status === "suspended");

  // apply client-side filter
  const filteredQueue = orgs.filter((o) => {
    const matchStatus = queueFilter.status === "all" ? true : o.status === queueFilter.status;
    const matchType =
      queueFilter.orgType === "all" ? true : (o.org_type ?? "company") === queueFilter.orgType;
    return matchStatus && matchType;
  });

  const { page, totalPages, paged, from, to, total, setPage, next, prev } = usePagination(
    filteredQueue,
    20
  );

  /** Build export rows from pending orgs: [name, email, type, submitted date, days waiting]. */
  function buildExportRows(): string[][] {
    return pendingOrgs.map((org) => {
      const orgType = (org.org_type || "company")
        .replace("_", " ")
        .replace(/^\w/, (c: string) => c.toUpperCase());
      const submitted = new Date(org.created_at).toLocaleDateString();
      const daysWaiting = Math.floor(
        (Date.now() - new Date(org.created_at).getTime()) / 86_400_000
      ).toString();
      return [org.name, org.contact_email || "", orgType, submitted, daysWaiting];
    });
  }

  const exportHeaders = ["Name", "Email", "Type", "Submitted", "Days Waiting"];

  /** Download pending orgs as CSV. */
  function handleExportCSV() {
    exportCSV(exportHeaders, buildExportRows(), "verification-queue");
  }

  /** Open print dialog for pending orgs as PDF. */
  function handleExportPDF() {
    exportPDF("Verification Queue", exportHeaders, buildExportRows(), "verification-queue");
  }

  return (
    <AdminLayout crumbs={["Platform", "Verification Queue"]}>
      {toastEl}
      <PH
        title="Verification queue"
        sub="Review and approve incoming workspace requests. SLA: 24 hours from submission."
        actions={
          <>
            <div ref={filterRef} style={{ position: "relative" }}>
              <button
                className="btn-sm"
                onClick={() => setShowFilter((v) => !v)}
                style={{
                  fontWeight:
                    queueFilter.status !== "pending_review" || queueFilter.orgType !== "all"
                      ? 700
                      : undefined,
                }}
              >
                <MS n="filter_alt" size={13} />
                Filter{queueFilter.orgType !== "all" ? ` · ${queueFilter.orgType}` : ""}
              </button>
              {showFilter && (
                <FilterDropdown
                  filter={queueFilter}
                  onChange={(f) => {
                    setQueueFilter(f);
                  }}
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

      {/* KPI strip */}
      <div className="kpi-grid">
        <KPI
          icon="pending_actions"
          color={pendingOrgs.length > 0 ? "pch" : "mnt"}
          label="Pending"
          value={pendingOrgs.length.toString()}
          trend={pendingOrgs.length === 0 ? "all clear" : `${pendingOrgs.length} awaiting`}
          trendKind={pendingOrgs.length > 0 ? "warn" : "steady"}
        />
        <KPI
          icon="check_circle"
          color="mnt"
          label="Approved (total)"
          value={approvedOrgs.length.toString()}
          trend="active orgs"
        />
        <KPI
          icon="cancel"
          color="crl"
          label="Suspended"
          value={suspendedOrgs.length.toString()}
          trend="all time"
        />
        <KPI
          icon="schedule"
          color="lav"
          label="Avg review time"
          value={formatAvgReviewTime(analytics?.orgs?.avg_review_hours)}
          trend={analytics?.orgs?.avg_review_hours !== undefined ? "from analytics API" : "no data yet"}
          trendKind="steady"
        />
      </div>

      {/* table or empty state */}
      {isLoading ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--on-mut)",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Loading queue...
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="panel">
          <div className="panel-body" style={{ padding: "60px 20px", textAlign: "center" }}>
            <MS
              n="check_circle"
              size={48}
              style={{ color: "var(--success)", display: "block", margin: "0 auto 16px" }}
            />
            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontWeight: 600,
                fontSize: 18,
                color: "var(--on-bg)",
                marginBottom: 6,
              }}
            >
              Queue is clear
            </p>
            <p style={{ fontSize: 13, color: "var(--on-mut)", fontFamily: "Manrope, sans-serif" }}>
              No organizations pending review.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Checklist</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((org) => (
                  <VqRow
                    key={org.id}
                    org={org}
                    onAction={handleAction}
                    onReview={(id) => navigate(`/organizations/${id}/verify`)}
                  />
                ))}
              </tbody>
            </table>
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
      )}
    </AdminLayout>
  );
}
