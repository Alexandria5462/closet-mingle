import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import Reviews from "../components/Reviews";
import TabBar from "../components/TabBar";
import { SkeletonList } from "../components/SkeletonLoader";

export default function StylistProfile() {
  const { stylistId } = useParams();
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [stylist, setStylist] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");

  const canChoose = userProfile?.subscriptionTier === "premium_plus";

  useEffect(() => {
    loadStylist();
  }, [stylistId]);

  async function loadStylist() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "users", stylistId));
      if (snap.exists()) setStylist(snap.data());

      // Load portfolio (saved outfits marked as portfolio)
      const portSnap = await getDocs(
        query(collection(db, "savedOutfits"),
          where("userId", "==", stylistId),
          where("isPortfolio", "==", true)
        )
      );
      setPortfolio(portSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Stylist profile error:", e);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <>
        <div className="header">
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}><em>closet</em><span>mingle</span></div>
        </div>
        <div className="screen"><div className="body"><SkeletonList count={3} /></div></div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  if (!stylist) {
    return (
      <>
        <div className="header">
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
        </div>
        <div className="screen">
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <div style={{ fontSize: 16 }}>Stylist not found</div>
          </div>
        </div>
        <TabBar active="stylists" type="client" />
      </>
    );
  }

  const initials = stylist.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "ST";
  const avgRating = stylist.rating || 0;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/stylist")}><em>closet</em><span>mingle</span></div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          {/* Profile header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="avatar" style={{ width: 80, height: 80, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 24, overflow: "hidden", margin: "0 auto 12px", border: "2px solid var(--border)" }}>
              {stylist.photoUrl
                ? <img src={stylist.photoUrl} alt={stylist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{stylist.name}</div>
              {stylist.isVerified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Verified</span>}
            </div>
            {stylist.username && (
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 4 }}>@{stylist.username}</div>
            )}
            {stylist.specialty && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{stylist.specialty}</div>}
            {stylist.city && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>📍 {stylist.city}</div>}
            {avgRating > 0 && (
              <div style={{ fontSize: 13, color: "#f59e0b", marginTop: 6 }}>
                {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                <span style={{ color: "var(--text-secondary)", marginLeft: 4 }}>({avgRating})</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, background: stylist.availabilityEnabled ? "#d1fae5" : "var(--bg)", border: `1px solid ${stylist.availabilityEnabled ? "#6ee7b7" : "var(--border)"}`, borderRadius: 20, padding: "2px 10px", color: stylist.availabilityEnabled ? "#065f46" : "var(--text-tertiary)" }}>
                {stylist.availabilityEnabled ? "🟢 Available now" : "⚫ Offline"}
              </span>
              {stylist.availabilityHours && (
                <span style={{ fontSize: 11, background: "var(--bg)", borderRadius: 20, padding: "2px 10px", border: "0.5px solid var(--border)", color: "var(--text-secondary)" }}>
                  🕐 {stylist.availabilityHours}
                </span>
              )}
            </div>
          </div>

          {/* Chat button */}
          <button className="btn-pink" onClick={() => nav(`/chat/${stylistId}`)} style={{ marginBottom: 8 }}>
            💬 {canChoose ? "Chat with this stylist" : "Start a session"}
          </button>
          {!canChoose && (
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginBottom: 14 }}>
              Upgrade to Premium Plus to personally choose your stylist
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, borderBottom: "0.5px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
            {["about", "portfolio", "reviews"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: activeTab === tab ? "var(--pink)" : "var(--text-secondary)", borderBottom: activeTab === tab ? "2px solid var(--pink)" : "none", paddingBottom: 4, textTransform: "capitalize" }}>
                {tab}
              </button>
            ))}
          </div>

          {/* About tab */}
          {activeTab === "about" && (
            <div>
              {stylist.about && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>About</div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{stylist.about}</div>
                </div>
              )}
              {stylist.yearsExperience && (
                <div className="card">
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Experience</div>
                  <div style={{ fontSize: 14 }}>{stylist.yearsExperience} year{stylist.yearsExperience !== 1 ? "s" : ""} of styling</div>
                </div>
              )}
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Stats</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{stylist.totalSessions || 0}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sessions</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{avgRating || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Avg rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio tab */}
          {activeTab === "portfolio" && (
            portfolio.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No uploads yet</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  This stylist hasn't added portfolio photos yet. Check back soon!
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {portfolio.map(item => (
                  <div key={item.id} style={{ background: "var(--bg-card)", borderRadius: "var(--radius)", overflow: "hidden", border: "0.5px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 4, padding: 6 }}>
                      {(item.itemImages || []).slice(0, 3).map((img, i) => (
                        img && <img key={i} src={img} alt="" style={{ flex: 1, height: 70, objectFit: "cover", borderRadius: 6 }} />
                      ))}
                    </div>
                    <div style={{ padding: "4px 8px 8px", fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>{item.outfitName}</div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <Reviews targetUserId={stylistId} targetUserName={stylist.name} />
          )}
        </div>
      </div>

      <TabBar active="stylists" type="client" />
    </>
  );
}
