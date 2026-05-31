import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, MS, useToast } from "@/shared/components/v8";
import superadminApi, { type User } from "@/shared/api/superadmin.api";
import { usePagination } from "@/shared/lib/usePagination";
import { exportCSV, exportPDF } from "@/shared/lib/export";
import Pagination from "@/shared/components/Pagination";
import DateRangeFilter, { getRangeCutoff, type Range } from "@/shared/components/DateRangeFilter";

function UserRow({ user, onAction }: { user: User; onAction: (a: string, id: string) => void }) {
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "U";
  return (
    <tr>
      <td>
        <div className="ev-cell">
          <div
            className="av-sm"
            style={{
              background: "linear-gradient(135deg,#050a26,#121d3f)",
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div>
            <div className="ev-name">
              {user.first_name} {user.last_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--on-mut)" }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {user.is_superuser && (
            <span className="pill crl" style={{ fontSize: 9 }}>
              Superuser
            </span>
          )}
          {user.is_staff && (
            <span className="pill scheduled" style={{ fontSize: 9 }}>
              Staff
            </span>
          )}
          {!user.is_staff && !user.is_superuser && (
            <span className="pill draft" style={{ fontSize: 9 }}>
              User
            </span>
          )}
        </div>
      </td>
      <td>
        <div style={{ display: "flex", gap: 4 }}>
          <span className={`pill ${user.is_active ? "active" : "suspended"}`}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
          {user.is_email_verified && (
            <span className="pill active" style={{ fontSize: 9 }}>
              Verified
            </span>
          )}
        </div>
      </td>
      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
        {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
      </td>
      <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
        {new Date(user.date_joined).toLocaleDateString()}
      </td>
      <td>
        {user.is_active ? (
          <button
            className="btn-sm danger"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onAction("suspend", user.id)}
          >
            Suspend
          </button>
        ) : (
          <button
            className="btn-sm"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => onAction("activate", user.id)}
          >
            Activate
          </button>
        )}
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast, toastEl } = useToast();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: superadminApi.listUsers,
  });

  const suspend = useMutation({
    mutationFn: superadminApi.suspendUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("User suspended");
    },
    onError: () => toast("Failed to update user"),
  });
  const activate = useMutation({
    mutationFn: superadminApi.activateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast("User activated");
    },
    onError: () => toast("Failed to update user"),
  });

  function handleAction(action: string, id: string) {
    if (action === "suspend") suspend.mutate(id);
    else if (action === "activate") activate.mutate(id);
  }

  // exclude superusers (platform admins) from the regular user list and counts
  const regularUsers = users.filter((u) => !u.is_superuser);

  // date range filter applied before search
  const cutoff = getRangeCutoff(range);
  const dateFiltered = cutoff
    ? regularUsers.filter((u) => new Date(u.date_joined) >= cutoff)
    : regularUsers;

  // search filter on date-filtered list
  const filtered = dateFiltered.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // paginate the final filtered list
  const { page, totalPages, paged, from, to, total, setPage, next, prev } = usePagination(
    filtered,
    20
  );

  const activeCount = regularUsers.filter((u) => u.is_active).length;
  const verifiedCount = regularUsers.filter((u) => u.is_email_verified).length;

  /** Format user rows for export (name, email, status, verified, joined). */
  function buildExportRows(data: User[]): string[][] {
    return data.map((u) => [
      `${u.first_name} ${u.last_name}`.trim(),
      u.email,
      u.is_active ? "Active" : "Inactive",
      u.is_email_verified ? "Yes" : "No",
      new Date(u.date_joined).toLocaleDateString(),
    ]);
  }

  const exportHeaders = ["Name", "Email", "Status", "Verified", "Joined"];

  return (
    <AdminLayout crumbs={["Platform", "Users"]}>
      {toastEl}
      <PH
        title="Platform users"
        sub="Search and manage users across all organizations."
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DateRangeFilter value={range} onChange={setRange} />
            <button
              className="btn-sm"
              onClick={() => exportCSV(exportHeaders, buildExportRows(filtered), "users")}
            >
              <MS n="download" size={13} />
              Export CSV
            </button>
            <button
              className="btn-sm"
              onClick={() =>
                exportPDF("Platform Users", exportHeaders, buildExportRows(filtered), "users")
              }
            >
              <MS n="picture_as_pdf" size={13} />
              Export PDF
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          ["Total", regularUsers.length],
          ["Active", activeCount],
          ["Verified", verifiedCount],
          ["Staff", regularUsers.filter((u) => u.is_staff).length],
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
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface)",
            border: "1px solid var(--outline)",
            borderRadius: 10,
            padding: "7px 12px",
          }}
        >
          <MS n="search" size={16} style={{ color: "var(--on-mut)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "Manrope, sans-serif",
              fontSize: 13,
              width: 220,
            }}
          />
        </div>
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
          Loading users...
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => (
                  <UserRow key={u.id} user={u} onAction={handleAction} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--on-mut)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                {search ? `No users matching "${search}"` : "No users yet."}
              </div>
            )}
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
