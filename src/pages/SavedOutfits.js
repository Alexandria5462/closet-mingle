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
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function fetchOutfits() {
      if (!userProfile?.uid) return;
      setLoading(true);
      const q = query(
        collection(db, "savedOutfits"),
        where("userId", "==", userProfile.uid)
      );
      const snap = await getDocs(q);
      const now = new Date();
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter out expired outfits and delete them from Firebase
      const valid = [];
      for (const outfit of all) {
        if (outfit.expiresAt && new Date(outfit.expiresAt) < now) {
          // Delete expired outfit
          await deleteDoc(doc(db, "savedOutfits", outfit.id)).catch(() => {});
        } else {
          valid.push(outfit);
        }
      }

      // Sort newest first
      valid.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setOutfits(valid);
      setLoading(false);
    }
    fetchOutfits();
  }, [userProfile]);

  async function deleteOutfit(outfitId) {
    try {
      await deleteDoc(doc(db, "savedOutfits", outfitId));
      setOutfits(prev => prev.filter(o => o.id !== outfitId));
      setToast("Outfit removed.");
    } catch (e) { console.error(e); }
  }

  function getTimeLeft(expiresAt) {
    if (!expiresAt) return "";
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
    return `Expires in ${minutes}m`;
  }

  function getExpiryColor(expiresAt) {
    if (!expiresAt) return "var(--text-tertiary)";
    const diff = new Date(expiresAt) - new Date();
    const hours = diff / (1000 * 60 * 60);
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
          <div className="logo">Saved <span>Outfits</span></div>
        </div>
        <span className="badge badge-pink">{outfits.length} saved</span>
      </div>

      <div className="screen">
        <div className="body">

          {/* 24 hour warning */}
          <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", display: "flex", gap: 8, alignItems: "center" }}>
            <span>⏰</span>
            <span>Outfits expire after <strong>24 hours</strong>. Screenshot your favorites to keep them forever!</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading saved outfits...</div>
          ) : outfits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💗</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No saved outfits yet</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
                Go to the AI Outfit Builder and swipe right on outfits you love
              </div>
              <button className="btn-pink" onClick={() => nav("/outfits")} style={{ width: "auto", padding: "10px 24px" }}>
                <i className="ti ti-sparkles" aria-hidden="true"></i> Build Outfits
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {outfits.map(outfit => (
                <div key={outfit.id} className="card" style={{ padding: 0, overflow: "hidden" }}>

                  {/* Outfit header */}
                  <div style={{ padding: "12px 14px 8px", borderBottom: "0.5px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                        {outfit.outfitName || "Saved Outfit"}
                      </div>
                      <button onClick={() => deleteOutfit(outfit.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {outfit.occasion && (
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{outfit.occasion}</span>
                      )}
                      <span style={{ fontSize: 11, color: getExpiryColor(outfit.expiresAt), fontWeight: 500 }}>
                        {getTimeLeft(outfit.expiresAt)}
                      </span>
                    </div>
                  </div>

                  {/* Outfit items photos */}
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto", scrollbarWidth: "none" }}>
                      {(outfit.itemImages || []).map((img, i) => (
                        <div key={i} style={{ flexShrink: 0 }}>
                          {img ? (
                            <img
                              src={img}
                              alt={outfit.itemNames?.[i] || "item"}
                              style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "0.5px solid var(--border)", background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}
                            />
                          ) : (
                            <div style={{ width: 72, height: 72, borderRadius: 10, background: "var(--bg)", border: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👗</div>
                          )}
                          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textAlign: "center", marginTop: 3, textTransform: "capitalize", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {outfit.categories?.[i] || ""}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Item names */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: outfit.colorStory ? 8 : 0 }}>
                      {(outfit.itemNames || []).map((name, i) => (
                        <span key={i} style={{ fontSize: 11, background: "var(--bg)", borderRadius: 20, padding: "2px 8px", color: "var(--text-secondary)", border: "0.5px solid var(--border)" }}>
                          {name}
                        </span>
                      ))}
                    </div>

                    {/* Color story */}
                    {outfit.colorStory && (
                      <div style={{ fontSize: 12, color: "var(--pink-dark)", background: "var(--pink-light)", borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>
                        🎨 {outfit.colorStory}
                      </div>
                    )}

                    {/* Style note */}
                    {outfit.styleNote && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                        ✨ {outfit.styleNote}
                      </div>
                    )}
                  </div>

                  {/* Saved date */}
                  <div style={{ padding: "6px 14px 10px" }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      Saved {new Date(outfit.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar active="saved" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
