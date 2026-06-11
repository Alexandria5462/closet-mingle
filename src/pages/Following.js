import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";
import { SkeletonList } from "../components/SkeletonLoader";

export default function Following() {
  const nav = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const isStylist = userProfile?.accountType === "stylist";
  const [following,  setFollowing]  = useState([]);
  const [followers,  setFollowers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState("");

  useEffect(() => {
    if (!currentUser?.uid) return;
    if (isStylist) loadFollowers();
    else           loadFollowing();
  }, [currentUser, isStylist]);

  // Client: stylists they follow
  async function loadFollowing() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "follows"), where("followerId", "==", currentUser.uid))
      );
      const follows = snap.docs.map(d => ({ followId: d.id, ...d.data() }));
      const withProfiles = await Promise.all(
        follows.map(async f => {
          try {
            const s = await getDoc(doc(db, "users", f.stylistId));
            return { ...f, stylist: s.exists() ? s.data() : null };
          } catch(e) { return { ...f, stylist: null }; }
        })
      );
      setFollowing(withProfiles.filter(f => f.stylist));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  // Stylist: clients who follow them
  async function loadFollowers() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "follows"), where("stylistId", "==", currentUser.uid))
      );
      const follows = snap.docs.map(d => ({ followId: d.id, ...d.data() }));
      const withProfiles = await Promise.all(
        follows.map(async f => {
          try {
            const c = await getDoc(doc(db, "users", f.followerId));
            return { ...f, client: c.exists() ? c.data() : null };
          } catch(e) { return { ...f, client: null }; }
        })
      );
      setFollowers(withProfiles.filter(f => f.client));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function unfollow(followId, stylistName) {
    try {
      await deleteDoc(doc(db, "follows", followId));
      setFollowing(prev => prev.filter(f => f.followId !== followId));
      setToast(`Unfollowed ${stylistName}`);
    } catch(e) { setToast("Failed to unfollow. Try again."); }
  }

  const count = isStylist ? followers.length : following.length;

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
        <span className="badge" style={{ background: "var(--avatar-bg)", color: "var(--pink-dark)" }}>
          {count} {isStylist ? "follower" : "following"}{count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
            {isStylist ? "Your Followers" : "Following"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            {isStylist
              ? "Clients who follow your profile."
              : "Stylists you follow. Stay updated on their work and availability."}
          </div>

          {loading ? (
            <SkeletonList count={3} />

          ) : isStylist ? (
            // ── Stylist: show followers ──────────────────────────────
            followers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <i className="ti ti-users" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No followers yet</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Clients who follow your profile will appear here
                </div>
              </div>
            ) : followers.map(f => (
              <div key={f.followId} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar" onClick={() => nav(`/stylist/client/${f.followerId}`)}
                    style={{ width: 48, height: 48, fontSize: 15, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}>
                    {f.client?.photoUrl
                      ? <img src={f.client.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (f.client?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => nav(`/stylist/client/${f.followerId}`)}>
                    <div style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}>{f.client?.name || "Client"}</div>
                    {f.client?.username && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>@{f.client.username}</div>}
                    {f.client?.city    && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.client.city}</div>}
                  </div>
                  <button onClick={() => nav(`/stylist/chat/${f.followerId}`)} className="btn-pink btn-sm" style={{ fontSize: 11, flexShrink: 0 }}>
                    Message
                  </button>
                </div>
              </div>
            ))

          ) : (
            // ── Client: show who they follow ─────────────────────────
            following.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <i className="ti ti-cut" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
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
                  <div className="avatar" onClick={() => nav(`/stylist/${f.stylistId}`)}
                    style={{ width: 52, height: 52, fontSize: 16, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}>
                    {f.stylist?.photoUrl
                      ? <img src={f.stylist.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : f.stylist?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => nav(`/stylist/${f.stylistId}`)}>
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
                    <button onClick={() => nav(`/chat/${f.stylistId}`)} className="btn-pink btn-sm" style={{ fontSize: 11 }}>Message</button>
                    <button onClick={() => unfollow(f.followId, f.stylist?.name)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 10px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontFamily: "inherit" }}>
                      Unfollow
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TabBar active="account" type={isStylist ? "stylist" : "client"} />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
