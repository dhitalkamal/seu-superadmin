import AdminLayout from "@/shared/layouts/AdminLayout";

/** Flagged events moderation queue. */
export default function ModerationPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Moderation</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-4xl mb-4">🚩</p>
        <h2 className="text-base font-bold text-gray-700 mb-2">Flagged Events Queue</h2>
        <p className="text-sm text-gray-400">No flagged events. Event reports will appear here when users flag inappropriate content.</p>
      </div>
    </AdminLayout>
  );
}
