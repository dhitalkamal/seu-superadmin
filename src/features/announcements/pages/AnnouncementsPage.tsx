import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, KPI, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";
import { exportCSV, exportPDF } from "@/shared/lib/export";

type Mode = "broadcast" | "single";
type NotificationType =
  | "platform_announcement"
  | "maintenance"
  | "feature_update"
  | "admin_notification";

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "platform_announcement", label: "Announcement", icon: "campaign", color: "#121d3f" },
  { value: "maintenance", label: "Maintenance", icon: "build", color: "#dba13d" },
  { value: "feature_update", label: "Feature update", icon: "new_releases", color: "#16a34a" },
  {
    value: "admin_notification",
    label: "Admin notice",
    icon: "admin_panel_settings",
    color: "#e83151",
  },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--on-mut)",
  marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--outline)",
  background: "var(--low)",
  color: "var(--on-bg)",
  fontSize: 14,
  outline: "none",
  fontFamily: "'Manrope', sans-serif",
  boxSizing: "border-box",
};

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

export default function AnnouncementsPage() {
  const { toast, toastEl } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<Mode>("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [notifType, setNotifType] = useState<NotificationType>("platform_announcement");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [sentHistory, setSentHistory] = useState<SentRecord[]>([]);

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });
  const { data: recentNotifs = [] } = useQuery({
    queryKey: ["recent-notifications"],
    queryFn: () => superadminApi.listRecentNotifications(20),
  });

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
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
      )
    : [];

  const selectedUser = users.find((u) => u.id === selectedUserId);

  function recordSent(status: "sent" | "failed") {
    setSentHistory((prev) => [
      {
        title,
        message: body,
        channel,
        type: notifType,
        target:
          mode === "broadcast" ? `All users (${users.length})` : (selectedUser?.email ?? "user"),
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
      toast(`Sent to ${users.length} users`);
      closeModal();
    },
    onError: () => {
      recordSent("failed");
      toast("Failed to send");
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
      toast(`Sent to ${selectedUser?.email ?? "user"}`);
      closeModal();
    },
    onError: () => {
      recordSent("failed");
      toast("Failed to send");
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

  function closeModal() {
    setShowModal(false);
    setTitle("");
    setBody("");
    setSelectedUserId("");
    setUserSearch("");
    setNotifType("platform_announcement");
    setChannel("in_app");
    setMode("broadcast");
  }

  const sentCount = sentHistory.filter((r) => r.status === "sent").length;
  const failedCount = sentHistory.filter((r) => r.status === "failed").length;
  const totalRecipients = sentHistory.reduce((s, r) => s + r.recipientCount, 0);

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
                <button
                  className="btn-sm"
                  onClick={() => {
                    const h = [
                      "Title",
                      "Type",
                      "Channel",
                      "Target",
                      "Recipients",
                      "Status",
                      "Sent at",
                    ];
                    const r = sentHistory.map((x) => [
                      x.title,
                      x.type,
                      x.channel,
                      x.target,
                      String(x.recipientCount),
                      x.status,
                      x.sentAt.toLocaleString(),
                    ]);
                    exportCSV(h, r, "announcements");
                  }}
                >
                  <MS n="download" size={13} /> Export CSV
                </button>
                <button
                  className="btn-sm"
                  onClick={() => {
                    const h = [
                      "Title",
                      "Type",
                      "Channel",
                      "Target",
                      "Recipients",
                      "Status",
                      "Sent at",
                    ];
                    const r = sentHistory.map((x) => [
                      x.title,
                      x.type,
                      x.channel,
                      x.target,
                      String(x.recipientCount),
                      x.status,
                      x.sentAt.toLocaleString(),
                    ]);
                    exportPDF("Announcements History", h, r, "announcements");
                  }}
                >
                  <MS n="picture_as_pdf" size={13} /> Export PDF
                </button>
              </>
            )}
            <button className="btn-sm primary" onClick={() => setShowModal(true)}>
              <MS n="send" size={13} /> Compose
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KPI icon="send" color="lav" label="Sent" value={String(sentCount)} />
        <KPI icon="group" color="mnt" label="Total recipients" value={String(totalRecipients)} />
        <KPI
          icon="error"
          color="crl"
          label="Failed"
          value={String(failedCount)}
          trendKind={failedCount > 0 ? "warn" : "steady"}
        />
        <KPI icon="campaign" color="pch" label="History" value={String(sentHistory.length)} />
      </div>

      {/* sent history table */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Send history</span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10.5,
              color: "var(--on-mut)",
            }}
          >
            {sentHistory.length} entries
          </span>
        </div>
        <div className="panel-body flush">
          {sentHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <MS
                n="outgoing_mail"
                size={32}
                style={{ display: "block", margin: "0 auto 12px", opacity: 0.2 }}
              />
              <p
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 600,
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                No announcements sent yet
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--on-mut)",
                  fontFamily: "Manrope, sans-serif",
                  marginBottom: 16,
                }}
              >
                Compose and send your first announcement to platform users.
              </p>
              <button className="btn-sm primary" onClick={() => setShowModal(true)}>
                <MS n="send" size={13} /> Compose announcement
              </button>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {sentHistory.map((r, i) => {
                  const tInfo = NOTIFICATION_TYPES.find((t) => t.value === r.type);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.title}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                          }}
                        >
                          <MS n={tInfo?.icon ?? "info"} size={14} style={{ color: tInfo?.color }} />
                          {tInfo?.label ?? r.type}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {r.channel}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--on-var)" }}>{r.target}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: r.status === "sent" ? "#dcfce7" : "#fee2e2",
                            color: r.status === "sent" ? "#166534" : "#991b1b",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                          color: "var(--on-mut)",
                        }}
                      >
                        {r.sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* compose modal */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            {/* header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px 16px",
                borderBottom: "1px solid var(--outline)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(5,10,38,0.06)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <MS n="campaign" size={18} style={{ color: "var(--on-bg)" }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontWeight: 700,
                      fontSize: 17,
                      letterSpacing: "-0.02em",
                      margin: 0,
                    }}
                  >
                    Compose {mode === "broadcast" ? "broadcast" : "notification"}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--on-mut)",
                      fontFamily: "Manrope, sans-serif",
                      margin: 0,
                      marginTop: 2,
                    }}
                  >
                    {mode === "broadcast"
                      ? `Send to all ${users.length} platform users.`
                      : "Send to a specific user."}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--mid)",
                  background: "transparent",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MS n="close" size={16} style={{ color: "var(--on-mut)" }} />
              </button>
            </div>

            {/* body */}
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {/* mode toggle */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid var(--outline)",
                }}
              >
                {(["broadcast", "single"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      fontSize: 12.5,
                      fontWeight: mode === m ? 700 : 500,
                      fontFamily: "Manrope, sans-serif",
                      border: "none",
                      cursor: "pointer",
                      background: mode === m ? "#050a26" : "var(--surface)",
                      color: mode === m ? "white" : "var(--on-var)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <MS n={m === "broadcast" ? "campaign" : "person"} size={14} />
                    {m === "broadcast" ? "Broadcast" : "Single user"}
                  </button>
                ))}
              </div>

              {/* type selector */}
              <div>
                <label style={labelStyle}>Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {NOTIFICATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNotifType(t.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border:
                          notifType === t.value
                            ? `2px solid ${t.color}`
                            : "1px solid var(--outline)",
                        background: notifType === t.value ? `${t.color}08` : "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: notifType === t.value ? 700 : 500,
                        fontFamily: "Manrope, sans-serif",
                        color: "var(--on-bg)",
                      }}
                    >
                      <MS n={t.icon} size={14} style={{ color: t.color }} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* single user picker */}
              {mode === "single" && (
                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>
                    Recipient <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  {selectedUser ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--outline)",
                        background: "var(--low)",
                      }}
                    >
                      <MS n="person" size={16} style={{ color: "var(--on-mut)" }} />
                      <span style={{ flex: 1, fontSize: 13, fontFamily: "Manrope, sans-serif" }}>
                        <strong>
                          {selectedUser.first_name} {selectedUser.last_name}
                        </strong>
                        <span style={{ color: "var(--on-mut)", marginLeft: 8 }}>
                          {selectedUser.email}
                        </span>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedUserId("");
                          setUserSearch("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                        }}
                      >
                        <MS n="close" size={14} style={{ color: "var(--on-mut)" }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        style={inputStyle}
                      />
                      {userSearch.trim() && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 20,
                            background: "var(--surface)",
                            border: "1px solid var(--mid)",
                            borderRadius: 10,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                            maxHeight: 180,
                            overflowY: "auto",
                            marginTop: 4,
                          }}
                        >
                          {filteredUsers.length === 0 ? (
                            <p
                              style={{ padding: "12px 14px", fontSize: 12, color: "var(--on-mut)" }}
                            >
                              No users found
                            </p>
                          ) : (
                            filteredUsers.slice(0, 6).map((u) => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setUserSearch("");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  width: "100%",
                                  padding: "9px 14px",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  borderBottom: "1px solid var(--outline)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--low)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                }}
                              >
                                <MS n="person" size={15} style={{ color: "var(--on-mut)" }} />
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                                    {u.first_name} {u.last_name}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      color: "var(--on-mut)",
                                      fontFamily: "JetBrains Mono, monospace",
                                    }}
                                  >
                                    {u.email}
                                  </p>
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

              {/* title */}
              <div>
                <label style={labelStyle}>
                  Title <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    mode === "broadcast"
                      ? "Platform maintenance scheduled..."
                      : "Action required on your account..."
                  }
                  style={inputStyle}
                />
              </div>

              {/* message */}
              <div>
                <label style={labelStyle}>
                  Message <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* channel */}
              <div>
                <label style={labelStyle}>Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  style={inputStyle}
                >
                  <option value="in_app">In-app notification</option>
                  <option value="email">Email</option>
                  <option value="push">Push notification</option>
                </select>
              </div>
            </div>

            {/* footer */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                padding: "16px 24px 20px",
                borderTop: "1px solid var(--outline)",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--mid)",
                  background: "transparent",
                  color: "var(--on-var)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "Manrope, sans-serif",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend() || isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: !canSend() ? "var(--mid)" : "#050a26",
                  color: !canSend() ? "var(--on-mut)" : "white",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "Manrope, sans-serif",
                  cursor: !canSend() ? "not-allowed" : "pointer",
                }}
              >
                <MS n={mode === "broadcast" ? "rocket_launch" : "send"} size={14} />
                {isPending
                  ? "Sending..."
                  : mode === "broadcast"
                    ? `Send to ${users.length} users`
                    : "Send notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
