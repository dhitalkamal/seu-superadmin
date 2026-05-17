import AdminLayout from "@/shared/layouts/AdminLayout";

/** Platform-wide announcements management. */
export default function AnnouncementsPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Announcements</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-sm text-gray-400 mb-4">Publish platform-wide announcements to all users. Announcements will appear in the notification feed.</p>
        <button disabled className="bg-gray-900 text-white text-sm font-bold rounded-xl px-5 py-2.5 opacity-50 cursor-not-allowed">New announcement (coming soon)</button>
      </div>
    </AdminLayout>
  );
}
