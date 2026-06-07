import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

export default function LikedItems() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const isFreeAccount = !userProfile?.subscriptionTier || userProfile?.subscriptionTier === "free";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [canGenerate, setCanGenerate] = useState(false);
  const [missingMessage, setMissingMessage] = useState("");

  useEffect(() => {
    if (userProfile?.uid) fetchLikedItems();
  }, [userProfile]);

  async function fetchLikedItems() {
    setLoading(true);
    try {
      const q = query(collection(db, "likedItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const now = new Date();
      const valid = [];
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        // Only expire items for free accounts
        if (isFreeAccount && data.expiresAt && new Date(data.expiresAt) < now) {
          await deleteDoc(doc(db, "likedItems", d.id)).catch(() => {});
        } else {
          valid.push(data);
        }
      }
      valid.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
      setItems(valid);
      checkCombo(valid);
    } catch (err) {
      console.error("Liked items load error:", err);
      setToast("Error loading liked items. Please refresh.");
    }
    setLoading(false);
  }

  function checkCombo(liked) {
    const tops = liked.filter(i => i.category === "tops" || i.category === "outerwear");
    const bottoms = liked.filter(i => i.category === "bottoms");
    const dresses = liked.filter(i => i.category === "dresses");
    const can = (tops.length > 0 && bottoms.length > 0) || dresses.length > 0;
    setCanGenerate(can);
    if (!can) {
      if (liked.length === 0) setMissingMessage("You have not liked any items yet. Go back and swipe!");
      else if (tops.length === 0 && dresses.length === 0) setMissingMessage("Like at least one top or dress to generate outfits.");
      else if (bottoms.length === 0 && dresses.length === 0) setMissingMessage("Like at least one bottom or dress to complete an outfit.");
      else setMissingMessage("Keep liking items to build your outfit.");
    } else {
      setMissingMessage("");
    }
  }

  async function removeItem(itemId) {
    try {
      await deleteDoc(doc(db, "likedItems", itemId));
      const updated = items.filter(i => i.id !== itemId);
      setItems(updated);
      checkCombo(updated);
      setToast("Item removed from liked.");
    } catch (e) { console.error(e); }
  }

  function getTimeLeft(expiresAt) {
    if (!expiresAt) return "";
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
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
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => nav(-1)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize:20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor:"pointer" }} onClick={() => nav("/home")}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
        <span className="badge badge-pink">{items.length} liked</span>
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
            <div style={{ background:"#fff8e7", border:"1px solid #fcd34d", borderRadius:"var(--radius)", padding:"10px 14px", marginBottom:14, fontSize:12, color:"#92400e", display:"flex", gap:8, alignItems:"center" }}>
              <span>⏰</span>
              <span>Liked items expire after <strong>24 hours</strong>. Generate your outfits before they disappear!</span>
            </div>
          )}

          {canGenerate ? (
            <button className="btn-pink" onClick={() => nav("/generated")} style={{ marginBottom:16 }}>
              Generate AI Outfits from Liked Items
            </button>
          ) : (
            <div style={{ background:"var(--pink-light)", border:"1px solid #f4c0d1", borderRadius:"var(--radius)", padding:"12px 14px", marginBottom:16, fontSize:13, color:"var(--pink-dark)" }}>
              ⚠️ {missingMessage || "Keep liking items to build your outfit."}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"var(--text-tertiary)" }}>Loading liked items...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💗</div>
              <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>No liked items yet</div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:20 }}>Go back and swipe right on items you love</div>
              <button className="btn-pink" onClick={() => nav("/outfits")} style={{ width:"auto", padding:"10px 24px" }}>
                Start Swiping →
              </button>
            </div>
          ) : (
            <>
              {/* Category breakdown */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                {["tops","bottoms","dresses","shoes","accessories","outerwear"].map(cat => {
                  const count = items.filter(i => i.category === cat).length;
                  if (!count) return null;
                  return (
                    <span key={cat} style={{ fontSize:11, background:"var(--bg)", borderRadius:20, padding:"3px 12px", border:"0.5px solid var(--border)", color:"var(--text-secondary)", textTransform:"capitalize" }}>
                      {cat}: {count}
                    </span>
                  );
                })}
              </div>

              {/* Items grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10 }}>
                {items.map(item => (
                  <div key={item.id} style={{ background:"var(--bg-card)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden", position:"relative" }}>
                    <div style={{ aspectRatio:"1", background:"repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 10px 10px", overflow:"hidden" }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name}
                            onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                            style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>👗</div>
                      }
                    </div>
                    <button onClick={() => removeItem(item.id)} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:22, height:22, color:"white", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                      <div style={{ fontSize:10, color:"var(--text-secondary)", textTransform:"capitalize", marginTop:1 }}>{item.category}</div>
                      {item.attributes?.primaryColor && (
                        <div style={{ fontSize:10, color:"var(--text-tertiary)", textTransform:"capitalize" }}>{item.attributes.primaryColor} · {item.attributes.pattern}</div>
                      )}
                      {isFreeAccount && (
                        <div style={{ fontSize:10, color:getExpiryColor(item.expiresAt), marginTop:3, fontWeight:500 }}>
                          ⏰ {getTimeLeft(item.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
      <TabBar active="liked" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
