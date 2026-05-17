import AdminLayout from "@/shared/layouts/AdminLayout";

/** Compliance and GDPR requests page. */
export default function CompliancePage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Compliance</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Data Erasure Requests</h2>
          <p className="text-sm text-gray-400">No pending erasure requests. GDPR deletion requests submitted by users via <code className="text-xs bg-gray-100 px-1 rounded">POST /gdpr/erasure/</code> will appear here.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Data Export Requests</h2>
          <p className="text-sm text-gray-400">No pending export requests. User data portability requests will appear here.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
