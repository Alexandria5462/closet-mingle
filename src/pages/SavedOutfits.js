import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
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
  const [dayFilter, setDayFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDay, setEditDay] = useState("");
  const DAYS = ["No specific day", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [activeSearch, setActiveSearch] = useState("");
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

  async function saveEdit(id) {
    try {
      await updateDoc(doc(db, "savedOutfits", id), {
        outfitName: editName.trim() || "Untitled",
        dayOfWeek: editDay,
      });
      setOutfits(prev => prev.map(o =>
        o.id === id ? { ...o, outfitName: editName.trim() || "Untitled", dayOfWeek: editDay } : o
      ));
      setEditingId(null);
    } catch(e) { console.error(e); }
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
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}><em>closet</em><span>mingle</span></div>
        </div>
        <span className="badge badge-pink">{outfits.length} saved</span>
      </div>

      <div className="screen">
        <div className="body">
          {/* Watermark notice for free accounts */}
          {isFreeAccount && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "6px 12px", marginBottom: 10, fontSize: 11, color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>📸 Screenshots include a ClosetMingle watermark on Free plan</span>
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => window.location.href="/plans"}>Upgrade</span>
            </div>
          )}

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
          ) : (
            <>
              {/* Search by outfit name */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
                  <input
                    className="input-field"
                    placeholder="Search by outfit name..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      // Clear results if search is cleared
                      if (e.target.value === "") setActiveSearch("");
                    }}
                    onKeyDown={e => e.key === "Enter" && setActiveSearch(search)}
                    style={{ paddingLeft: 36, marginBottom: 0 }}
                  />
                </div>
                <button
                  onClick={() => setActiveSearch(search)}
                  style={{ background: "var(--pink)", border: "none", borderRadius: "var(--radius-sm)", padding: "0 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", flexShrink: 0 }}
                >
                  Search
                </button>
              </div>
              {activeSearch && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  Showing results for <strong>"{activeSearch}"</strong>
                  <button onClick={() => { setSearch(""); setActiveSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 12 }}>× Clear</button>
                </div>
              )}

              {/* Plan your week */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Plan your week</div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                  {[["All","All"],["Mon","Monday"],["Tue","Tuesday"],["Wed","Wednesday"],["Thu","Thursday"],["Fri","Friday"],["Sat","Saturday"],["Sun","Sunday"]].map(([short, full]) => (
                    <button key={short} onClick={() => setDayFilter(full)} style={{
                      padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${dayFilter === full ? "var(--pink)" : "var(--border)"}`,
                      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                      background: dayFilter === full ? "var(--pink)" : "var(--bg-card)",
                      color: dayFilter === full ? "white" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}>{short}</button>
                  ))}
                </div>
              </div>
              {outfits.filter(o => dayFilter === "All" || (o.dayOfWeek || "") === dayFilter).length === 0 && dayFilter !== "All" && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>No outfits planned for {dayFilter}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Assign an outfit to {dayFilter} when saving it</div>
                </div>
              )}
              {outfits
                .filter(o => dayFilter === "All" || (o.dayOfWeek || "") === dayFilter)
                .filter(o => !activeSearch || (o.outfitName || "").toLowerCase().includes(activeSearch.toLowerCase()))
                .map(outfit => (
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
                    {outfit.colorStory}
                  </div>
                )}
                {outfit.styleNote && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{outfit.styleNote}</div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>
                  Saved {new Date(outfit.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
              ))}
            </>
          )}
        </div>
      </div>


          {/* Watermark for free accounts — shows on screenshots */}
          {isFreeAccount && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 50,
              pointerEvents: "none", overflow: "hidden",
            }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  top: `${10 + i * 13}%`,
                  left: "-20%",
                  width: "140%",
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(212,83,126,0.07)",
                  transform: "rotate(-30deg)",
                  letterSpacing: 2,
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}>
                  ClosetMingle Free Plan · Upgrade to remove watermark ·&nbsp;
                </div>
              ))}
            </div>
          )}
      <TabBar active="saved" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
