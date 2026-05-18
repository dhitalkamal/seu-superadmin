import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type Org } from "@/shared/api/superadmin.api";

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

// *  Page

/** Verification queue - table of pending organisations awaiting admin review. */
export default function VerificationQueuePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, toastEl } = useToast();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: superadminApi.listOrgs,
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: superadminApi.approveOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation approved - dashboard access granted");
    },
  });
  const reject = useMutation({
    mutationFn: superadminApi.rejectOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation rejected");
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

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Platform", "Verification Queue"]}
        title="Verification queue"
        sub="Review and approve incoming workspace requests. SLA: 24 hours from submission."
        actions={
          <>
            <button className="btn-sm">
              <MS n="filter_alt" size={13} />
              Filter
            </button>
            <button className="btn-sm">
              <MS n="download" size={13} />
              Export
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
          value="N/A"
          trend="no data yet"
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
      ) : pendingOrgs.length === 0 ? (
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
              No organisations pending review.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Checklist</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrgs.map((org) => (
                  <VqRow
                    key={org.id}
                    org={org}
                    onAction={handleAction}
                    onReview={(id) => navigate(`/organisations/${id}/verify`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
