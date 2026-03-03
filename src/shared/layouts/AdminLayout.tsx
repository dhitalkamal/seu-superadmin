import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@/shared/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import superadminApi from "@/shared/api/superadmin.api";
import UserAvatar from "@/shared/components/UserAvatar";

// nav items with optional dynamic badge -- undefined means no badge shown
type NavItem = { to: string; icon: string; label: string; badge?: string | number };
type NavSection = { section: string; items: NavItem[] };

function buildNav(orgCount: number, pendingCount: number, userCount: number): NavSection[] {
  return [
    {
      section: "Platform",
      items: [
        { to: "/", icon: "space_dashboard", label: "Dashboard" },
        {
          to: "/organizations",
          icon: "domain",
          label: "Organizations",
          badge: orgCount || undefined,
        },
        {
          to: "/verification-queue",
          icon: "pending_actions",
          label: "Verification Queue",
          badge: pendingCount || undefined,
        },
        {
          to: "/users",
          icon: "group",
          label: "Users",
          badge: userCount > 999 ? `${(userCount / 1000).toFixed(1)}k` : userCount || undefined,
        },
        { to: "/billing", icon: "attach_money", label: "Billing & Revenue" },
        { to: "/support", icon: "support_agent", label: "Support Tickets" },
      ],
    },
    {
      section: "Trust",
      items: [
        { to: "/disputes", icon: "gavel", label: "Disputes" },
        { to: "/audit-log", icon: "history", label: "Audit Log" },
        { to: "/feature-flags", icon: "toggle_on", label: "Feature Flags" },
        { to: "/moderation", icon: "shield", label: "Moderation" },
        { to: "/compliance", icon: "verified_user", label: "Compliance" },
      ],
    },
    {
      section: "Operations",
      items: [
        { to: "/analytics", icon: "analytics", label: "Analytics" },
        { to: "/announcements", icon: "campaign", label: "Announcements" },
        { to: "/health", icon: "monitor_heart", label: "System Health" },
      ],
    },
  ];
}

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: string[];
};

/** SEU v8 platform shell: sidebar nav + frosted topbar + fixed breadcrumb bar. */
export default function AdminLayout({ children, title, subtitle, actions, crumbs }: Props) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  const fullName = user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "Super Admin";

  function handleSignOut() {
    clearAuth();
    navigate("/login");
  }
  const location = useLocation();

  const { data: orgs = [] } = useQuery({ queryKey: ["orgs"], queryFn: superadminApi.listOrgs });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });
  const pendingCount = orgs.filter((o) => o.status === "pending_review").length;
  const regularUserCount = users.filter((u) => !u.is_superuser).length;
  const nav = buildNav(orgs.length, pendingCount, regularUserCount);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* sidebar - fixed, doesn't scroll with page */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 overflow-y-auto"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          zIndex: 50,
          background: "var(--surface)",
          borderRight: "1px solid var(--outline)",
          padding: "18px 14px",
          gap: 10,
        }}
      >
        {/* brand */}
        <div
          className="flex items-center gap-3"
          style={{ paddingBottom: 14, borderBottom: "1px solid var(--outline)", flexShrink: 0 }}
        >
          <div
            className="grid place-items-center text-white flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "linear-gradient(135deg, #050a26, #121d3f)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            S
          </div>
          <div>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 14.5,
                letterSpacing: "-0.02em",
                color: "var(--on-bg)",
              }}
            >
              Sansaar
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--secondary)",
                marginTop: 1,
              }}
            >
              Event Universe
            </p>
          </div>
        </div>

        {/* nav sections */}
        <nav className="flex flex-col flex-1 overflow-y-auto" style={{ gap: 0, marginTop: 4 }}>
          {nav.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--on-mut)",
                  padding: "4px 10px",
                  marginBottom: 2,
                }}
              >
                {section}
              </p>
              {items.map(({ to, icon, label, badge }) => {
                const isActive =
                  to === "/"
                    ? location.pathname === "/"
                    : location.pathname === to || location.pathname.startsWith(to + "/");
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className="no-underline flex items-center gap-3"
                    style={{
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: "Manrope, sans-serif",
                      color: isActive ? "white" : "var(--on-var)",
                      background: isActive ? "#050a26" : "transparent",
                      marginBottom: 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="ms"
                      style={{
                        fontSize: 17,
                        flexShrink: 0,
                        color: isActive ? "var(--tertiary)" : "var(--on-mut)",
                      }}
                    >
                      {icon}
                    </span>
                    <span className="flex-1">{label}</span>
                    {badge !== undefined && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9.5,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: isActive ? "rgba(255,255,255,0.12)" : "var(--mid)",
                          color: isActive ? "white" : "var(--on-mut)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* bottom */}
        <div
          style={{
            paddingTop: 8,
            borderTop: "1px solid var(--outline)",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full text-left rounded-lg"
            style={{
              padding: "7px 10px",
              fontSize: 13,
              fontFamily: "Manrope, sans-serif",
              color: "var(--on-mut)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span className="ms" style={{ fontSize: 17 }}>
              logout
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* main - offset by sidebar width */}
      <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden" style={{ marginLeft: 260 }}>
        {/* topbar - fixed, explicit height so breadcrumb can sit below it */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{
            position: "fixed",
            top: 0,
            left: 260,
            right: 0,
            height: 56,
            zIndex: 40,
            background: "rgba(244,245,247,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--outline)",
            padding: "0 28px",
          }}
        >
          {/* inline search  - static placeholder for now */}
          <AdminSearch />

          {/* right: profile only  - no role switcher, no notifications */}
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-3"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 10,
              }}
            >
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 13.5,
                    letterSpacing: "-0.02em",
                    color: "var(--on-bg)",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fullName}
                </p>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 3,
                    padding: "2px 8px",
                    borderRadius: 5,
                    background: "#fce8d4",
                    color: "#b07030",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Super Admin
                </span>
              </div>
              <UserAvatar
                uid={user?.id ?? ""}
                size={40}
                radius={10}
                style={{ border: "2px solid var(--outline)" }}
              />
            </button>
          </div>
        </header>

        {/* breadcrumb bar - fixed at top:56 (right below the 56px topbar) */}
        {crumbs && (
          <div
            style={{
              position: "fixed",
              top: 56,
              left: 260,
              right: 0,
              height: 32,
              zIndex: 39,
              background: "var(--bg)",
              borderBottom: "1px solid var(--outline)",
              padding: "0 32px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && (
                  <span style={{ opacity: 0.4, fontFamily: "Manrope, sans-serif", fontSize: 12 }}>
                    /
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: i === crumbs.length - 1 ? "var(--secondary)" : "var(--on-mut)",
                  }}
                >
                  {c}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* page content - topbar 56px + breadcrumb 33px = 89px, or just topbar 56px */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "20px 32px 60px", marginTop: crumbs ? 88 : 56 }}
        >
          {(title || actions) && (
            <div className="flex items-start justify-between gap-6 flex-wrap mb-7">
              <div>
                {title && (
                  <h1
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                      fontSize: 32,
                      letterSpacing: "-0.035em",
                      lineHeight: 1.05,
                      color: "var(--on-bg)",
                      marginBottom: subtitle ? 6 : 0,
                    }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p
                    style={{
                      fontSize: 14.5,
                      color: "var(--on-var)",
                      fontFamily: "Manrope, sans-serif",
                      maxWidth: "65ch",
                      lineHeight: 1.55,
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

// * admin search bar

/** Inline search bar for the superadmin topbar  - searches orgs and users. */
function AdminSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ! Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ! Keyboard shortcut  - Cmd+K or Ctrl+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /** Quick-jump links that always show when the search bar is focused. */
  const quickLinks = [
    { icon: "domain", label: "Organizations", path: "/organizations" },
    { icon: "group", label: "Users", path: "/users" },
    { icon: "pending_actions", label: "Verification Queue", path: "/verification-queue" },
    { icon: "attach_money", label: "Billing & Revenue", path: "/billing" },
    { icon: "analytics", label: "Analytics", path: "/analytics" },
  ];

  /** Filtered quick links based on query. */
  const filtered = query.trim()
    ? quickLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : quickLinks;

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: 320 }}>
      <div
        className="flex items-center gap-2"
        style={{
          background: "var(--surface)",
          border: open ? "1px solid var(--primary)" : "1px solid var(--outline)",
          borderRadius: 10,
          padding: "7px 12px",
          transition: "border-color 150ms",
        }}
      >
        <span className="ms" style={{ fontSize: 17, color: "var(--on-mut)" }}>
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search platform..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "Manrope, sans-serif",
            fontSize: 13,
            color: "var(--on-bg)",
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            padding: "1px 5px",
            borderRadius: 4,
            background: "var(--low)",
            color: "var(--on-mut)",
          }}
        >
          ⌘K
        </span>
      </div>

      {/* dropdown quick-jump */}
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--mid)",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            padding: 6,
            zIndex: 100,
          }}
        >
          <p
            style={{
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--on-mut)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Quick jump
          </p>
          {filtered.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                setOpen(false);
                setQuery("");
                navigate(link.path);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 10px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--low)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span className="ms" style={{ fontSize: 17, color: "var(--on-mut)" }}>
                {link.icon}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--on-bg)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                {link.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
