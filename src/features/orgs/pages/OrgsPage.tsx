import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type Org } from "@/shared/api/superadmin.api";

function OrgRow({
  org,
  onAction,
  onView,
}: {
  org: Org;
  onAction: (action: string, id: string) => void;
  onView: (id: string) => void;
}) {
  const mark = org.name?.[0]?.toUpperCase() ?? "O";
  const bg =
    org.status === "suspended"
      ? "linear-gradient(135deg,#b32a1f,#e83151)"
      : "linear-gradient(135deg,#050a26,#121d3f)";
  return (
    <tr>
      <td>
        <div className="ev-cell">
          <div className="ev-icon" style={{ background: bg, color: "white" }}>
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
              {org.slug}.seu.org
            </div>
          </div>
        </div>
      </td>
      <td>{org.contact_email}</td>
      <td>
        <span
          className={`pill ${org.plan === "free" ? "" : org.plan === "ngo" ? "active" : "scheduled"}`}
        >
          {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
        </span>
      </td>
      <td>
        <span
          className={`pill ${org.status === "active" ? "active" : org.status === "suspended" ? "suspended" : "pending"}`}
        >
          {org.status.replace("_", " ")}
        </span>
        {org.is_verified && (
          <span className="pill active" style={{ marginLeft: 4, fontSize: 9 }}>
            Verified
          </span>
        )}
      </td>
      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
        {new Date(org.created_at).toLocaleDateString()}
      </td>
      <td>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button
            className="btn-sm"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onView(org.id)}
          >
            Review
          </button>
          {org.status === "pending_review" && (
            <>
              <button
                className="btn-sm primary"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => onAction("approve", org.id)}
              >
                Approve
              </button>
              <button
                className="btn-sm danger"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => onAction("reject", org.id)}
              >
                Reject
              </button>
            </>
          )}
          {org.status === "active" && (
            <button
              className="btn-sm danger"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => onAction("suspend", org.id)}
            >
              Suspend
            </button>
          )}
          {org.status === "suspended" && (
            <button
              className="btn-sm"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => onAction("reinstate", org.id)}
            >
              Reinstate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function OrgsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, toastEl } = useToast();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["orgs"],
    queryFn: superadminApi.listOrgs,
  });

  const approve = useMutation({
    mutationFn: superadminApi.approveOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation approved");
    },
  });
  const reject = useMutation({
    mutationFn: superadminApi.rejectOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation rejected");
    },
  });
  const suspend = useMutation({
    mutationFn: superadminApi.suspendOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation suspended");
    },
  });
  const reinstate = useMutation({
    mutationFn: superadminApi.reinstateOrg,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      toast("Organisation reinstated");
    },
  });

  function handleAction(action: string, id: string) {
    if (action === "approve") approve.mutate(id);
    else if (action === "reject") reject.mutate(id);
    else if (action === "suspend") suspend.mutate(id);
    else if (action === "reinstate") reinstate.mutate(id);
  }

  const pending = orgs.filter((o) => o.status === "pending_review");
  const active = orgs.filter((o) => o.status === "active");

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Platform", "Organizations"]}
        title="All organizations"
        sub="Every workspace on the platform - across plans and regions."
        actions={
          <button className="btn-sm">
            <MS n="download" size={13} />
            Export
          </button>
        }
      />

      {pending.length > 0 && (
        <div className="notice">
          <MS n="pending_actions" />
          <div>
            <strong>{pending.length} organisations pending review</strong>
            <span>Review and approve or reject them to grant platform access.</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          ["All", orgs.length],
          ["Active", active.length],
          ["Pending", pending.length],
          ["Suspended", orgs.filter((o) => o.status === "suspended").length],
        ].map(([l, n]) => (
          <div
            key={String(l)}
            style={{
              padding: "10px 16px",
              background: "var(--surface)",
              border: "1px solid var(--outline)",
              borderRadius: 10,
              fontSize: 12.5,
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <span style={{ fontWeight: 700 }}>{n}</span>{" "}
            <span style={{ color: "var(--on-mut)" }}>{l}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--on-mut)",
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Loading organisations...
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <OrgRow
                    key={o.id}
                    org={o}
                    onAction={handleAction}
                    onView={(id) => navigate(`/organisations/${id}/verify`)}
                  />
                ))}
              </tbody>
            </table>
            {orgs.length === 0 && (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--on-mut)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                No organisations yet.
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
