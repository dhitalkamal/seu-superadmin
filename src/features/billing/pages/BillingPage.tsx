import AdminLayout from "@/shared/layouts/AdminLayout";

const PLANS = [
  { name: "Free", price: "NPR 0/mo", features: ["Up to 100 registrations/event", "5% platform fee", "Basic analytics"], orgs: 0 },
  { name: "Starter", price: "NPR 999/mo", features: ["Up to 1,000 registrations/event", "3% platform fee", "Advanced analytics", "Priority support"], orgs: 0 },
  { name: "Pro", price: "NPR 4,999/mo", features: ["Unlimited registrations", "1% platform fee", "Full analytics suite", "Dedicated support", "Custom domain"], orgs: 0 },
];

/** Subscription plans overview for the superadmin. */
export default function BillingPage() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscriptions</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.name} className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">{plan.name}</h2>
            <p className="text-2xl font-bold text-gray-700 mb-4">{plan.price}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mt-4">{plan.orgs} organisations on this plan</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-6">Organisation billing management will be integrated with Khalti/eSewa. Per-org plan assignment coming soon.</p>
    </AdminLayout>
  );
}
