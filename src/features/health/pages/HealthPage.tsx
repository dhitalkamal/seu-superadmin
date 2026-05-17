import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import superadminApi from "@/shared/api/superadmin.api";

const SERVICES = ["iam", "event", "participation", "payment", "notification", "management", "intelligence"];

/** Service health detail page. */
export default function HealthPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Service Health</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SERVICES.map((s) => <ServiceCard key={s} service={s} />)}
      </div>
    </AdminLayout>
  );
}

function ServiceCard({ service }: { service: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health", service],
    queryFn: () => superadminApi.fetchHealth(service),
    retry: false,
    refetchInterval: 30_000,
  });

  const healthy = !isError && data?.status === "healthy";
  const border = isLoading ? "border-gray-200" : healthy ? "border-green-200" : "border-red-200";
  const bg = isLoading ? "bg-white" : healthy ? "bg-green-50" : "bg-red-50";

  return (
    <div className={`border ${border} ${bg} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900 capitalize">{service}-service</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLoading ? "bg-gray-100 text-gray-400" : healthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {isLoading ? "checking" : isError ? "unreachable" : data?.status}
        </span>
      </div>
      {data?.checks && (
        <div className="space-y-1">
          {Object.entries(data.checks).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs text-gray-500">
              <span className="capitalize">{k}</span>
              <span className={v === "healthy" ? "text-green-600" : "text-red-600"}>{v as string}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
