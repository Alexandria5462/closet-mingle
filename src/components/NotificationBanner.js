import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function NotificationBanner() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, snap => {
      const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (notes.length > 0) {
        setNotifications(notes);
        setVisible(notes[0]);
        // Auto dismiss after 4 seconds
        setTimeout(() => setVisible(null), 4000);
      }
    });
    return unsub;
  }, [currentUser]);

  async function dismiss(note) {
    setVisible(null);
    try {
      await updateDoc(doc(db, "notifications", note.id), { read: true });
    } catch (e) { console.error(e); }
  }

  if (!visible) return null;

  const icons = {
    message: "💬",
    session: "✅",
    tip: "💝",
    review: "⭐",
    system: "📢",
  };

  return (
    <div style={{
      position: "fixed", top: "max(14px, env(safe-area-inset-top))", left: "50%",
      transform: "translateX(-50%)", zIndex: 9999,
      background: "var(--bg-card)", borderRadius: 14,
      padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      border: "0.5px solid var(--border)", maxWidth: 360, width: "calc(100% - 32px)",
      display: "flex", alignItems: "center", gap: 10, animation: "slideDown 0.3s ease",
    }}>
      <span style={{ fontSize: 20 }}>{icons[visible.type] || "📢"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{visible.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{visible.body}</div>
      </div>
      <button onClick={() => dismiss(visible)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 18 }}>×</button>
    </div>
  );
}
