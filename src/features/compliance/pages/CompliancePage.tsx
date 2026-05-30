import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi, {
  type ComplianceControl,
  type ComplianceStatus,
} from "@/shared/api/superadmin.api";

// static certification cards - informational display only
const CERTS = [
  {
    c: "SOC 2 Type II",
    s: "Planned",
    e: "Q3 2026",
    ic: "verified_user",
    col: "#dba13d",
    iss: "AICPA",
  },
  { c: "GDPR", s: "Compliant", e: "Ongoing", ic: "shield", col: "#16a34a", iss: "EU" },
  { c: "ISO 27001", s: "Planned", e: "Q1 2027", ic: "pending", col: "#dba13d", iss: "ISO/IEC" },
  { c: "HIPAA", s: "N/A", e: "-", ic: "remove", col: "#6b6c75", iss: "-" },
];

// categories the API groups controls into
const KNOWN_CATEGORIES = ["security", "availability", "confidentiality", "audit"];

/** Label for a raw category slug. */
function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    security: "Security",
    availability: "Availability",
    confidentiality: "Confidentiality",
    audit: "Audit",
  };
  return map[cat] ?? cat.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Color and icon for a compliance status value. */
function statusStyle(status: ComplianceStatus): { color: string; icon: string } {
  if (status === "pass") return { color: "var(--success)", icon: "check_circle" };
  if (status === "fail") return { color: "#e83151", icon: "cancel" };
  return { color: "var(--on-mut)", icon: "remove_circle" };
}

// *  New control inline form

type NewControlFormProps = {
  defaultCategory?: string;
  onClose: () => void;
};

/** Inline form for creating a new compliance control. */
function NewControlForm({ defaultCategory = "security", onClose }: NewControlFormProps) {
  const qc = useQueryClient();
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ComplianceStatus>("pass");

  const create = useMutation({
    mutationFn: (payload: {
      category: string;
      name: string;
      description?: string;
      status: ComplianceStatus;
    }) => superadminApi.createComplianceControl(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-controls"] });
      qc.invalidateQueries({ queryKey: ["compliance-summary"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({
      category: category.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      status,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "12px 16px",
        background: "var(--low)",
        borderRadius: 10,
        border: "1px solid var(--outline)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <p
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--on-mut)",
          margin: 0,
        }}
      >
        New control
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--on-mut)",
              marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Control name"
            required
            style={{
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid var(--outline)",
              background: "var(--surface)",
              color: "var(--on-bg)",
              fontSize: 12.5,
              fontFamily: "Manrope, sans-serif",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--on-mut)",
              marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Category <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid var(--outline)",
              background: "var(--surface)",
              color: "var(--on-bg)",
              fontSize: 12.5,
              fontFamily: "Manrope, sans-serif",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {KNOWN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        style={{
          padding: "6px 10px",
          borderRadius: 7,
          border: "1px solid var(--outline)",
          background: "var(--surface)",
          color: "var(--on-bg)",
          fontSize: 12.5,
          fontFamily: "Manrope, sans-serif",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "var(--on-mut)",
              marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Status <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ComplianceStatus)}
            required
            style={{
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid var(--outline)",
              background: "var(--surface)",
              color: "var(--on-bg)",
              fontSize: 12.5,
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="na">N/A</option>
          </select>
        </div>
        <button
          type="submit"
          className="btn-sm primary"
          disabled={create.isPending}
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          {create.isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="btn-sm"
          onClick={onClose}
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// *  Single control row

/** One compliance control row with a clickable status toggle. */
function ControlRow({ ctrl }: { ctrl: ComplianceControl }) {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: (status: ComplianceStatus) =>
      superadminApi.updateComplianceControl(ctrl.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-controls"] });
      qc.invalidateQueries({ queryKey: ["compliance-summary"] });
    },
  });

  // cycle through pass -> fail -> na -> pass
  function nextStatus(current: ComplianceStatus): ComplianceStatus {
    if (current === "pass") return "fail";
    if (current === "fail") return "na";
    return "pass";
  }

  const { color, icon } = statusStyle(ctrl.status);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid var(--outline)",
        fontSize: 12,
      }}
    >
      {/* clickable icon cycles status */}
      <button
        title={`Status: ${ctrl.status} - click to change`}
        onClick={() => update.mutate(nextStatus(ctrl.status))}
        disabled={update.isPending}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <MS n={icon} size={14} style={{ color }} />
      </button>
      <span
        style={{
          color: "var(--on-var)",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {ctrl.name}
      </span>
    </div>
  );
}

// *  Page

export default function CompliancePage() {
  const { toastEl, toast } = useToast();
  const [showNewControl, setShowNewControl] = useState(false);
  const [showNewAudit, setShowNewAudit] = useState(false);

  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: superadminApi.listOrgs });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ["compliance-controls"],
    queryFn: superadminApi.listComplianceControls,
  });

  const { data: summary } = useQuery({
    queryKey: ["compliance-summary"],
    queryFn: superadminApi.getComplianceSummary,
  });

  const verifiedOrgs = orgs.filter((o) => o.is_verified).length;
  const activeOrgs = orgs.filter((o) => o.status === "active").length;
  const pendingOrgs = orgs.filter((o) => o.status === "pending_review").length;
  const regularUsers = users.filter((u) => !u.is_superuser);

  const complianceScore = orgs.length > 0 ? Math.round((verifiedOrgs / orgs.length) * 100) : 0;

  const lastOrgDate = useMemo(() => {
    if (orgs.length === 0) return "N/A";
    const latest = orgs.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    return new Date(latest.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }, [orgs]);

  // group controls by category for display
  const grouped = useMemo(() => {
    const map = new Map<string, ComplianceControl[]>();
    for (const ctrl of controls) {
      const cat = ctrl.category ?? "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(ctrl);
    }
    return map;
  }, [controls]);

  const passCount = summary?.passing ?? controls.filter((c) => c.status === "pass").length;
  const totalControls = summary?.total ?? controls.length;

  return (
    <AdminLayout crumbs={["Trust", "Compliance"]}>
      {toastEl}
      <PH
        title="Compliance and audit"
        sub="Org verification status, certifications, and compliance controls."
        actions={
          <>
            <button
              className="btn-sm"
              onClick={() => toast("Compliance pack download coming soon")}
            >
              <MS n="download" size={13} />
              Compliance pack
            </button>
            <button className="btn-sm primary" onClick={() => setShowNewAudit((v) => !v)}>
              <MS n="add" size={13} />
              New audit
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          icon="verified"
          color={complianceScore >= 80 ? "mnt" : "pch"}
          label="Verification rate"
          value={`${complianceScore}%`}
          trend={`${verifiedOrgs} of ${orgs.length} orgs verified`}
        />
        <KPI
          icon="report"
          color="crl"
          label="Pending review"
          value={pendingOrgs.toString()}
          trend={pendingOrgs > 0 ? "needs action" : "all clear"}
          trendKind={pendingOrgs > 0 ? "warn" : "steady"}
        />
        <KPI
          icon="domain_verification"
          color="lav"
          label="Active orgs"
          value={activeOrgs.toString()}
          trend={`${orgs.length} total`}
        />
        <KPI
          icon="schedule"
          color="pch"
          label="Latest org"
          value={lastOrgDate}
          trend="most recent registration"
        />
      </div>

      {/* cert cards */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}
      >
        {CERTS.map((cert) => (
          <div key={cert.c} className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: cert.col + "1a",
                  color: cert.col,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MS n={cert.ic} size={18} />
              </div>
              <span
                className={`pill ${cert.s === "Compliant" ? "active" : cert.s === "Planned" ? "pending" : "draft"}`}
              >
                {cert.s}
              </span>
            </div>
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.02em",
              }}
            >
              {cert.c}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--on-mut)",
                marginTop: 4,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {cert.iss} - {cert.e}
            </div>
          </div>
        ))}
      </div>

      {/* platform stats */}
      <div className="chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Organization compliance breakdown</span>
          </div>
          <div
            className="panel-body"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
          >
            {[
              ["Verified", verifiedOrgs, "#16a34a"],
              ["Active", activeOrgs, "#050a26"],
              ["Pending review", pendingOrgs, "#dba13d"],
              ["Suspended", orgs.filter((o) => o.status === "suspended").length, "#e83151"],
            ].map(([label, value, color]) => (
              <div
                key={String(label)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--outline)",
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--on-mut)",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "Space Grotesk",
                    fontWeight: 700,
                    fontSize: 26,
                    letterSpacing: "-0.03em",
                    color: String(color),
                  }}
                >
                  {Number(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">User compliance overview</span>
          </div>
          <div
            className="panel-body"
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
          >
            {[
              ["Total users", regularUsers.length, "var(--on-bg)"],
              ["Email verified", regularUsers.filter((u) => u.is_email_verified).length, "#16a34a"],
              ["MFA enabled", regularUsers.filter((u) => u.is_mfa_enabled).length, "#050a26"],
              ["Active", regularUsers.filter((u) => u.is_active).length, "#dba13d"],
            ].map(([label, value, color]) => (
              <div
                key={String(label)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--outline)",
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--on-mut)",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "Space Grotesk",
                    fontWeight: 700,
                    fontSize: 26,
                    letterSpacing: "-0.03em",
                    color: String(color),
                  }}
                >
                  {Number(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* compliance controls panel */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Compliance controls</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10.5,
                color: "var(--success)",
              }}
            >
              {passCount} / {totalControls} passing
            </span>
            <button
              className="btn-sm"
              onClick={() => setShowNewControl((v) => !v)}
              style={{ fontSize: 11 }}
            >
              <MS n="add" size={12} />
              New control
            </button>
          </div>
        </div>
        <div className="panel-body">
          {/* new audit form - creates a control with category=audit */}
          {showNewAudit && (
            <NewControlForm defaultCategory="audit" onClose={() => setShowNewAudit(false)} />
          )}

          {/* new control form */}
          {showNewControl && <NewControlForm onClose={() => setShowNewControl(false)} />}

          {controlsLoading ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--on-mut)",
                fontFamily: "Manrope, sans-serif",
              }}
            >
              Loading controls...
            </div>
          ) : controls.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <MS
                n="checklist"
                size={32}
                style={{ display: "block", margin: "0 auto 12px", opacity: 0.25 }}
              />
              <p
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 6,
                }}
              >
                No controls yet
              </p>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--on-mut)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                Use the New control button above to add compliance controls.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {Array.from(grouped.entries()).map(([cat, ctrls]) => (
                <div key={cat}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--on-mut)",
                      marginBottom: 8,
                    }}
                  >
                    {categoryLabel(cat)}
                  </div>
                  {ctrls.map((ctrl) => (
                    <ControlRow key={ctrl.id} ctrl={ctrl} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
