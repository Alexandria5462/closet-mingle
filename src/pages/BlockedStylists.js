import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

/**
 * BlockedStylists
 * Client-side equivalent of the stylist's BlockedUsers page.
 * Lists stylists THIS client has blocked, and lets them unblock.
 * Only shows blocks where blockedBy === "client" — a stylist-initiated
 * block is not this client's to manage and never appears here.
 */
export default function BlockedStylists() {
  const nav = useNavigate();
  const { currentUser } = useAuth();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (currentUser?.uid) load();
  }, [currentUser]);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "blockedUsers"), where("clientId", "==", currentUser.uid))
      );
      // Only blocks this client initiated themselves — a stylist's own
      // block of this client is not shown or manageable here.
      const ownBlocks = snap.docs.filter(d => d.data().blockedBy === "client");
      const items = await Promise.all(ownBlocks.map(async d => {
        const data = d.data();
        let user = null;
        try {
          const userSnap = await getDoc(doc(db, "users", data.stylistId));
          if (userSnap.exists()) user = userSnap.data();
        } catch(e) {}
        return { id: d.id, ...data, user };
      }));
      setBlocked(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function unblock(id, stylistName) {
    try {
      await deleteDoc(doc(db, "blockedUsers", id));
      setBlocked(prev => prev.filter(b => b.id !== id));
      setToast(`${stylistName} unblocked`);
    } catch(e) { setToast("Failed. Try again."); }
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
        <span className="badge" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}>
          {blocked.length} blocked
        </span>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Blocked Stylists</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Blocked stylists cannot message you, and you won't see them in search.
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTop: "3px solid var(--pink)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            </div>
          ) : blocked.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <i className="ti ti-shield-check" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No blocked stylists</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                You can block a stylist from their profile page
              </div>
            </div>
          ) : blocked.map(b => (
            <div key={b.id} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div className="avatar" style={{ width: 44, height: 44, background: "var(--avatar-bg)", color: "var(--pink-dark)", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
                {b.user?.photoUrl
                  ? <img src={b.user.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (b.user?.name || b.stylistName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{b.user?.name || b.stylistName || "Stylist"}</div>
                {b.user?.username && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>@{b.user.username}</div>}
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                  Blocked {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </div>
              </div>
              <button
                onClick={() => unblock(b.id, b.user?.name || b.stylistName || "Stylist")}
                style={{ padding: "6px 14px", background: "none", border: "1px solid var(--success)", borderRadius: 20, color: "var(--success)", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="account" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
