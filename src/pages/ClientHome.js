import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import TabBar from "../components/TabBar";

export default function ClientHome() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [closetCount, setClosetCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const firstName = userProfile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isPremium = userProfile?.subscriptionTier === "monthly" || userProfile?.subscriptionTier === "session";

  useEffect(() => {
    if (!userProfile?.uid) return;
    async function fetchStats() {
      const cSnap = await getDocs(query(collection(db, "closetItems"), where("userId", "==", userProfile.uid)));
      setClosetCount(cSnap.size);
      const now = new Date();
      const oSnap = await getDocs(query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid)));
      const validOutfits = oSnap.docs.filter(d => {
        const data = d.data();
        return !data.expiresAt || new Date(data.expiresAt) > now;
      });
      setSavedCount(validOutfits.length);
    }
    fetchStats();
  }, [userProfile]);

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isPremium && <span className="badge badge-pink">Premium</span>}
          <div className="avatar" style={{ background: "var(--pink-light)", color: "var(--pink-dark)", width: 36, height: 36, fontSize: 13 }}>
            {userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>{greeting}, {firstName}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>What are we wearing today?</div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-label">Closet items</div><div className="stat-val">{closetCount}</div></div>
            <div className="stat-card"><div className="stat-label">Saved outfits</div><div className="stat-val">{savedCount}</div></div>
            <div className="stat-card"><div className="stat-label">Sessions</div><div className="stat-val">{isPremium ? "∞" : "0"}</div></div>
          </div>

          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/closet")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>My Closet</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{closetCount} items · Tap to manage</div>
              </div>
              <i className="ti ti-hanger" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/outfits")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>AI Outfit Builder</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Swipe to build outfits from your closet</div>
              </div>
              <i className="ti ti-sparkles" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          <div className="card" style={{ cursor: "pointer" }} onClick={() => nav("/saved")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Saved Outfits</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {savedCount > 0 ? `${savedCount} outfit${savedCount !== 1 ? "s" : ""} saved · Expires in 24hrs` : "No saved outfits yet"}
                </div>
              </div>
              <i className="ti ti-heart" style={{ fontSize: 22, color: "var(--pink)" }} aria-hidden="true"></i>
            </div>
          </div>

          <div className="card" style={{ cursor: "pointer" }} onClick={() => isPremium ? nav("/stylists") : nav("/plans")}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Talk to a Stylist</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {isPremium ? "Live stylists available now" : "Upgrade to chat with live stylists"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isPremium ? <><span className="online-dot"></span><span style={{ fontSize: 11, color: "var(--success)" }}>Live</span></> : <span className="badge badge-pink">Upgrade</span>}
                <i className="ti ti-arrow-right" style={{ color: "var(--text-tertiary)", marginLeft: 4 }} aria-hidden="true"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TabBar active="home" type="client" />
    </>
  );
}
