import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";
import { SkeletonList } from "../components/SkeletonLoader";

export default function Following() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (currentUser?.uid) loadFollowing();
  }, [currentUser]);

  async function loadFollowing() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "follows"), where("followerId", "==", currentUser.uid))
      );
      const follows = snap.docs.map(d => ({ followId: d.id, ...d.data() }));

      // Load stylist profiles
      const withProfiles = await Promise.all(
        follows.map(async f => {
          try {
            const stylistSnap = await getDoc(doc(db, "users", f.stylistId));
            const stylist = stylistSnap.exists() ? stylistSnap.data() : null;
            return { ...f, stylist };
          } catch (e) { return { ...f, stylist: null }; }
        })
      );
      setFollowing(withProfiles.filter(f => f.stylist));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function unfollow(followId, stylistName) {
    try {
      await deleteDoc(doc(db, "follows", followId));
      setFollowing(prev => prev.filter(f => f.followId !== followId));
      setToast(`Unfollowed ${stylistName}`);
    } catch (e) { setToast("Failed to unfollow. Try again."); }
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" onClick={() => nav("/home")} style={{ cursor: "pointer" }}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        <span className="badge" style={{ background: "var(--pink-light)", color: "var(--pink-dark)" }}>
          {following.length} following
        </span>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Following</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Stylists you follow. Stay updated on their work and availability.
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : following.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Not following anyone yet</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                Find a stylist you love and tap Follow on their profile
              </div>
              <button className="btn-pink" onClick={() => nav("/find-stylist")} style={{ width: "auto", padding: "10px 24px" }}>
                Find stylists
              </button>
            </div>
          ) : following.map(f => (
            <div key={f.followId} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  className="avatar"
                  onClick={() => nav(`/stylist/${f.stylistId}`)}
                  style={{ width: 52, height: 52, background: "var(--pink-light)", color: "var(--pink-dark)", fontSize: 16, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
                >
                  {f.stylist?.photoUrl
                    ? <img src={f.stylist.photoUrl} alt={f.stylist.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : f.stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => nav(`/stylist/${f.stylistId}`)} >
                  <div style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{f.stylist?.name}</div>
                  {f.stylist?.username && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>@{f.stylist.username}</div>}
                  {f.stylist?.specialty && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.stylist.specialty}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.stylist?.availabilityEnabled ? "var(--success)" : "#d1d5db", display: "inline-block" }}></span>
                    <span style={{ fontSize: 11, color: f.stylist?.availabilityEnabled ? "var(--success)" : "var(--text-tertiary)" }}>
                      {f.stylist?.availabilityEnabled ? "Available now" : "Offline"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => nav(`/chat/${f.stylistId}`)}
                    className="btn-pink btn-sm"
                    style={{ fontSize: 11 }}
                  >
                    Message
                  </button>
                  <button
                    onClick={() => unfollow(f.followId, f.stylist?.name)}
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 10px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontFamily: "inherit" }}
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="account" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
