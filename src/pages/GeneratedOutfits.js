import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";
import ShareOutfit from "../components/ShareOutfit";

const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];

function normalizeCategory(cat) {
  if (!cat) return "other";
  const c = cat.toLowerCase().trim();
  if (["tops","top","shirt","blouse","tee","tank","sweater","crop"].some(x => c.includes(x))) return "tops";
  if (["outerwear","jacket","coat","blazer","hoodie","cardigan"].some(x => c.includes(x))) return "outerwear";
  if (["bottoms","bottom","pant","pants","jean","jeans","skirt","shorts","legging"].some(x => c.includes(x))) return "bottoms";
  if (["dresses","dress","romper","jumpsuit"].some(x => c.includes(x))) return "dresses";
  if (["shoes","shoe","boot","boots","sneaker","heel","sandal","loafer"].some(x => c.includes(x))) return "shoes";
  if (["accessories","accessory","bag","purse","belt","scarf","hat","necklace","earring"].some(x => c.includes(x))) return "accessories";
  return c;
}

async function generateOutfitsFromLiked(likedItems, occasion) {
  try {
    const response = await fetch("/api/generate-outfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: likedItems, occasion }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const apiOutfits = data.outfits || [];
    return apiOutfits.map(outfit => ({
      outfitName: outfit.outfitName,
      colorStory: outfit.colorStory,
      patternNote: outfit.patternNote,
      styleNote: outfit.styleNote,
      colorHarmony: outfit.colorHarmony,
      items: (outfit.selectedIds || [])
        .map(id => likedItems.find(i => i.id === id || i.itemId === id))
        .filter(Boolean),
    })).filter(o => o.items.length >= 2);
  } catch (e) {
    console.error("Generation error:", e);
    return [];
  }
}

// ── Name outfit modal ─────────────────────────────────────────
function NameOutfitModal({ outfit, onSave, onCancel }) {
  const [outfitName, setOutfitName] = useState(outfit.outfitName || "");
  const [dayOfWeek, setDayOfWeek] = useState("");

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Name your outfit</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>Give this outfit a custom name or keep the AI suggestion</div>
        <input className="input-field" value={outfitName} onChange={e => setOutfitName(e.target.value)} placeholder="e.g. Monday Work Look, Date Night Vibes..." maxLength={50} />
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", textAlign: "right", marginTop: -8, marginBottom: 12 }}>{outfitName.length}/50</div>

        {/* Day of week — optional */}
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>
          📅 Plan to wear this on... <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>(optional)</span>
        </div>
        <select
          className="input-field"
          value={dayOfWeek}
          onChange={e => setDayOfWeek(e.target.value)}
          style={{ marginBottom: 14, cursor: "pointer" }}
        >
          <option value="">No specific day</option>
          {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-outline btn-sm" onClick={onCancel} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button className="btn-pink btn-sm" onClick={() => onSave(outfitName || outfit.outfitName, dayOfWeek)} disabled={!outfitName.trim()} style={{ flex: 1 }}>
            Save outfit 💗
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GeneratedOutfits() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [likedItems, setLikedItems] = useState([]);
  const [occasion, setOccasion] = useState("Casual");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const [error, setError] = useState("");
  const [namingOutfit, setNamingOutfit] = useState(null); // outfit index being named
  const [sharingOutfit, setSharingOutfit] = useState(null); // outfit being shared

  // Determine expiry based on tier
  const isFreeAccount = !userProfile?.subscriptionTier || userProfile?.subscriptionTier === "free";
  const isPremiumPlus = userProfile?.subscriptionTier === "premium_plus";

  function getExpiryDate() {
    if (isFreeAccount) return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    if (isPremiumPlus) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return null; // Monthly — no expiry
  }

  useEffect(() => {
    if (userProfile?.uid) loadAndGenerate();
  }, [userProfile]);

  async function loadAndGenerate() {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "likedItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const now = new Date();
      const valid = [];
      for (const d of snap.docs) {
        const data = { id: d.id, ...d.data() };
        if (data.expiresAt && new Date(data.expiresAt) < now) {
          await deleteDoc(doc(db, "likedItems", d.id)).catch(() => {});
        } else {
          valid.push(data);
        }
      }
      setLikedItems(valid);
      if (valid.length >= 2) await generateNew(valid, "Casual");
      else setError("You need at least 2 liked items to generate outfits. Go back and like more items.");
    } catch (e) {
      console.error("Load error:", e);
      setError("Error loading your liked items. Please try again.");
    }
    setLoading(false);
  }

  async function generateNew(items, occ) {
    const itemsToUse = items || likedItems;
    if (itemsToUse.length < 2) return;
    setGenerating(true);
    setError("");
    setSavedIds(new Set());
    const generated = await generateOutfitsFromLiked(itemsToUse, occ || occasion);
    setOutfits(generated);
    if (generated.length === 0) setError("Could not generate outfits. Make sure you have liked tops and bottoms or a dress.");
    setGenerating(false);
  }

  async function saveOutfit(outfit, index, customName, dayOfWeek = "") {
    try {
      const expiryDate = getExpiryDate();
      await addDoc(collection(db, "savedOutfits"), {
        userId: userProfile.uid,
        itemIds: outfit.items.map(i => i.id || i.itemId || ""),
        itemNames: outfit.items.map(i => i.name || ""),
        itemImages: outfit.items.map(i => i.imageUrl || ""),
        categories: outfit.items.map(i => i.category || ""),
        colorStory: outfit.colorStory || "",
        patternNote: outfit.patternNote || "",
        styleNote: outfit.styleNote || "",
        outfitName: customName || outfit.outfitName || "Saved Outfit",
        dayOfWeek: dayOfWeek || null,
        colorHarmony: outfit.colorHarmony || "",
        dayOfWeek: dayOfWeek || "",
        occasion,
        savedAt: new Date().toISOString(),
        expiresAt: expiryDate ? expiryDate.toISOString() : null,
      });
      setSavedIds(prev => new Set([...prev, index]));
      const expiryMsg = isFreeAccount ? "Expires in 24 hours." : isPremiumPlus ? "Saved for 7 days." : "Saved — no expiry.";
      setToast(`💗 Outfit saved! ${expiryMsg}`);
    } catch (e) {
      console.error("Save error:", e);
      setToast("Failed to save. Please try again.");
    }
  }

  const harmonyBg = {
    complementary: "#dbeafe",
    analogous: "#d1fae5",
    neutral: "#f9fafb",
    monochromatic: "#fce7f3",
  };

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav("/liked")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
            Closet<span>Mingle</span>
          </div>
        </div>
        <span className="badge badge-pink">✨ AI Outfits</span>
      </div>

      <div className="screen">
        <div className="body">

          {/* Occasion selector */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => { setOccasion(o); generateNew(likedItems, o); }} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
                background: occasion === o ? "var(--pink)" : "var(--bg-card)",
                borderColor: occasion === o ? "var(--pink)" : "var(--border)",
                color: occasion === o ? "white" : "var(--text-secondary)"
              }}>{o}</button>
            ))}
          </div>

          {/* Based on liked items */}
          {likedItems.length > 0 && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Based on your {likedItems.length} liked items</span>
              <button onClick={() => nav("/liked")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink)", fontSize: 12, fontWeight: 500 }}>Edit liked →</button>
            </div>
          )}

          {/* Expiry info */}
          {isFreeAccount && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
              ⏰ Free plan — saved outfits expire in <strong>24 hours</strong>. <span style={{ color: "var(--pink)", cursor: "pointer", textDecoration: "underline" }} onClick={() => nav("/plans")}>Upgrade to keep longer</span>
            </div>
          )}
          {isPremiumPlus && (
            <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#065f46" }}>
              ✅ Premium Plus — your saved outfits stay for <strong>7 days</strong>
            </div>
          )}

          {/* Regenerate button */}
          {!loading && !generating && outfits.length > 0 && (
            <button className="btn-outline" onClick={() => generateNew(likedItems, occasion)} style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              🔄 Regenerate new combinations
            </button>
          )}

          {/* Loading */}
          {(loading || generating) && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                {loading ? "Loading your liked items..." : "AI is building your outfits..."}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Analyzing colors, patterns and materials</div>
            </div>
          )}

          {/* Error */}
          {!loading && !generating && error && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Could not generate outfits</div>
              <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "12px 14px", fontSize: 13, color: "var(--pink-dark)", marginBottom: 20, textAlign: "left" }}>{error}</div>
              <button className="btn-pink" onClick={() => nav("/liked")} style={{ width: "auto", padding: "10px 24px" }}>← Back to liked items</button>
            </div>
          )}

          {/* Generated outfits */}
          {!loading && !generating && !error && outfits.map((outfit, index) => (
            <div key={index} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>

              {/* Header */}
              <div style={{ padding: "14px 14px 10px", background: harmonyBg[outfit.colorHarmony] || "var(--bg)" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{outfit.outfitName}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="badge badge-pink" style={{ fontSize: 10 }}>{occasion}</span>
                  {outfit.colorHarmony && (
                    <span style={{ fontSize: 10, background: "rgba(255,255,255,0.7)", borderRadius: 20, padding: "2px 8px", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                      {outfit.colorHarmony} palette
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: "12px 14px 8px" }}>
                {/* Item photos */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
                  {outfit.items.map((item, i) => (
                    <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                            style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "0.5px solid var(--border)", background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 8px 8px" }} />
                        : <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👗</div>
                      }
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 3, textTransform: "capitalize", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.category}</div>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{item.attributes?.primaryColor}</div>
                    </div>
                  ))}
                </div>

                {outfit.colorStory && (
                  <div style={{ background: "var(--pink-light)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "var(--pink-dark)" }}>
                    🎨 <strong>Color story:</strong> {outfit.colorStory}
                  </div>
                )}
                {outfit.patternNote && (
                  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                    🔲 <strong>Patterns:</strong> {outfit.patternNote}
                  </div>
                )}
                {outfit.styleNote && (
                  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                    ✨ <strong>Why it works:</strong> {outfit.styleNote}
                  </div>
                )}

                {/* Action buttons */}
                {savedIds.has(index) ? (
                  <div style={{ textAlign: "center", padding: 10, fontSize: 14, color: "var(--success)", fontWeight: 500 }}>
                    ✅ Saved! <span style={{ color: "var(--pink)", cursor: "pointer", textDecoration: "underline" }} onClick={() => nav("/saved")}>View in Saved →</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-pink" onClick={() => setNamingOutfit({ outfit, index })} style={{ flex: 1 }}>
                      💗 Save this outfit
                    </button>
                    <button
                      onClick={() => setSharingOutfit({ ...outfit, itemImages: outfit.items.map(i => i.imageUrl || "") })}
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", cursor: "pointer", fontSize: 14 }}
                      aria-label="Share"
                    >
                      <i className="ti ti-share" aria-hidden="true"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* View saved button */}
          {savedIds.size > 0 && (
            <button className="btn-outline" onClick={() => nav("/saved")} style={{ marginBottom: 20 }}>
              🔖 View all saved outfits
            </button>
          )}

        </div>
      </div>

      <TabBar active="outfits" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}

      {/* Name outfit modal */}
      {namingOutfit && (
        <NameOutfitModal
          outfit={namingOutfit.outfit}
          onSave={(name, day) => { saveOutfit(namingOutfit.outfit, namingOutfit.index, name, day); setNamingOutfit(null); }}
          onCancel={() => setNamingOutfit(null)}
        />
      )}

      {/* Share outfit modal */}
      {sharingOutfit && (
        <ShareOutfit outfit={sharingOutfit} onClose={() => setSharingOutfit(null)} />
      )}
    </>
  );
}
