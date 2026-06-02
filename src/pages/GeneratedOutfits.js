import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

// ── AI outfit generator using clothing attributes ─────────────
async function generateOutfitsFromLiked(likedItems, occasion) {
  try {
    const response = await fetch("/api/generate-outfit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: likedItems, occasion }),
    });
    if (!response.ok) {
      console.error("API route error:", await response.text());
      return [];
    }
    const data = await response.json();
    const outfits = data.outfits || [];
    return outfits.map(outfit => ({
      ...outfit,
      items: (outfit.selectedIds || [])
        .map(id => likedItems.find(i => (i.id === id || i.itemId === id)))
        .filter(Boolean)
    })).filter(o => o.items.length >= 2);
  } catch (e) {
    console.error("AI generation error:", e);
    return [];
  }
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

  const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];

  useEffect(() => { loadLikedAndGenerate(); }, [userProfile]);

  async function loadLikedAndGenerate() {
    if (!userProfile?.uid) return;
    setLoading(true);

    const q = query(collection(db, "likedItems"), where("userId", "==", userProfile.uid));
    const snap = await getDocs(q);
    const now = new Date();
    const valid = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => !d.expiresAt || new Date(d.expiresAt) > now);

    setLikedItems(valid);

    if (valid.length >= 2) {
      await generateNew(valid, occasion);
    }
    setLoading(false);
  }

  async function generateNew(items, occ) {
    setGenerating(true);
    const itemsToUse = items || likedItems;
    const occToUse = occ || occasion;
    const generated = await generateOutfitsFromLiked(itemsToUse, occToUse);
    setOutfits(generated);
    setSavedIds(new Set());
    setGenerating(false);
  }

  async function saveOutfit(outfit, index) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await addDoc(collection(db, "savedOutfits"), {
        userId: userProfile.uid,
        itemIds: outfit.items.map(i => i.id || i.itemId),
        itemNames: outfit.items.map(i => i.name),
        itemImages: outfit.items.map(i => i.imageUrl || ""),
        categories: outfit.items.map(i => i.category),
        colorStory: outfit.colorStory,
        patternNote: outfit.patternNote,
        styleNote: outfit.styleNote,
        outfitName: outfit.outfitName,
        colorHarmony: outfit.colorHarmony,
        occasion,
        savedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      setSavedIds(prev => new Set([...prev, index]));
      setToast("💗 Outfit saved! View it on the Saved page.");
    } catch (e) {
      console.error(e);
      setToast("Failed to save. Please try again.");
    }
  }

  const harmonyColors = {
    complementary: "#dbeafe",
    analogous: "#d1fae5",
    neutral: "#f3f4f6",
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

          {/* Based on liked items info */}
          <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Based on your {likedItems.length} liked items</span>
            <button onClick={() => nav("/liked")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink)", fontSize: 12, fontWeight: 500 }}>Edit liked →</button>
          </div>

          {/* Regenerate button */}
          {!loading && !generating && outfits.length > 0 && (
            <button className="btn-outline" onClick={() => generateNew(likedItems, occasion)} style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              🔄 Regenerate new outfits
            </button>
          )}

          {/* Loading / generating state */}
          {(loading || generating) && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>AI is building your outfits...</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Analyzing colors, patterns and materials from your liked items</div>
            </div>
          )}

          {/* No outfits generated */}
          {!loading && !generating && outfits.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Could not generate outfits</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Make sure you have liked tops and bottoms or a dress</div>
              <button className="btn-pink" onClick={() => nav("/liked")} style={{ width: "auto", padding: "10px 24px" }}>← Back to liked items</button>
            </div>
          )}

          {/* Generated outfits */}
          {!loading && !generating && outfits.map((outfit, index) => (
            <div key={index} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>

              {/* Outfit header */}
              <div style={{ padding: "14px 14px 10px", background: harmonyColors[outfit.colorHarmony] || "var(--bg)" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {outfit.outfitName}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="badge badge-pink" style={{ fontSize: 10 }}>{occasion}</span>
                  {outfit.colorHarmony && (
                    <span style={{ fontSize: 10, background: "rgba(255,255,255,0.7)", borderRadius: 20, padding: "2px 8px", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                      {outfit.colorHarmony} colors
                    </span>
                  )}
                </div>
              </div>

              {/* Item photos */}
              <div style={{ padding: "12px 14px 8px" }}>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12 }}>
                  {outfit.items.map((item, i) => (
                    <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name}
                            onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                            style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "0.5px solid var(--border)", background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 8px 8px" }} />
                        : <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👗</div>
                      }
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 3, textTransform: "capitalize", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.category}</div>
                      <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "capitalize", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.attributes?.primaryColor}</div>
                    </div>
                  ))}
                </div>

                {/* Color story */}
                {outfit.colorStory && (
                  <div style={{ background: "var(--pink-light)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "var(--pink-dark)" }}>
                    🎨 <strong>Color story:</strong> {outfit.colorStory}
                  </div>
                )}

                {/* Pattern note */}
                {outfit.patternNote && (
                  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                    🔲 <strong>Patterns:</strong> {outfit.patternNote}
                  </div>
                )}

                {/* Style note */}
                {outfit.styleNote && (
                  <div style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                    ✨ <strong>Style:</strong> {outfit.styleNote}
                  </div>
                )}

                {/* 24hr warning */}
                <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 10px", marginBottom: 10, fontSize: 11, color: "#92400e" }}>
                  ⏰ Saved outfits expire in 24 hours. Screenshot to keep forever!
                </div>

                {/* Save button */}
                {savedIds.has(index) ? (
                  <div style={{ textAlign: "center", padding: "10px", fontSize: 14, color: "var(--success)", fontWeight: 500 }}>
                    ✅ Saved! View in Saved Outfits
                  </div>
                ) : (
                  <button className="btn-pink" onClick={() => saveOutfit(outfit, index)}>
                    💗 Save this outfit
                  </button>
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
    </>
  );
}
