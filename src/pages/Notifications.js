import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";

const TYPE_CONFIG = {
  message_from_stylist: { icon: "ti-message-circle", color: "#c4745a", label: "Message", route: "/my-messages" },
  message_from_client:  { icon: "ti-message-circle", color: "#c4745a", label: "Message", route: "/stylist/messages" },
  new_review:           { icon: "ti-star",            color: "#f59e0b", label: "Review",  route: "/account#reviews" },
  review_reply:         { icon: "ti-message-reply",   color: "#c4745a", label: "Reply",   route: "/my-messages" },
  new_follower:         { icon: "ti-user-plus",       color: "#c4745a", label: "Follower",route: "/stylist" },
  new_client:           { icon: "ti-users",           color: "#4a6741", label: "Client",  route: "/stylist/clients" },
  session_ended:        { icon: "ti-check",           color: "#4a6741", label: "Session", route: "/my-messages" },
  tip_received:         { icon: "ti-heart-handshake", color: "#c4745a", label: "Tip",     route: "/stylist/analytics" },
  billing:              { icon: "ti-credit-card",     color: "#3b82f6", label: "Billing", route: "/account#billing" },
  message:              { icon: "ti-message-circle",  color: "#c4745a", label: "Message", route: "/my-messages" },
};

export default function Notifications() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const isStylist = userProfile?.accountType === "stylist";
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) loadNotifications();
  }, [currentUser]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "notifications"),
          where("userId", "==", currentUser.uid)
        )
      );
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(items);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function markRead(id) {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch(e) {}
  }

  async function markAllRead() {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch(e) {}
  }

  async function deleteNotif(id) {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch(e) {}
  }

  async function handleTap(notif) {
    await markRead(notif.id);
    const cfg = TYPE_CONFIG[notif.type];
    if (cfg?.route) nav(cfg.route);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" onClick={() => nav(isStylist ? "/stylist" : "/home")} style={{ cursor: "pointer" }}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unreadCount > 0 && (
            <span style={{ background: "#e53935", color: "white", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink)", fontSize: 12, fontFamily: "inherit" }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            {notifications.length === 0 ? "You're all caught up" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTop: "3px solid var(--pink)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="ti ti-bell-off" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No notifications yet</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {isStylist ? "You'll be notified about messages, reviews, and new clients" : "You'll be notified about messages, session updates, and more"}
              </div>
            </div>
          ) : notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.message;
            return (
              <div
                key={n.id}
                onClick={() => handleTap(n)}
                style={{
                  background: n.read ? "var(--bg-card)" : "var(--pink-light)",
                  border: `${n.read ? "0.5px" : "1.5px"} solid ${n.read ? "var(--border)" : "var(--pink)"}`,
                  borderRadius: "var(--radius)", padding: 14, marginBottom: 10,
                  cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12,
                }}
              >
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, color: cfg.color }} aria-hidden="true"></i>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: "var(--text-primary)" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </div>
                  )}
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e53935", marginTop: 6 }} />
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16, padding: 2, flexShrink: 0 }}
                  title="Remove"
                >✕</button>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar active="account" type={isStylist ? "stylist" : "client"} />
    </>
  );
}
