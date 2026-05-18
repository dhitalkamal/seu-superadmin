import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AdminLayout from "@/shared/layouts/AdminLayout";
import { PH, MS, useToast } from "@/shared/components/v8";
import superadminApi from "@/shared/api/superadmin.api";

const SENT_HISTORY = [
  {
    n: "Platform maintenance scheduled",
    body: "Scheduled maintenance on Oct 15 from 2-4 AM UTC.",
    target: "All users",
    date: "Oct 1",
    reads: 1842,
  },
  {
    n: "New feature: Volunteer module live",
    body: "Organisations can now manage volunteer roles from the dashboard.",
    target: "Organisations",
    date: "Sep 25",
    reads: 312,
  },
  {
    n: "Updated privacy policy",
    body: "Our privacy policy has been updated, effective Nov 1.",
    target: "All users",
    date: "Sep 20",
    reads: 2401,
  },
];

export default function AnnouncementsPage() {
  const { toast, toastEl } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [done, setDone] = useState(false);

  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: superadminApi.listUsers });

  const sendMutation = useMutation({
    mutationFn: () =>
      superadminApi.sendAnnouncement({
        user_ids: users.map((u) => u.id),
        notification_type: "platform_announcement",
        channel,
        title,
        message: body,
      }),
    onSuccess: () => {
      setDone(true);
      toast(`Announcement sent to ${users.length} users`);
    },
    onError: () => toast("Failed to send announcement"),
  });

  function handleSend() {
    if (title && body && users.length > 0) sendMutation.mutate();
  }

  return (
    <AdminLayout>
      {toastEl}
      <PH
        crumbs={["Operations", "Announcements"]}
        title="Announcements"
        sub={`Broadcast platform-wide messages. ${users.length} users will receive via ${channel}.`}
        actions={
          <button className="btn-sm">
            <MS n="history" size={13} />
            Send history
          </button>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">New announcement</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10.5,
                  color: "var(--on-mut)",
                }}
              >
                {users.length} recipients
              </span>
              {users.length === 0 && (
                <MS n="warning" size={13} style={{ color: "var(--warning)" }} />
              )}
            </div>
          </div>
          <div className="panel-body">
            {done ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#dcfce7",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <MS n="check_circle" size={36} style={{ color: "#166534" }} />
                </div>
                <p
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontWeight: 600,
                    fontSize: 20,
                    letterSpacing: "-0.025em",
                    marginBottom: 6,
                  }}
                >
                  Announcement sent
                </p>
                <p
                  style={{
                    color: "var(--on-var)",
                    fontSize: 13,
                    fontFamily: "Manrope, sans-serif",
                  }}
                >
                  Delivered to {users.length} users via {channel}.
                </p>
                <button
                  className="btn-sm primary"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    setDone(false);
                    setTitle("");
                    setBody("");
                  }}
                >
                  New announcement
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="field">
                  <label className="field-lab">Title</label>
                  <input
                    className="field-in"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Platform maintenance scheduled..."
                  />
                </div>
                <div className="field">
                  <label className="field-lab">Message</label>
                  <textarea
                    className="field-in"
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message..."
                    style={{ lineHeight: 1.6, resize: "vertical" }}
                  />
                </div>
                <div className="field">
                  <label className="field-lab">Channel</label>
                  <select
                    className="field-in"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option value="in_app">In-app notification</option>
                    <option value="email">Email</option>
                    <option value="push">Push notification</option>
                  </select>
                </div>
                {users.length === 0 && (
                  <div className="notice">
                    <MS n="warning" />
                    <div>
                      <strong>No users loaded</strong>
                      <span>User list must load before sending.</span>
                    </div>
                  </div>
                )}
                <button
                  className="btn-sm primary"
                  onClick={handleSend}
                  disabled={!title || !body || users.length === 0 || sendMutation.isPending}
                  style={{
                    opacity: !title || !body || users.length === 0 ? 0.4 : 1,
                    cursor: !title || !body ? "not-allowed" : "pointer",
                    justifyContent: "center",
                  }}
                >
                  <MS n="rocket_launch" size={13} />
                  {sendMutation.isPending ? "Sending..." : `Send to ${users.length} users`}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Recent announcements</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {SENT_HISTORY.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom:
                    i < SENT_HISTORY.length - 1 ? "1px solid var(--outline)" : undefined,
                }}
              >
                <div
                  style={{
                    width: 3,
                    borderRadius: 2,
                    background: "linear-gradient(135deg,#e83151,#dba13d)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 13.5,
                        fontFamily: "Space Grotesk, sans-serif",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {a.n}
                    </p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 10.5,
                          color: "var(--on-mut)",
                        }}
                      >
                        {a.date}
                      </span>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 9.5,
                          padding: "2px 7px",
                          borderRadius: 5,
                          background: "var(--low)",
                          color: "var(--on-mut)",
                        }}
                      >
                        {a.reads.toLocaleString()} reads
                      </span>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--on-var)",
                      lineHeight: 1.55,
                      fontFamily: "Manrope, sans-serif",
                      marginBottom: 6,
                    }}
                  >
                    {a.body}
                  </p>
                  <span className="pill scheduled" style={{ fontSize: 9.5 }}>
                    {a.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
