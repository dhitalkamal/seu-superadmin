import AdminLayout from "@/shared/layouts/AdminLayout";

/** Support ticket management page. */
export default function SupportPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Support</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-4xl mb-4">🎧</p>
        <h2 className="text-base font-bold text-gray-700 mb-2">Support Tickets</h2>
        <p className="text-sm text-gray-400">No open tickets. Support requests submitted by organisations and users will appear here.</p>
      </div>
    </AdminLayout>
  );
}
