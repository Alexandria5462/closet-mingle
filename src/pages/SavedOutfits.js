import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

export default function SavedOutfits() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const isFreeAccount = !userProfile?.subscriptionTier || userProfile?.subscriptionTier === "free";
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (userProfile?.uid) fetchOutfits();
  }, [userProfile]);

  async function fetchOutfits() {
    setLoading(true);
    try {
      const q = query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const now = new Date();
      const valid = [];
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        // Only expire saved outfits for free accounts
        if (isFreeAccount && data.expiresAt && new Date(data.expiresAt) < now) {
          await deleteDoc(doc(db, "savedOutfits", d.id)).catch(() => {});
        } else {
          valid.push(data);
        }
      }
      // Sort by savedAt newest first, then sort outfit numbers within same name
      valid.sort((a, b) => {
        // Extract number from outfit name e.g. "Dinner Night Look 2" → 2
        const getNum = name => {
          const match = (name || "").match(/(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        };
        // First sort by base name (without trailing number)
        const baseName = name => (name || "").replace(/\s*\d+$/, "").trim();
        const baseA = baseName(a.outfitName);
        const baseB = baseName(b.outfitName);
        if (baseA === baseB) {
          // Same base name — sort by number ascending (1, 2, 3)
          return getNum(a.outfitName) - getNum(b.outfitName);
        }
        // Different base names — sort by savedAt newest first
        return new Date(b.savedAt) - new Date(a.savedAt);
      });
      setOutfits(valid);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function deleteOutfit(id) {
    try {
      await deleteDoc(doc(db, "savedOutfits", id));
      setOutfits(prev => prev.filter(o => o.id !== id));
      setToast("Outfit removed.");
    } catch (e) { console.error(e); }
  }

  function getTimeLeft(expiresAt) {
    if (!expiresAt) return "";
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `Expires in ${h}h ${m}m`;
    return `Expires in ${m}m`;
  }

  function getExpiryColor(expiresAt) {
    if (!expiresAt) return "var(--text-tertiary)";
    const hours = (new Date(expiresAt) - new Date()) / 3600000;
    if (hours < 2) return "#dc2626";
    if (hours < 6) return "#d97706";
    return "var(--success)";
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
        </div>
        <span className="badge badge-pink">{outfits.length} saved</span>
      </div>

      <div className="screen">
        <div className="body">
          {/* 24hr warning — free accounts only */}
          {isFreeAccount && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", display: "flex", gap: 8 }}>
              <span>⏰</span>
              <span>Outfits expire after <strong>24 hours</strong>. Screenshot your favorites to keep them!</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading saved outfits...</div>
          ) : outfits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💗</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No saved outfits yet</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Generate outfits from your liked items and save your favorites</div>
              <button className="btn-pink" onClick={() => nav("/outfits")} style={{ width: "auto", padding: "10px 24px" }}>
                Start Swiping →
              </button>
            </div>
          ) : outfits.map(outfit => (
            <div key={outfit.id} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "12px 14px 8px", borderBottom: "0.5px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{outfit.outfitName || "Saved Outfit"}</div>
                  <button onClick={() => deleteOutfit(outfit.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 18 }}>×</button>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {outfit.occasion && <span className="badge badge-pink" style={{ fontSize: 10 }}>{outfit.occasion}</span>}
                  {isFreeAccount && (
                    <span style={{ fontSize: 11, color: getExpiryColor(outfit.expiresAt), fontWeight: 500 }}>{getTimeLeft(outfit.expiresAt)}</span>
                  )}
                </div>
              </div>

              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 10 }}>
                  {(outfit.itemImages || []).map((img, i) => (
                    <div key={i} style={{ flexShrink: 0 }}>
                      {img
                        ? <img src={img} alt={outfit.itemNames?.[i]} style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "0.5px solid var(--border)", background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 8px 8px" }} />
                        : <div style={{ width: 72, height: 72, borderRadius: 10, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👗</div>
                      }
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", textAlign: "center", marginTop: 2, textTransform: "capitalize" }}>{outfit.categories?.[i]}</div>
                    </div>
                  ))}
                </div>

                {outfit.colorStory && (
                  <div style={{ background: "var(--pink-light)", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontSize: 12, color: "var(--pink-dark)" }}>
                    🎨 {outfit.colorStory}
                  </div>
                )}
                {outfit.styleNote && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>✨ {outfit.styleNote}</div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>
                  Saved {new Date(outfit.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="saved" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
