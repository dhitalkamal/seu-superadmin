import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";
import type { OrgDocument, OrgMember } from "@/shared/api/superadmin.api";

/** Dedicated org verification page  - full details + approve/reject with reason. */
export default function OrgVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, toastEl } = useToast();
  const [reason, setReason] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: ["org", id],
    queryFn: () => superadminApi.getOrg(id!),
    enabled: !!id,
  });

  const { data: orgDocs = [] } = useQuery({
    queryKey: ["org-docs", id],
    queryFn: () => superadminApi.listOrgDocuments(id!),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", id],
    queryFn: () => superadminApi.listOrgMembers(id!),
    enabled: !!id && !!org,
  });

  const approve = useMutation({
    mutationFn: () => superadminApi.approveOrg(id!, reason.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["org", id] });
      toast("Organization approved  - dashboard access granted");
      navigate("/verification-queue");
    },
  });

  const reject = useMutation({
    mutationFn: () => superadminApi.rejectOrg(id!, reason.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["org", id] });
      toast("Organization rejected");
      navigate("/verification-queue");
    },
  });

  const suspend = useMutation({
    mutationFn: () => superadminApi.suspendOrg(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["org", id] });
      toast("Organization suspended");
    },
  });

  const reinstate = useMutation({
    mutationFn: () => superadminApi.reinstateOrg(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      qc.invalidateQueries({ queryKey: ["org", id] });
      toast("Organization reinstated");
    },
  });

  if (isLoading || !org) {
    return (
      <AdminLayout crumbs={["Platform", "Verification Queue", "Loading..."]}>
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--on-mut)",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          {isLoading ? "Loading organization..." : "Organization not found."}
        </div>
      </AdminLayout>
    );
  }

  const isPending = org.status === "pending_review";
  const isActive = org.status === "active" || org.status === "approved";
  const isSuspended = org.status === "suspended";
  const mark = org.name?.[0]?.toUpperCase() ?? "O";

  const statusColor = isPending ? "#f59e0b" : isActive ? "#22c55e" : "#ef4444";
  const statusLabel = org.status.replace("_", " ");

  const fieldStyle: React.CSSProperties = {
    padding: "10px 14px",
    background: "var(--low)",
    borderRadius: 8,
    fontSize: 13,
    color: "var(--on-bg)",
    fontFamily: "Manrope, sans-serif",
    wordBreak: "break-all",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--on-mut)",
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 4,
  };

  return (
    <AdminLayout crumbs={["Platform", "Verification Queue", org.name]}>
      {toastEl}
      <PH
        title={`Review: ${org.name}`}
        sub={`Submitted ${new Date(org.created_at).toLocaleDateString()}  - Status: ${statusLabel}`}
        actions={
          <button className="btn-sm" onClick={() => navigate(-1)}>
            <MS n="arrow_back" size={13} />
            Back
          </button>
        }
      />

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}
      >
        {/* left  - org details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* header card */}
          <div className="panel">
            <div className="panel-body" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #5a4ba3, #a08ae8)",
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  {mark}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h2
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 20,
                        color: "var(--on-bg)",
                        margin: 0,
                      }}
                    >
                      {org.name}
                    </h2>
                    <span
                      className={`pill ${isPending ? "pending" : isActive ? "active" : "suspended"}`}
                      style={{ fontSize: 10 }}
                    >
                      {statusLabel}
                    </span>
                    {org.is_verified && (
                      <span className="pill active" style={{ fontSize: 9 }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--on-mut)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    @{org.slug}
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={labelStyle}>Contact Email</p>
                  <div style={fieldStyle}>{org.contact_email}</div>
                </div>
                <div>
                  <p style={labelStyle}>Phone</p>
                  <div style={fieldStyle}>{org.phone || "-"}</div>
                </div>
                <div>
                  <p style={labelStyle}>Website</p>
                  <div style={fieldStyle}>{org.website || "-"}</div>
                </div>
                <div>
                  <p style={labelStyle}>Organization Type</p>
                  <div style={fieldStyle}>
                    {(org.org_type || "company")
                      .replace("_", " ")
                      .replace(/^\w/, (c: string) => c.toUpperCase())}
                  </div>
                </div>
                <div>
                  <p style={labelStyle}>Plan</p>
                  <div style={fieldStyle}>
                    {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                  </div>
                </div>
                <div>
                  <p style={labelStyle}>Created</p>
                  <div style={fieldStyle}>{new Date(org.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* system info */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">System Information</span>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={labelStyle}>Organization ID</p>
                  <div
                    style={{
                      ...fieldStyle,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11.5,
                    }}
                  >
                    {org.id}
                  </div>
                </div>
                <div>
                  <p style={labelStyle}>Created By (User ID)</p>
                  <div
                    style={{
                      ...fieldStyle,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11.5,
                    }}
                  >
                    {org.created_by}
                  </div>
                </div>
                <div>
                  <p style={labelStyle}>Updated At</p>
                  <div style={fieldStyle}>{new Date(org.updated_at).toLocaleString()}</div>
                </div>
                <div>
                  <p style={labelStyle}>Plan Expires</p>
                  <div style={fieldStyle}>
                    {org.plan_expires_at
                      ? new Date(org.plan_expires_at).toLocaleString()
                      : "Never (free)"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* address & location */}
          {(org.address || org.city || org.country) && (
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Address & Location</span>
              </div>
              <div className="panel-body" style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: org.address ? "1 / -1" : undefined }}>
                    <p style={labelStyle}>Address</p>
                    <div style={fieldStyle}>{org.address || "-"}</div>
                  </div>
                  <div>
                    <p style={labelStyle}>City</p>
                    <div style={fieldStyle}>{org.city || "-"}</div>
                  </div>
                  <div>
                    <p style={labelStyle}>Country</p>
                    <div style={fieldStyle}>{org.country || "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* social links */}
          {(org.facebook_url || org.twitter_url || org.instagram_url || org.linkedin_url) && (
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Social Links</span>
              </div>
              <div className="panel-body" style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {org.facebook_url && (
                    <div>
                      <p style={labelStyle}>Facebook</p>
                      <div style={fieldStyle}>
                        <a
                          href={org.facebook_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                        >
                          {org.facebook_url}
                        </a>
                      </div>
                    </div>
                  )}
                  {org.twitter_url && (
                    <div>
                      <p style={labelStyle}>Twitter / X</p>
                      <div style={fieldStyle}>
                        <a
                          href={org.twitter_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                        >
                          {org.twitter_url}
                        </a>
                      </div>
                    </div>
                  )}
                  {org.instagram_url && (
                    <div>
                      <p style={labelStyle}>Instagram</p>
                      <div style={fieldStyle}>
                        <a
                          href={org.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                        >
                          {org.instagram_url}
                        </a>
                      </div>
                    </div>
                  )}
                  {org.linkedin_url && (
                    <div>
                      <p style={labelStyle}>LinkedIn</p>
                      <div style={fieldStyle}>
                        <a
                          href={org.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                        >
                          {org.linkedin_url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* uploaded documents */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Documents ({orgDocs.length})</span>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              {orgDocs.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--on-mut)",
                    fontFamily: "Manrope, sans-serif",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  No documents uploaded
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {orgDocs.map((doc: OrgDocument) => (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "var(--low)",
                        borderRadius: 8,
                      }}
                    >
                      <MS n="description" size={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--on-bg)",
                            fontFamily: "Manrope, sans-serif",
                          }}
                        >
                          {doc.file_name}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--on-mut)",
                            fontFamily: "'JetBrains Mono', monospace",
                            marginTop: 2,
                          }}
                        >
                          {doc.doc_type
                            .replace("_", " ")
                            .replace(/^\w/, (c: string) => c.toUpperCase())}{" "}
                          · {doc.file_size > 0 ? `${(doc.file_size / 1024).toFixed(1)} KB` : "-"}·{" "}
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: "1px solid var(--mid)",
                          background: "transparent",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--primary)",
                          fontFamily: "Manrope, sans-serif",
                          textDecoration: "none",
                        }}
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* team members */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">
                Team members{" "}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 10,
                    background: "var(--mid)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--on-bg)",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginLeft: 6,
                  }}
                >
                  {members.length}
                </span>
              </span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {members.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--on-mut)",
                    fontFamily: "Manrope, sans-serif",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  No members found
                </p>
              ) : (
                <table className="tbl" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: OrgMember) => (
                      <tr key={m.id}>
                        <td
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                          }}
                        >
                          {m.user_id.slice(0, 8)}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "Manrope, sans-serif",
                              color: "#fff",
                              background:
                                m.role === "owner"
                                  ? "navy"
                                  : m.role === "admin"
                                    ? "crimson"
                                    : m.role === "manager"
                                      ? "gold"
                                      : "gray",
                              ...(m.role === "manager" ? { color: "#000" } : {}),
                            }}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: m.is_active ? "#22c55e" : "#ef4444",
                              fontFamily: "Manrope, sans-serif",
                            }}
                          >
                            {m.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: 12,
                            fontFamily: "Manrope, sans-serif",
                            color: "var(--on-mut)",
                          }}
                        >
                          {new Date(m.joined_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* verification checklist */}
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Verification Checklist</span>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              {[
                { label: "Contact email provided", ok: !!org.contact_email },
                { label: "Phone number provided", ok: !!org.phone },
                { label: "Website provided", ok: !!org.website },
                { label: "Organization name valid", ok: org.name.length >= 2 },
                { label: "Slug is unique", ok: !!org.slug },
                { label: "Address provided", ok: !!(org.city && org.country) },
                { label: "Documents uploaded", ok: orgDocs.length > 0 },
                {
                  label: "Registration certificate",
                  ok: orgDocs.some((d: OrgDocument) => d.doc_type === "registration_cert"),
                },
                { label: "Email verified status", ok: org.is_verified },
              ].map((check, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--outline)" : "none",
                  }}
                >
                  <MS
                    n={check.ok ? "check_circle" : "info"}
                    size={16}
                    style={{ color: check.ok ? "#22c55e" : "#f59e0b", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontFamily: "Manrope, sans-serif",
                      color: "var(--on-bg)",
                    }}
                  >
                    {check.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: check.ok ? "#16a34a" : "#b45309",
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {check.ok ? "Pass" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right  - actions panel */}
        <div style={{ position: "sticky", top: 20 }}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Actions</span>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              {/* status indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: `${statusColor}10`,
                  border: `1px solid ${statusColor}30`,
                  borderRadius: 10,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: statusColor,
                    fontFamily: "Manrope, sans-serif",
                    textTransform: "capitalize",
                  }}
                >
                  {statusLabel}
                </span>
              </div>

              {/* reason field */}
              <div style={{ marginBottom: 16 }}>
                <p style={labelStyle}>Admin Notes / Reason</p>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional reason for approval or rejection..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--mid)",
                    background: "var(--low)",
                    color: "var(--on-bg)",
                    fontSize: 13,
                    fontFamily: "Manrope, sans-serif",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* action buttons based on current status */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isPending && (
                  <>
                    <button
                      className="btn-sm primary"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate()}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: 13,
                        justifyContent: "center",
                      }}
                    >
                      <MS n="verified" size={15} />
                      {approve.isPending ? "Approving..." : "Approve Organization"}
                    </button>
                    <button
                      className="btn-sm danger"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate()}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: 13,
                        justifyContent: "center",
                      }}
                    >
                      <MS n="cancel" size={15} />
                      {reject.isPending ? "Rejecting..." : "Reject Organization"}
                    </button>
                  </>
                )}
                {isActive && (
                  <button
                    className="btn-sm danger"
                    disabled={suspend.isPending}
                    onClick={() => suspend.mutate()}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 13,
                      justifyContent: "center",
                    }}
                  >
                    <MS n="block" size={15} />
                    {suspend.isPending ? "Suspending..." : "Suspend Organization"}
                  </button>
                )}
                {isSuspended && (
                  <button
                    className="btn-sm primary"
                    disabled={reinstate.isPending}
                    onClick={() => reinstate.mutate()}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 13,
                      justifyContent: "center",
                    }}
                  >
                    <MS n="refresh" size={15} />
                    {reinstate.isPending ? "Reinstating..." : "Reinstate Organization"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
