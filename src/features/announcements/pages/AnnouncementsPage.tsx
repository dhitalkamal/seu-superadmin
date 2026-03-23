import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";

type Mode = "broadcast" | "single";
type NotificationType = "platform_announcement" | "maintenance" | "feature_update" | "admin_notification";

const NOTIFICATION_TYPES: { value: NotificationType; label: string; icon: string; color: string }[] = [
  { value: "platform_announcement", label: "Announcement", icon: "campaign", color: "#121d3f" },
  { value: "maintenance", label: "Maintenance", icon: "build", color: "#dba13d" },
  { value: "feature_update", label: "Feature update", icon: "new_releases", color: "#16a34a" },
  { value: "admin_notification", label: "Admin notice", icon: "admin_panel_settings", color: "#e83151" },
];

type SentRecord = {
  title: string;
  message: string;
  channel: string;
  type: NotificationType;
  target: string;
  recipientCount: number;
  sentAt: Date;
  status: "sent" | "failed";
};

/** Announcements page - broadcast to all users or notify a single user. */
export default function AnnouncementsPage() {
  const { toast, toastEl } = useToast();
  const [mode, setMode] = useState<Mode>("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [notifType, setNotifType] = useState<NotificationType>("platform_announcement");
  const [done, setDone] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [sentHistory, setSentHistory] = useState<SentRecord[]>([]);

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });

  // load real send history from notification service on mount
  const { data: recentNotifs = [] } = useQuery({
    queryKey: ["recent-notifications"],
    queryFn: () => superadminApi.listRecentNotifications(20),
  });

  // seed sentHistory from server notifications only once on first load
  useEffect(() => {
    if (recentNotifs.length === 0) return;
    setSentHistory((prev) => {
      if (prev.length > 0) return prev;
      return recentNotifs.map((n) => ({
        title: n.title,
        message: n.message,
        channel: n.channel,
        type: (n.notification_type as SentRecord["type"]) ?? "admin_notification",
        target: `user: ${n.user_id.slice(0, 8)}`,
        recipientCount: 1,
        sentAt: new Date(n.created_at),
        status: "sent" as const,
      }));
    });
  }, [recentNotifs]);

  const filteredUsers = userSearch.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : [];

  const selectedUser = users.find((u) => u.id === selectedUserId);

  /** Adds a record to the session history after send. */
  function recordSent(status: "sent" | "failed") {
    setSentHistory((prev) => [
      {
        title,
        message: body,
        channel,
        type: notifType,
        target: mode === "broadcast" ? `All users (${users.length})` : selectedUser?.email ?? "user",
        recipientCount: mode === "broadcast" ? users.length : 1,
        sentAt: new Date(),
        status,
      },
      ...prev,
    ]);
  }

  const broadcastMutation = useMutation({
    mutationFn: () =>
      superadminApi.sendAnnouncement({
        user_ids: users.map((u) => u.id),
        notification_type: notifType,
        channel,
        title,
        message: body,
      }),
    onSuccess: () => {
      recordSent("sent");
      setDone(true);
      toast(`Sent to ${users.length} users via ${channel}`);
    },
    onError: () => {
      recordSent("failed");
      toast("Failed to send announcement");
    },
  });

  const singleMutation = useMutation({
    mutationFn: () =>
      superadminApi.sendNotification({
        user_id: selectedUserId,
        notification_type: notifType,
        channel,
        title,
        message: body,
      }),
    onSuccess: () => {
      recordSent("sent");
      setDone(true);
      toast(`Sent to ${selectedUser?.email ?? "user"} via ${channel}`);
    },
    onError: () => {
      recordSent("failed");
      toast("Failed to send notification");
    },
  });

  const isPending = broadcastMutation.isPending || singleMutation.isPending;

  function canSend(): boolean {
    if (!title || !body) return false;
    if (mode === "broadcast") return users.length > 0;
    return !!selectedUserId;
  }

  function handleSend() {
    if (!canSend()) return;
    if (mode === "broadcast") broadcastMutation.mutate();
    else singleMutation.mutate();
  }

  function handleReset() {
    setDone(false);
    setTitle("");
    setBody("");
    setSelectedUserId("");
    setUserSearch("");
  }

  function handleExportCSV() {
    const headers = ["Title", "Type", "Channel", "Target", "Recipients", "Status", "Sent at"];
    const rows = sentHistory.map((r) => [r.title, r.type, r.channel, r.target, String(r.recipientCount), r.status, r.sentAt.toLocaleString()]);
    exportCSV(headers, rows, "announcements");
  }

  function handleExportPDF() {
    const headers = ["Title", "Type", "Channel", "Target", "Recipients", "Status", "Sent at"];
    const rows = sentHistory.map((r) => [r.title, r.type, r.channel, r.target, String(r.recipientCount), r.status, r.sentAt.toLocaleString()]);
    exportPDF("Announcements History", headers, rows, "announcements");
  }

  const successTarget = mode === "broadcast" ? `${users.length} users` : selectedUser?.email ?? "user";
  return (
    <AdminLayout crumbs={["Operations", "Announcements"]}>
      {toastEl}
      <PH
        title="Announcements"
        sub="Send platform-wide broadcasts or notify individual users."
        actions={
          <>
            {sentHistory.length > 0 && (
              <>
                <button className="btn-sm" onClick={handleExportCSV}>
                  <MS n="download" size={13} />
                  Export CSV
                </button>
                <button className="btn-sm" onClick={handleExportPDF}>
                  <MS n="picture_as_pdf" size={13} />
                  Export PDF
                </button>
              </>
            )}
          </>
        }
      />

      <div style={{ display: "flex", gap: 18 }}>
        {/* left: compose form */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Compose</span>
              <div style={{ display: "flex", gap: 0, borderRadius: 7, overflow: "hidden", border: "1px solid var(--outline)" }}>
                <ModeTab active={mode === "broadcast"} onClick={() => setMode("broadcast")} icon="campaign" label="Broadcast" />
                <ModeTab active={mode === "single"} onClick={() => setMode("single")} icon="person" label="Single user" />
              </div>
            </div>
            <div className="panel-body">
              {done ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                    <MS n="check_circle" size={36} style={{ color: "#166534" }} />
                  </div>
                  <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: "-0.025em", marginBottom: 6 }}>
                    {mode === "broadcast" ? "Announcement sent" : "Notification sent"}
                  </p>
                  <p style={{ color: "var(--on-var)", fontSize: 13, fontFamily: "Manrope, sans-serif" }}>
                    Delivered to {successTarget} via {channel}.
                  </p>
                  <button className="btn-sm primary" style={{ marginTop: 14 }} onClick={handleReset}>
                    Send another
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* notification type selector */}
                  <div className="field">
                    <label className="field-lab">Type</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {NOTIFICATION_TYPES.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setNotifType(t.value)}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: notifType === t.value ? `2px solid ${t.color}` : "1px solid var(--outline)",
                            background: notifType === t.value ? `${t.color}08` : "transparent",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: notifType === t.value ? 700 : 500,
                            fontFamily: "Manrope, sans-serif",
                            color: "var(--on-bg)",
                          }}
                        >
                          <MS n={t.icon} size={14} style={{ color: t.color }} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* single user picker */}
                  {mode === "single" && (
                    <div className="field" style={{ position: "relative" }}>
                      <label className="field-lab">Recipient</label>
                      {selectedUser ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--outline)", background: "var(--low)" }}>
                          <MS n="person" size={16} style={{ color: "var(--on-mut)" }} />
                          <span style={{ flex: 1, fontSize: 13, fontFamily: "Manrope, sans-serif" }}>
                            <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
                            <span style={{ color: "var(--on-mut)", marginLeft: 8 }}>{selectedUser.email}</span>
                          </span>
                          <button onClick={() => { setSelectedUserId(""); setUserSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                            <MS n="close" size={14} style={{ color: "var(--on-mut)" }} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input className="field-in" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name or email..." />
                          {userSearch.trim() && (
                            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "var(--surface)", border: "1px solid var(--mid)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                              {filteredUsers.length === 0 ? (
                                <p style={{ padding: "12px 14px", fontSize: 12, color: "var(--on-mut)" }}>No users found</p>
                              ) : (
                                filteredUsers.slice(0, 8).map((u) => (
                                  <button
                                    key={u.id}
                                    onClick={() => { setSelectedUserId(u.id); setUserSearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--outline)" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--low)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <MS n="person" size={15} style={{ color: "var(--on-mut)" }} />
                                    <div>
                                      <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "Space Grotesk, sans-serif" }}>{u.first_name} {u.last_name}</p>
                                      <p style={{ fontSize: 11, color: "var(--on-mut)", fontFamily: "JetBrains Mono, monospace" }}>{u.email}</p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* broadcast recipient count */}
                  {mode === "broadcast" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--low)" }}>
                      <MS n="group" size={15} style={{ color: "var(--on-mut)" }} />
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--on-mut)" }}>
                        {users.length} recipients (all platform users)
                      </span>
                    </div>
                  )}

                  <div className="field">
                    <label className="field-lab">Title</label>
                    <input className="field-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "broadcast" ? "Platform maintenance scheduled..." : "Action required on your account..."} />
                  </div>
                  <div className="field">
                    <label className="field-lab">Message</label>
                    <textarea className="field-in" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." style={{ lineHeight: 1.6, resize: "vertical" }} />
                  </div>
                  <div className="field">
                    <label className="field-lab">Channel</label>
                    <select className="field-in" value={channel} onChange={(e) => setChannel(e.target.value)}>
                      <option value="in_app">In-app notification</option>
                      <option value="email">Email</option>
                      <option value="push">Push notification</option>
                    </select>
                  </div>

                  <button
                    className="btn-sm primary"
                    onClick={handleSend}
                    disabled={!canSend() || isPending}
                    style={{ opacity: !canSend() ? 0.4 : 1, cursor: !canSend() ? "not-allowed" : "pointer", justifyContent: "center" }}
                  >
                    <MS n={mode === "broadcast" ? "rocket_launch" : "send"} size={13} />
                    {isPending ? "Sending..." : mode === "broadcast" ? `Send to ${users.length} users` : "Send notification"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right: sent history sidebar */}
        <div style={{ width: 360, flexShrink: 0 }}>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Sent this session</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--on-mut)" }}>
                {sentHistory.length} sent
              </span>
            </div>
            <div className="panel-body" style={{ padding: 0, maxHeight: 600, overflowY: "auto" }}>
              {sentHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--on-mut)", fontSize: 13 }}>
                  <MS n="outgoing_mail" size={28} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />
                  Sent announcements will appear here.
                </div>
              ) : (
                sentHistory.map((r, i) => {
                  const tInfo = NOTIFICATION_TYPES.find((t) => t.value === r.type);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "14px 16px",
                        borderBottom: i < sentHistory.length - 1 ? "1px solid var(--outline)" : undefined,
                      }}
                    >
                      <div style={{ width: 3, borderRadius: 2, background: tInfo?.color ?? "#9ca3af", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.title}
                          </p>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: r.status === "sent" ? "#dcfce7" : "#fee2e2",
                              color: r.status === "sent" ? "#166534" : "#991b1b",
                              fontWeight: 700,
                            }}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: "var(--on-var)", lineHeight: 1.5, fontFamily: "Manrope, sans-serif", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.message}
                        </p>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, padding: "2px 7px", borderRadius: 5, background: "var(--low)", color: "var(--on-mut)" }}>
                            {tInfo?.label ?? r.type}
                          </span>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, padding: "2px 7px", borderRadius: 5, background: "var(--low)", color: "var(--on-mut)" }}>
                            {r.channel}
                          </span>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--on-mut)" }}>
                            {r.recipientCount} recipients
                          </span>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "var(--on-mut)", marginLeft: "auto" }}>
                            {r.sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/** Tab button for switching between broadcast and single user modes. */
function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        fontSize: 11.5,
        fontWeight: active ? 700 : 500,
        fontFamily: "Manrope, sans-serif",
        background: active ? "#050a26" : "var(--surface)",
        color: active ? "white" : "var(--on-var)",
        border: "none",
        cursor: "pointer",
      }}
    >
      <MS n={icon} size={14} />
      {label}
    </button>
  );
}
