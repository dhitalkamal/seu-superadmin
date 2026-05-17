import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import superadminApi from "@/shared/api/superadmin.api";
import type { Org, OrgStatus } from "@/shared/api/superadmin.api";

const STATUS_STYLE: Record<OrgStatus, string> = {
  pending_review: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-600",
};

/** Org table row with approve/reject/suspend/reinstate actions. */
function OrgRow({ org, onAction }: { org: Org; onAction: (action: string, id: string) => void }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <p className="text-sm font-semibold text-gray-900">{org.name}</p>
        <p className="text-xs text-gray-400">@{org.slug}</p>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">{org.contact_email}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[org.status]}`}>
          {org.status.replace("_", " ")}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">{new Date(org.created_at).toLocaleDateString()}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {org.status === "pending_review" && (
            <>
              <button onClick={() => onAction("approve", org.id)} className="text-xs font-semibold text-green-700 hover:underline">Approve</button>
              <button onClick={() => onAction("reject", org.id)} className="text-xs font-semibold text-red-600 hover:underline">Reject</button>
            </>
          )}
          {org.status === "active" && (
            <button onClick={() => onAction("suspend", org.id)} className="text-xs font-semibold text-red-600 hover:underline">Suspend</button>
          )}
          {org.status === "suspended" && (
            <button onClick={() => onAction("reinstate", org.id)} className="text-xs font-semibold text-green-700 hover:underline">Reinstate</button>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Superadmin organisations management page. */
export default function OrgsPage() {
  const queryClient = useQueryClient();
  const { data: orgs = [], isLoading } = useQuery({ queryKey: ["orgs"], queryFn: superadminApi.listOrgs });

  const mutate = (fn: (id: string) => Promise<Org>) =>
    useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orgs"] }) });

  const approve = mutate(superadminApi.approveOrg);
  const reject = mutate(superadminApi.rejectOrg);
  const suspend = mutate(superadminApi.suspendOrg);
  const reinstate = mutate(superadminApi.reinstateOrg);

  const handleAction = (action: string, id: string) => {
    if (action === "approve") approve.mutate(id);
    else if (action === "reject" && confirm("Reject this organisation?")) reject.mutate(id);
    else if (action === "suspend" && confirm("Suspend this organisation?")) suspend.mutate(id);
    else if (action === "reinstate") reinstate.mutate(id);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Organisations</h1>
        <span className="text-sm text-gray-400">{orgs.length} total</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Organisation", "Email", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (<OrgRow key={org.id} org={org} onAction={handleAction} />))}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">No organisations yet.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
