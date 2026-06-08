import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function TabBar({ active, type = "client" }) {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [badges, setBadges] = useState({});

  const clientTabs = [
    { id: "home",    icon: "ti-home",      label: "Home",    path: "/home" },
    { id: "closet",  icon: "ti-hanger",    label: "Closet",  path: "/closet" },
    { id: "outfits", icon: "ti-sparkles",  label: "Swipe",   path: "/outfits" },
    { id: "liked",   icon: "ti-heart",     label: "Liked",   path: "/liked" },
    { id: "saved",   icon: "ti-bookmark",  label: "Saved",   path: "/saved" },
    { id: "account", icon: "ti-user",      label: "Account", path: "/account" },
  ];

  const stylistTabs = [
    { id: "home",      icon: "ti-home",       label: "Home",      path: "/stylist" },
    { id: "messages",  icon: "ti-message",    label: "Messages",  path: "/stylist/messages" },
    { id: "clients",   icon: "ti-users",      label: "Clients",   path: "/stylist/clients" },
    { id: "analytics", icon: "ti-chart-bar",  label: "Analytics", path: "/stylist/analytics" },
    { id: "account",   icon: "ti-user",       label: "Profile",   path: "/account" },
  ];

  const tabs = type === "stylist" ? stylistTabs : clientTabs;

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadBadges();
  }, [currentUser, type]);

  async function loadBadges() {
    if (!currentUser?.uid) return;
    const newBadges = {};

    try {
      if (type === "stylist") {
        // ── Stylist: unread messages count ───────────────
        const msgSnap = await getDocs(collection(db, "messages"));
        let unreadMsgs = 0;
        msgSnap.docs.forEach(d => {
          const data = d.data();
          if (
            data.conversationId?.includes(currentUser.uid) &&
            data.senderId !== currentUser.uid &&
            !data.read
          ) unreadMsgs++;
        });
        if (unreadMsgs > 0) newBadges.messages = unreadMsgs;

        // ── Stylist: unread notifications ─────────────────
        const notifSnap = await getDocs(
          query(collection(db, "notifications"),
            where("userId", "==", currentUser.uid),
            where("read", "==", false)
          )
        );
        // Home badge removed - use Messages tab badge instead

      } else {
        // ── Client: unread messages from stylists ─────────
        const msgSnap = await getDocs(collection(db, "messages"));
        let unreadMsgs = 0;
        msgSnap.docs.forEach(d => {
          const data = d.data();
          if (
            data.conversationId?.includes(currentUser.uid) &&
            data.senderId !== currentUser.uid &&
            !data.read
          ) unreadMsgs++;
        });
        if (unreadMsgs > 0) newBadges.account = unreadMsgs;

        // ── Client: unread notifications ─────────────────
        const notifSnap = await getDocs(
          query(collection(db, "notifications"),
            where("userId", "==", currentUser.uid),
            where("read", "==", false)
          )
        );
        // Home badge removed - use Account tab badge instead
      }
    } catch(e) { console.error(e); }

    setBadges(newBadges);
  }

  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn${active === t.id ? " active" : ""}`}
          onClick={() => nav(t.path)}
          style={{ position: "relative" }}
        >
          <span style={{ position: "relative", display: "inline-block" }}>
            <i className={`ti ${t.icon}`} aria-hidden="true"></i>
            {/* Red notification badge */}
            {badges[t.id] > 0 && (
              <span style={{
                position: "absolute",
                top: -4,
                right: -8,
                background: "#e53935",
                color: "white",
                borderRadius: "50%",
                minWidth: 16,
                height: 16,
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                lineHeight: 1,
                border: "1.5px solid var(--bg)",
                boxSizing: "border-box",
              }}>
                {badges[t.id] > 99 ? "99+" : badges[t.id]}
              </span>
            )}
          </span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
