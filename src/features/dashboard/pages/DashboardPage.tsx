import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import superadminApi from "@/shared/api/superadmin.api";

const SERVICES = ["iam", "event", "participation", "payment", "notification", "management", "intelligence"];

/** KPI stat card. */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Service health status badge. */
function HealthBadge({ service }: { service: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health", service],
    queryFn: () => superadminApi.fetchHealth(service),
    retry: false,
  });

  const color = isLoading ? "bg-gray-100 text-gray-400" : isError || data?.status === "unhealthy"
    ? "bg-red-100 text-red-600"
    : "bg-green-100 text-green-700";

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700 capitalize">{service}-service</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
        {isLoading ? "checking..." : isError ? "unreachable" : data?.status}
      </span>
    </div>
  );
}

/** Superadmin dashboard with KPI overview and service health. */
export default function DashboardPage() {
  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: superadminApi.listOrgs });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });

  const pending = orgs.filter((o) => o.status === "pending_review").length;
  const active = orgs.filter((o) => o.status === "active").length;
  const suspended = orgs.filter((o) => o.status === "suspended").length;
  const activeUsers = users.filter((u) => u.is_active).length;

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total organisations" value={orgs.length} />
        <StatCard label="Pending approval" value={pending} sub="Need review" />
        <StatCard label="Active orgs" value={active} />
        <StatCard label="Total users" value={users.length} sub={`${activeUsers} active`} />
      </div>

      {/* org status breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{pending}</p>
          <p className="text-xs font-medium text-yellow-600 mt-1">Pending review</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{active}</p>
          <p className="text-xs font-medium text-green-600 mt-1">Active</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{suspended}</p>
          <p className="text-xs font-medium text-red-600 mt-1">Suspended</p>
        </div>
      </div>

      {/* service health */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Service health</h2>
        <div className="flex flex-col gap-2">
          {SERVICES.map((s) => (<HealthBadge key={s} service={s} />))}
        </div>
      </div>
    </AdminLayout>
  );
}
