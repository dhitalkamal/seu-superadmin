import AdminLayout from "@/shared/layouts/AdminLayout";

const FLAGS = [
  { key: "registration_open", label: "Registration open", enabled: true },
  { key: "paid_events", label: "Paid events", enabled: true },
  { key: "mfa_required", label: "Require MFA for all users", enabled: false },
  { key: "volunteer_module", label: "Volunteer module", enabled: true },
  { key: "analytics_dashboard", label: "Analytics dashboard", enabled: false },
];

/** Feature flags management page. */
export default function FeatureFlagsPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Feature Flags</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Flag", "Key", "Status"].map((h) => (
                <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-500 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FLAGS.map((flag) => (
              <tr key={flag.key} className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-800">{flag.label}</td>
                <td className="py-3 px-4 text-xs font-mono text-gray-400">{flag.key}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${flag.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-4">Dynamic feature flag toggling via API will be implemented in a future release.</p>
    </AdminLayout>
  );
}
