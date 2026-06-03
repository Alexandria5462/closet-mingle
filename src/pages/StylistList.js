import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";

export default function StylistList() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const tier = userProfile?.subscriptionTier;
  const canViewProfiles = tier === "monthly" || tier === "premium_plus" || tier === "session";
  const canChoose = tier === "premium_plus";
  const isPremium = canViewProfiles;

  useEffect(() => {
    if (isPremium) fetchStylists();
    else setLoading(false);
  }, []);

  async function fetchStylists() {
    const q = query(collection(db, "users"), where("accountType", "==", "stylist"), where("availabilityEnabled", "==", true));
    const snap = await getDocs(q);
    setStylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  if (!isPremium) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Upgrade to chat with stylists</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
              Get access to live personal stylists who can review your closet and build outfits with you.
            </div>
            <button className="btn-pink" style={{ width: "auto", padding: "12px 32px" }} onClick={() => nav("/plans")}>View plans</button>
          </div>
        </div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
      </div>
      <div className="screen">
        <div className="body">
          <div className="section-label">Available Stylists</div>

          {!canChoose && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#3730a3" }}>
              💡 Upgrade to <strong>Premium Plus</strong> to personally choose your stylist.
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Finding stylists...</div>
          ) : stylists.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>No stylists available right now. Check back soon!</div>
            </div>
          ) : stylists.map(s => (
            <div key={s.id} onClick={() => nav(`/chat/${s.id}`)} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className="avatar" style={{ width: 52, height: 52, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
                  {s.photoUrl
                    ? <img src={s.photoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : s.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                    {s.isVerified && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Verified</span>}
                  </div>
                  {s.specialty && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.specialty}</div>}
                  {s.city && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>📍 {s.city}</div>}
                  {s.rating > 0 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>
                      {"★".repeat(Math.round(s.rating))} <span style={{ color: "var(--text-tertiary)" }}>({s.rating})</span>
                    </div>
                  )}
                  {s.about && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.about}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="online-dot"></span>
                    <span style={{ fontSize: 11, color: "var(--success)" }}>Online</span>
                  </div>
                  {!canChoose && (
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", textAlign: "right" }}>Random assign</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="stylists" type="client" />
    </>
  );
}
