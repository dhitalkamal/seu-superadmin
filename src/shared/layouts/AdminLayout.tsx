import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Flag,
  ShieldCheck,
  Activity,
  MessageSquare,
  Megaphone,
  ToggleLeft,
} from "lucide-react";

type NavItem = { to: string; label: string; Icon: React.FC<{ size?: number }> };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/organisations", label: "Organisations", Icon: Building2 },
  { to: "/users", label: "Users", Icon: Users },
  { to: "/billing", label: "Billing", Icon: CreditCard },
  { to: "/moderation", label: "Moderation", Icon: Flag },
  { to: "/compliance", label: "Compliance", Icon: ShieldCheck },
  { to: "/health", label: "Service Health", Icon: Activity },
  { to: "/support", label: "Support", Icon: MessageSquare },
  { to: "/announcements", label: "Announcements", Icon: Megaphone },
  { to: "/feature-flags", label: "Feature Flags", Icon: ToggleLeft },
];

/** Sidebar + main content shell for all superadmin pages. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col py-6 px-3 gap-1 shrink-0">
        <div className="px-3 mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Superadmin</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">Sansaar Platform</p>
        </div>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
