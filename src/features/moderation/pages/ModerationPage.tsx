import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";

const flagged = [
  {
    ev: "Crypto Masterclass",
    o: "Praxis Studio",
    rs: "Misleading financial claims · 4 reports",
    d: "1 day",
    sev: "High",
    cat: "Financial",
    reports: [
      { r: "Misleading claims", c: 4 },
      { r: "Unauthorised", c: 1 },
    ],
  },
  {
    ev: "Members-Only Auction",
    o: "Hexford Trust",
    rs: "Pricing exceeds platform guidelines · 2 reports",
    d: "3 days",
    sev: "Med",
    cat: "Pricing",
    reports: [
      { r: "Pricing", c: 2 },
      { r: "TOS", c: 1 },
    ],
  },
  {
    ev: "Political Fundraiser",
    o: "Wexler & Co.",
    rs: "May violate neutrality policy · 1 report",
    d: "5 days",
    sev: "Low",
    cat: "Policy",
    reports: [{ r: "Neutrality", c: 1 }],
  },
];

const aiTriage = [
  ["Toxicity", "0.04", "low"],
  ["Misleading", "0.72", "high"],
  ["Off-policy", "0.51", "med"],
  ["Spam", "0.08", "low"],
];

/** Content moderation - v8 faithful port with AI triage, decision tree, and decisions table. */
export default function ModerationPage() {
  const { toast, toastEl } = useToast();

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Trust", "Moderation"]}
        title="Content moderation"
        sub="Review flagged events, apply policies, audit decisions."
        actions={
          <>
            <button className="btn-sm">
              <MS n="policy" size={13} />
              Policy library
            </button>
            <button className="btn-sm">
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
          value="3"
          trend="2 due today"
          trendKind="warn"
        />
        <KPI icon="gavel" color="lav" label="Decided (30d)" value="18" trend="+4" />
        <KPI icon="thumb_up" color="mnt" label="Approval rate" value="89%" trend="+3 pp" />
        <KPI icon="schedule" color="pch" label="Avg time to decision" value="4.2h" trend="-1.8h" />
      </div>

      <div className="chart-grid-21">
        <div>
          {flagged.map((f, i) => (
            <div key={i} className="mod-c">
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
                    {f.ev}
                  </span>
                  <span className={`pill ${f.sev.toLowerCase()}`}>{f.sev}</span>
                  <span className="pill draft">{f.cat}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--on-var)", marginBottom: 10 }}>
                  {f.o} · Reported {f.d} · Case CASE-2026-{148 + i}
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
                  {f.rs}
                </div>
                <div className="mod-reasons">
                  {f.reports.map((r, ri) => (
                    <div key={ri} className="mod-r">
                      <span>{r.r}</span>
                      <span className="mod-r-c">x{r.c}</span>
                    </div>
                  ))}
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
                  <button className="btn-sm primary" onClick={() => toast("Review opened")}>
                    <MS n="rate_review" size={13} />
                    Open case
                  </button>
                  <button className="btn-sm" onClick={() => toast("Dismissed")}>
                    Dismiss
                  </button>
                  <button className="btn-sm" onClick={() => toast("Warning sent")}>
                    <MS n="warning" size={13} />
                    Warn
                  </button>
                  <button className="btn-sm danger" onClick={() => toast("Event taken down")}>
                    Take down
                  </button>
                </div>
              </div>

              <div style={{ borderLeft: "1px solid var(--outline)", paddingLeft: 18 }}>
                <div className="vq-section-l">AI triage</div>
                {aiTriage.map((c, ci) => (
                  <div
                    key={ci}
                    style={{
                      padding: "6px 0",
                      borderBottom: ci < 3 ? "1px solid var(--outline)" : undefined,
                      fontSize: 11.5,
                    }}
                  >
                    <div
                      style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                    >
                      <span style={{ color: "var(--on-var)" }}>{c[0]}</span>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                          color:
                            c[2] === "high" ? "#b32a1f" : c[2] === "med" ? "#92400e" : "#166534",
                        }}
                      >
                        {c[1]}
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
                            c[2] === "high" ? "#e83151" : c[2] === "med" ? "#dba13d" : "#16a34a",
                          width: `${parseFloat(c[1]) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* policy decision tree */}
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

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent decisions</span>
        </div>
        <div className="panel-body flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>Case</th>
                <th>Event</th>
                <th>Org</th>
                <th>Decision</th>
                <th>Reviewer</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  c: "CASE-147",
                  e: "Crypto Pre-Sale Workshop",
                  o: "Praxis Studio",
                  d: "Taken down",
                  u: "M. Chen",
                  t: "2h ago",
                  col: "suspended",
                },
                {
                  c: "CASE-146",
                  e: "Networking After-Hours",
                  o: "Hexford Trust",
                  d: "Approved",
                  u: "M. Chen",
                  t: "5h ago",
                  col: "active",
                },
                {
                  c: "CASE-145",
                  e: "Industry Roundtable",
                  o: "Northfield Council",
                  d: "Warned",
                  u: "R. Patel",
                  t: "Yesterday",
                  col: "pending",
                },
                {
                  c: "CASE-144",
                  e: "Charity Raffle Night",
                  o: "Albright Institute",
                  d: "Approved",
                  u: "M. Chen",
                  t: "2d ago",
                  col: "active",
                },
              ].map((d, i) => (
                <tr key={i}>
                  <td
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11.5,
                      color: "var(--on-mut)",
                    }}
                  >
                    {d.c}
                  </td>
                  <td style={{ fontWeight: 700 }}>{d.e}</td>
                  <td>{d.o}</td>
                  <td>
                    <span className={`pill ${d.col}`}>{d.d}</span>
                  </td>
                  <td>{d.u}</td>
                  <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{d.t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
