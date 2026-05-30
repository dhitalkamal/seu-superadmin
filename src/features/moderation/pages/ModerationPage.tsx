import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type ModerationCase } from "@/shared/api/superadmin.api";

// policy decision tree is static - it describes rules, not data
const aiTriage = [
  ["Toxicity", "0.04", "low"],
  ["Misleading", "0.72", "high"],
  ["Off-policy", "0.51", "med"],
  ["Spam", "0.08", "low"],
];

/** Severity pill for a moderation case. Derived from report count and status. */
function sevFromCase(c: ModerationCase): "high" | "med" | "low" {
  if (c.status === "pending") return "high";
  if (c.status === "under_review") return "med";
  return "low";
}

/** Content moderation - wired to real moderation API. */
export default function ModerationPage() {
  const { toast, toastEl } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["moderation-cases"],
    queryFn: () => superadminApi.listModerationCases(),
  });

  const { data: stats } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: () => superadminApi.getModerationStats(),
  });

  const updateCase = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      superadminApi.updateModerationCase(id, { status, reviewer_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-cases"] });
      qc.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
    onError: () => {
      toast("Failed to update case");
    },
  });

  // pending = cases that need a decision
  const pendingCases = cases.filter((c) => c.status === "pending" || c.status === "under_review");
  // decided = all non-pending cases for the recent decisions table
  const decidedCases = cases.filter((c) => c.status !== "pending" && c.status !== "under_review");

  const pendingCount = stats?.pending_count ?? pendingCases.length;
  const decidedCount = stats?.decided_count ?? decidedCases.length;
  const approvalRate = stats?.approval_rate != null ? `${Math.round(stats.approval_rate)}%` : "--";
  const avgResolution =
    stats?.avg_resolution_hours != null ? `${stats.avg_resolution_hours.toFixed(1)}h` : "--";

  return (
    <AdminLayout crumbs={["Trust", "Moderation"]}>
      {toastEl}
      <PH
        title="Content moderation"
        sub="Review flagged events, apply policies, audit decisions."
        actions={
          <>
            <button className="btn-sm" onClick={() => navigate("/compliance")}>
              <MS n="policy" size={13} />
              Policy library
            </button>
            <button className="btn-sm" onClick={() => navigate("/audit-log")}>
              <MS n="download" size={13} />
              Audit log
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI
          icon="flag"
          color="crl"
          label="Pending review"
          value={String(pendingCount)}
          trend={pendingCount > 0 ? `${pendingCount} need action` : "all clear"}
          trendKind={pendingCount > 0 ? "warn" : "steady"}
        />
        <KPI icon="gavel" color="lav" label="Decided (all time)" value={String(decidedCount)} />
        <KPI icon="thumb_up" color="mnt" label="Approval rate" value={approvalRate} />
        <KPI icon="schedule" color="pch" label="Avg time to decision" value={avgResolution} />
      </div>

      {casesLoading ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--on-mut)",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Loading moderation cases...
        </div>
      ) : (
        <div className="chart-grid-21">
          <div>
            {pendingCases.length === 0 ? (
              <div className="panel">
                <div className="panel-body" style={{ padding: "40px 20px", textAlign: "center" }}>
                  <MS
                    n="check_circle"
                    size={36}
                    style={{ color: "var(--success)", display: "block", margin: "0 auto 12px" }}
                  />
                  <p
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 6,
                    }}
                  >
                    No flagged content
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--on-mut)",
                      fontFamily: "Manrope, sans-serif",
                    }}
                  >
                    There are no pending moderation cases right now.
                  </p>
                </div>
              </div>
            ) : (
              pendingCases.map((c) => {
                const sev = sevFromCase(c);
                return (
                  <div key={c.id} className="mod-c">
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Space Grotesk",
                            fontWeight: 600,
                            fontSize: 16,
                            letterSpacing: "-0.025em",
                          }}
                        >
                          {c.content_title}
                        </span>
                        <span className={`pill ${sev}`}>
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </span>
                        <span className="pill draft">{c.content_type}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--on-var)", marginBottom: 10 }}>
                        {c.organization_id ? `Org: ${c.organization_id.slice(0, 8)}` : "No org"} ·
                        Case {c.id.slice(0, 8)} · {new Date(c.created_at).toLocaleDateString()}
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          background: "var(--low)",
                          borderRadius: 8,
                          fontSize: 12.5,
                          color: "var(--on-var)",
                          marginBottom: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {c.reason}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: "1px solid var(--outline)",
                        }}
                      >
                        <button
                          className="btn-sm primary"
                          disabled={updateCase.isPending}
                          onClick={() => {
                            updateCase.mutate({ id: c.id, status: "under_review" });
                            toast("Review opened");
                          }}
                        >
                          <MS n="rate_review" size={13} />
                          Open case
                        </button>
                        <button
                          className="btn-sm"
                          disabled={updateCase.isPending}
                          onClick={() => {
                            updateCase.mutate({ id: c.id, status: "dismissed" });
                            toast("Dismissed");
                          }}
                        >
                          Dismiss
                        </button>
                        <button
                          className="btn-sm"
                          disabled={updateCase.isPending}
                          onClick={() => {
                            updateCase.mutate({ id: c.id, status: "warned" });
                            toast("Warning sent");
                          }}
                        >
                          <MS n="warning" size={13} />
                          Warn
                        </button>
                        <button
                          className="btn-sm danger"
                          disabled={updateCase.isPending}
                          onClick={() => {
                            updateCase.mutate({ id: c.id, status: "taken_down" });
                            toast("Event taken down");
                          }}
                        >
                          Take down
                        </button>
                      </div>
                    </div>

                    <div style={{ borderLeft: "1px solid var(--outline)", paddingLeft: 18 }}>
                      <div className="vq-section-l">AI triage</div>
                      {aiTriage.map((ai, ci) => (
                        <div
                          key={ci}
                          style={{
                            padding: "6px 0",
                            borderBottom: ci < 3 ? "1px solid var(--outline)" : undefined,
                            fontSize: 11.5,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 3,
                            }}
                          >
                            <span style={{ color: "var(--on-var)" }}>{ai[0]}</span>
                            <span
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 700,
                                color:
                                  ai[2] === "high"
                                    ? "#b32a1f"
                                    : ai[2] === "med"
                                      ? "#92400e"
                                      : "#166534",
                              }}
                            >
                              {ai[1]}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 4,
                              background: "var(--mid)",
                              borderRadius: 999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                background:
                                  ai[2] === "high"
                                    ? "#e83151"
                                    : ai[2] === "med"
                                      ? "#dba13d"
                                      : "#16a34a",
                                width: `${parseFloat(ai[1]) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* policy decision tree - static rules reference */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Policy decision tree</span>
            </div>
            <div className="panel-body" style={{ padding: 14 }}>
              <div className="tree">
                <div className="tree-node q">Content visible to public?</div>
                <div className="tree-branch">
                  <div className="tree-col left">
                    <span className="edge">Yes</span>
                    <div className="tree-node q">3 or more reports?</div>
                    <div className="tree-branch">
                      <div className="tree-col left">
                        <span className="edge">Yes</span>
                        <div className="tree-node q">AI score &gt; 0.6?</div>
                        <div className="tree-branch">
                          <div className="tree-col left">
                            <span className="edge">Yes</span>
                            <div className="tree-node act deny">Take down</div>
                          </div>
                          <div className="tree-col right">
                            <span className="edge">No</span>
                            <div className="tree-node act warn">Manual review</div>
                          </div>
                        </div>
                      </div>
                      <div className="tree-col right">
                        <span className="edge">No</span>
                        <div className="tree-node act warn">Warn org</div>
                      </div>
                    </div>
                  </div>
                  <div className="tree-col right">
                    <span className="edge">No</span>
                    <div className="tree-node act">Allow</div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  background: "var(--low)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  color: "var(--on-var)",
                  marginTop: 14,
                  lineHeight: 1.5,
                }}
              >
                <MS
                  n="info"
                  size={13}
                  style={{ verticalAlign: "middle", marginRight: 6, color: "var(--secondary)" }}
                />
                Auto-actions are reviewed weekly. Manual override available on every node.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* recent decisions table - cases that are not pending */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent decisions</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10.5,
              color: "var(--on-mut)",
            }}
          >
            {decidedCases.length} total
          </span>
        </div>
        <div className="panel-body flush">
          {decidedCases.length === 0 ? (
            <div
              style={{
                padding: "28px 20px",
                textAlign: "center",
                color: "var(--on-mut)",
                fontSize: 13,
                fontFamily: "Manrope, sans-serif",
              }}
            >
              No decisions yet.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Content</th>
                  <th>Type</th>
                  <th>Decision</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {decidedCases.slice(0, 20).map((c) => {
                  const pillClass =
                    c.status === "taken_down"
                      ? "suspended"
                      : c.status === "dismissed"
                        ? "active"
                        : c.status === "warned"
                          ? "pending"
                          : "draft";
                  const label =
                    c.status === "taken_down"
                      ? "Taken down"
                      : c.status.charAt(0).toUpperCase() + c.status.slice(1);
                  return (
                    <tr key={c.id}>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11.5,
                          color: "var(--on-mut)",
                        }}
                      >
                        {c.id.slice(0, 8)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.content_title}</td>
                      <td>{c.content_type}</td>
                      <td>
                        <span className={`pill ${pillClass}`}>{label}</span>
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                        }}
                      >
                        {new Date(c.updated_at).toLocaleDateString()}
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
