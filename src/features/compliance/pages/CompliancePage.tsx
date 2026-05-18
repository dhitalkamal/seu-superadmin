import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";

const SOC2 = [
  {
    cat: "Security",
    ctrls: [
      { n: "CC1.1 Integrity and ethics", s: "pass" },
      { n: "CC2.1 Board oversight", s: "pass" },
      { n: "CC3.1 Risk assessment", s: "pass" },
      { n: "CC4.1 Monitoring", s: "pass" },
      { n: "CC5.1 Control activities", s: "pass" },
      { n: "CC6.1 Logical access", s: "pass" },
      { n: "CC6.6 Encryption at rest", s: "pass" },
      { n: "CC7.1 Anomaly detection", s: "prog" },
      { n: "CC8.1 Change management", s: "pass" },
      { n: "CC9.1 Risk mitigation", s: "pass" },
    ],
  },
  {
    cat: "Availability",
    ctrls: [
      { n: "A1.1 Capacity planning", s: "pass" },
      { n: "A1.2 Recovery RTO/RPO", s: "pass" },
      { n: "A1.3 BCP testing", s: "prog" },
    ],
  },
  {
    cat: "Confidentiality",
    ctrls: [
      { n: "C1.1 Classification", s: "pass" },
      { n: "C1.2 Disposal", s: "pass" },
      { n: "C1.3 Vendor access", s: "prog" },
    ],
  },
];

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

export default function CompliancePage() {
  const { toastEl, toast } = useToast();

  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: superadminApi.listOrgs });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });

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

  const passCount = SOC2.flatMap((c) => c.ctrls).filter((c) => c.s === "pass").length;
  const totalControls = SOC2.flatMap((c) => c.ctrls).length;

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Trust", "Compliance"]}
        title="Compliance and audit"
        sub="Org verification status, certifications, and SOC 2 control template."
        actions={
          <>
            <button className="btn-sm">
              <MS n="download" size={13} />
              Compliance pack
            </button>
            <button className="btn-sm primary" onClick={() => toast("New audit logged")}>
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
            <span className="panel-title">Organisation compliance breakdown</span>
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

      {/* SOC 2 control template */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">SOC 2 control template</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10.5,
              color: "var(--success)",
            }}
          >
            {passCount} / {totalControls} passing
          </span>
        </div>
        <div className="panel-body">
          <div
            style={{
              padding: "8px 12px",
              background: "var(--low)",
              borderRadius: 8,
              fontSize: 11.5,
              color: "var(--on-mut)",
              marginBottom: 16,
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <MS n="info" size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Template only. Connect to a real compliance tool (Vanta, Drata, etc.) for live status.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {SOC2.map((section) => (
              <div key={section.cat}>
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
                  {section.cat}
                </div>
                {section.ctrls.map((ctrl) => (
                  <div
                    key={ctrl.n}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 0",
                      borderBottom: "1px solid var(--outline)",
                      fontSize: 12,
                    }}
                  >
                    <MS
                      n={ctrl.s === "pass" ? "check_circle" : "pending"}
                      size={14}
                      style={{
                        color: ctrl.s === "pass" ? "var(--success)" : "var(--warning)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "var(--on-var)" }}>{ctrl.n}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
