import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

    // Live unread messages badge — filter by participants so the rule permits the read
    const unsubMsgs = onSnapshot(
      query(collection(db, "messages"), where("participants", "array-contains", currentUser.uid)),
      (snap) => {
        let unread = 0;
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.senderId !== currentUser.uid && !data.read) unread++;
        });
        setBadges(prev => {
          const next = { ...prev };
          if (type === "stylist") {
            if (unread > 0) next.messages = unread; else delete next.messages;
          } else {
            if (unread > 0) next.account = unread; else delete next.account;
          }
          return next;
        });
      },
      (err) => {
        // permission-denied fires briefly during sign-out as the listener
        // unmounts — that's expected and harmless, so don't log it.
        if (err?.code !== "permission-denied") {
          console.error("TabBar unread listener error:", err);
        }
      }
    );

    // Live unread notifications badge (home tab)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const unsubNotifs = onSnapshot(
      query(
        collection(db, "notifications"),
        where("userId", "==", currentUser.uid),
        where("read", "==", false)
      ),
      (snap) => {
        const recent = snap.docs.filter(d => (d.data().createdAt || "") > cutoff).length;
        setBadges(prev => {
          const next = { ...prev };
          if (recent > 0) next.home = recent; else delete next.home;
          return next;
        });
      },
      () => {} // ignore errors silently
    );

    return () => { unsubMsgs(); unsubNotifs(); };
  }, [currentUser, type]);

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
            {badges[t.id] > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -8,
                background: "#e53935", color: "white",
                borderRadius: "50%", minWidth: 16, height: 16,
                fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", lineHeight: 1,
                border: "1.5px solid var(--bg)", boxSizing: "border-box",
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