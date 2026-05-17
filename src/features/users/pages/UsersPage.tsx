import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import superadminApi from "@/shared/api/superadmin.api";
import type { User } from "@/shared/api/superadmin.api";

/** Single user table row. */
function UserRow({ user }: { user: User }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.is_email_verified ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
          {user.is_email_verified ? "Verified" : "Unverified"}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">{new Date(user.date_joined).toLocaleDateString()}</td>
      <td className="py-3 px-4">
        {user.is_staff && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Staff</span>}
      </td>
    </tr>
  );
}

/** Superadmin users list page. */
export default function UsersPage() {
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });
  const active = users.filter((u) => u.is_active).length;
  const verified = users.filter((u) => u.is_email_verified).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{users.length} total · {active} active · {verified} verified</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["User", "Status", "Email verified", "Joined", "Role"].map((h) => (
                  <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (<UserRow key={user.id} user={user} />))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">No users yet.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
