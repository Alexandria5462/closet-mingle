import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

// Icons per notification type — no emojis, uses Tabler icons
const TYPE_CONFIG = {
  message_from_stylist: { icon: "ti-message-circle",   color: "#c4745a" },
  message_from_client:  { icon: "ti-message-circle",   color: "#c4745a" },
  new_review:           { icon: "ti-star",              color: "#f59e0b" },
  review_reply:         { icon: "ti-message-reply",     color: "#c4745a" },
  new_follower:         { icon: "ti-user-plus",         color: "#c4745a" },
  new_client:           { icon: "ti-users",             color: "#4a6741" },
  session_ended:        { icon: "ti-check",             color: "#4a6741" },
  tip_received:         { icon: "ti-heart-handshake",   color: "#c4745a" },
  billing:              { icon: "ti-credit-card",       color: "#3b82f6" },
  follow:               { icon: "ti-user-plus",         color: "#c4745a" },
  // legacy fallbacks
  message:              { icon: "ti-message-circle",   color: "#c4745a" },
  session:              { icon: "ti-check",             color: "#4a6741" },
  review:               { icon: "ti-star",              color: "#f59e0b" },
};

export default function NotificationBanner() {
  const { currentUser } = useAuth();
  const [visible, setVisible] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, snap => {
      const notes = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (notes.length > 0) {
        setVisible(notes[0]);
        setQueue(notes);

        // Mark all as read after 4 seconds
        setTimeout(async () => {
          setVisible(null);
          try {
            await Promise.all(
              snap.docs.map(d => updateDoc(doc(db, "notifications", d.id), { read: true }))
            );
          } catch(e) { console.error(e); }
        }, 4000);
      }
    });

    return unsub;
  }, [currentUser]);

  async function dismiss() {
    if (!visible) return;
    setVisible(null);
    try {
      await updateDoc(doc(db, "notifications", visible.id), { read: true });
    } catch(e) { console.error(e); }
  }

  if (!visible) return null;

  const cfg = TYPE_CONFIG[visible.type] || TYPE_CONFIG.message;

  return (
    <div style={{
      position: "fixed",
      top: "max(16px, env(safe-area-inset-top))",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "var(--bg-card)",
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      border: `1px solid ${cfg.color}22`,
      maxWidth: 360,
      width: "calc(100% - 32px)",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      animation: "slideDown 0.25s ease",
    }}>
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: `${cfg.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, color: cfg.color }} aria-hidden="true"></i>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
          {visible.title}
        </div>
        {visible.body && (
          <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {visible.body}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 2 }}
        aria-label="Dismiss"
      >✕</button>
    </div>
  );
}
