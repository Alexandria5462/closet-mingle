import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];

// ─── AI outfit generator from liked items ────────────────────
async function generateOutfitFromLikedItems(likedItems, occasion) {
  try {
    const descriptions = likedItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      color: item.attributes?.primaryColor || "unknown",
      pattern: item.attributes?.pattern || "solid",
      material: item.attributes?.material || "unknown",
      style: item.attributes?.style || "casual",
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `You are a professional fashion stylist. The user has liked these individual clothing items by swiping right on them:

${JSON.stringify(descriptions, null, 2)}

Occasion: ${occasion}

Your job is to create the BEST complete outfit from these liked items. Rules:
1. Must include a top/outerwear + bottom OR a dress
2. Add shoes if available in the liked items
3. Add accessories if they complement the look
4. Match colors that work together
5. Avoid clashing patterns
6. Consider the occasion

Return ONLY this JSON:
{
  "selectedIds": ["id1", "id2", "id3"],
  "outfitName": "A stylish name",
  "colorStory": "Why these colors work together",
  "styleNote": "Why these items work for the occasion",
  "confidence": "high/medium/low"
}
Only JSON. No other text.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    const selectedItems = result.selectedIds.map(id => likedItems.find(i => i.id === id)).filter(Boolean);
    return {
      items: selectedItems,
      outfitName: result.outfitName || "Your Custom Look",
      colorStory: result.colorStory || "",
      styleNote: result.styleNote || "",
      confidence: result.confidence || "medium",
    };
  } catch (e) {
    console.error("AI outfit error:", e);
    return null;
  }
}

// ─── Check if liked items can make an outfit ─────────────────
function canMakeOutfitFromLiked(items) {
  const tops = items.filter(i => i.category === "tops" || i.category === "outerwear");
  const bottoms = items.filter(i => i.category === "bottoms");
  const dresses = items.filter(i => i.category === "dresses");
  return (tops.length > 0 && bottoms.length > 0) || dresses.length > 0;
}

// ─── Swipe card for individual items ─────────────────────────
function SwipeCard({ item, onSwipe, isTop, position }) {
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [stamp, setStamp] = useState(null);

  function getPos(e) {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    if (!isTop) return;
    isDragging.current = true;
    const pos = getPos(e);
    startX.current = pos.x;
    startY.current = pos.y;
  }

  function onMove(e) {
    if (!isDragging.current || !isTop) return;
    const pos = getPos(e);
    currentX.current = pos.x - startX.current;
    const dy = pos.y - startY.current;
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `translateX(${currentX.current}px) translateY(${dy * 0.2}px) rotate(${currentX.current * 0.06}deg)`;
    card.style.transition = "none";
    if (currentX.current > 50) setStamp("like");
    else if (currentX.current < -50) setStamp("pass");
    else setStamp(null);
  }

  function onEnd() {
    if (!isDragging.current || !isTop) return;
    isDragging.current = false;
    const card = cardRef.current;
    if (!card) return;
    if (currentX.current > 100) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(150%) rotate(20deg)";
      setTimeout(() => onSwipe("like", item), 300);
    } else if (currentX.current < -100) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(-150%) rotate(-20deg)";
      setTimeout(() => onSwipe("pass", item), 300);
    } else {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(0) rotate(0)";
      setStamp(null);
    }
    currentX.current = 0;
  }

  function triggerSwipe(dir) {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.3s ease";
    card.style.transform = dir === "like"
      ? "translateX(150%) rotate(20deg)"
      : "translateX(-150%) rotate(-20deg)";
    setTimeout(() => onSwipe(dir, item), 300);
  }

  const scale = isTop ? 1 : position === 1 ? 0.96 : 0.92;
  const translateY = isTop ? 0 : position === 1 ? 10 : 20;

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{
        zIndex: isTop ? 10 : 10 - position,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transition: isTop ? "none" : "transform 0.3s ease"
      }}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
    >
      {/* Item image - large and clear */}
      <div className="swipe-card-img" style={{ height: 320 }}>
        {item.imageUrl
          ? <img
              src={item.imageUrl}
              alt={item.name}
              onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
              style={{ width: "100%", height: "100%", objectFit: "cover", background: "repeating-conic-gradient(#f5f5f5 0% 25%, white 0% 50%) 0 0 / 12px 12px" }}
            />
          : <span style={{ fontSize: 80 }}>👗</span>
        }
      </div>

      {/* Like/Pass stamps */}
      {stamp === "like" && (
        <div style={{ position: "absolute", top: 30, left: 20, padding: "6px 16px", borderRadius: 8, fontSize: 24, fontWeight: 700, border: "4px solid var(--pink)", color: "var(--pink)", transform: "rotate(-20deg)", background: "rgba(255,255,255,0.9)" }}>
          💗 LIKE
        </div>
      )}
      {stamp === "pass" && (
        <div style={{ position: "absolute", top: 30, right: 20, padding: "6px 16px", borderRadius: 8, fontSize: 24, fontWeight: 700, border: "4px solid #ef4444", color: "#ef4444", transform: "rotate(20deg)", background: "rgba(255,255,255,0.9)" }}>
          ✕ PASS
        </div>
      )}

      {/* Item info */}
      <div style={{ padding: "10px 14px 4px" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{item.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, background: "var(--bg)", borderRadius: 20, padding: "2px 10px", border: "0.5px solid var(--border)", textTransform: "capitalize", color: "var(--text-secondary)" }}>
            {item.category}
          </span>
          {item.attributes?.primaryColor && (
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "capitalize" }}>
              {item.attributes.primaryColor} · {item.attributes.pattern}
            </span>
          )}
        </div>
      </div>

      {/* Swipe buttons */}
      {isTop && (
        <div className="swipe-actions" style={{ paddingBottom: 8 }}>
          <button className="swipe-btn pass" onClick={() => triggerSwipe("pass")} aria-label="Pass">✕</button>
          <button className="swipe-btn save" onClick={() => triggerSwipe("like")} aria-label="Like">💗</button>
        </div>
      )}
    </div>
  );
}

// ─── Generated outfit display ─────────────────────────────────
function OutfitResult({ outfit, onSave, onDiscard }) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return (
    <div style={{ padding: "0 0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✨</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          {outfit.outfitName}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          AI built this from your liked items
        </div>
      </div>

      {/* Outfit items */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
        {outfit.items.map((item, i) => (
          <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name}
                  onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                  style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "0.5px solid var(--border)", background: "#f5f5f5" }} />
              : <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👗</div>
            }
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, textTransform: "capitalize", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.category}
            </div>
          </div>
        ))}
      </div>

      {/* Color story */}
      {outfit.colorStory && (
        <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 8, fontSize: 13, color: "var(--pink-dark)" }}>
          🎨 {outfit.colorStory}
        </div>
      )}

      {/* Style note */}
      {outfit.styleNote && (
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--text-secondary)" }}>
          ✨ {outfit.styleNote}
        </div>
      )}

      {/* 24hr warning */}
      <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
        ⏰ Saved outfits expire in <strong>24 hours</strong>. Screenshot to keep forever!
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-pink" onClick={onSave} style={{ flex: 1 }}>
          💗 Save this outfit
        </button>
        <button className="btn-outline" onClick={onDiscard} style={{ flex: 1, marginTop: 0 }}>
          🔄 Keep swiping
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function SwipeOutfits() {
  const { userProfile } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [deck, setDeck] = useState([]);
  const [likedItems, setLikedItems] = useState([]);
  const [occasion, setOccasion] = useState("Casual");
  const [toast, setToast] = useState("");
  const [phase, setPhase] = useState("swiping"); // "swiping" | "generating" | "result"
  const [generatedOutfit, setGeneratedOutfit] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [noItems, setNoItems] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      if (!userProfile?.uid) return;
      const q = query(collection(db, "closetItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllItems(fetched);
      if (fetched.length === 0) {
        setNoItems(true);
      } else {
        // Shuffle deck so different items show up every time
        const shuffled = [...fetched].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
      }
    }
    fetchItems();
  }, [userProfile]);

  // Refill deck when running low - cycle through items again in new order
  useEffect(() => {
    if (deck.length < 3 && allItems.length > 0 && phase === "swiping") {
      const reshuffled = [...allItems].sort(() => Math.random() - 0.5);
      setDeck(prev => [...prev, ...reshuffled]);
    }
  }, [deck, allItems, phase]);

  async function handleSwipe(dir, item) {
    // Remove swiped item from top of deck
    setDeck(prev => prev.slice(1));

    if (dir === "like") {
      const newLiked = [...likedItems, item];
      setLikedItems(newLiked);
      setToast(`💗 Liked ${item.name}!`);

      // Once we have enough liked items to make an outfit, generate it
      if (canMakeOutfitFromLiked(newLiked)) {
        setPhase("generating");
        const outfit = await generateOutfitFromLikedItems(newLiked, occasion);
        if (outfit && outfit.items.length >= 2) {
          setGeneratedOutfit(outfit);
          setPhase("result");
        } else {
          setPhase("swiping");
          setToast("Keep swiping to build your outfit!");
        }
      }
    } else {
      setToast("Passed — next item!");
    }
  }

  async function saveOutfit() {
    if (!generatedOutfit) return;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    try {
      await addDoc(collection(db, "savedOutfits"), {
        userId: userProfile.uid,
        itemIds: generatedOutfit.items.map(i => i.id),
        itemNames: generatedOutfit.items.map(i => i.name),
        itemImages: generatedOutfit.items.map(i => i.imageUrl || ""),
        categories: generatedOutfit.items.map(i => i.category),
        colorStory: generatedOutfit.colorStory,
        styleNote: generatedOutfit.styleNote,
        outfitName: generatedOutfit.outfitName,
        occasion,
        savedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      setSavedCount(s => s + 1);
      setToast("💗 Outfit saved! View it on the Saved page.");
    } catch (e) { console.error(e); }

    // Reset and keep swiping
    setGeneratedOutfit(null);
    setLikedItems([]);
    setPhase("swiping");
  }

  function discardAndKeepSwiping() {
    setGeneratedOutfit(null);
    setPhase("swiping");
    // Keep liked items so they can still contribute to next outfit
  }

  function resetSession() {
    setLikedItems([]);
    setGeneratedOutfit(null);
    setPhase("swiping");
    const reshuffled = [...allItems].sort(() => Math.random() - 0.5);
    setDeck(reshuffled);
  }

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {likedItems.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--pink)", fontWeight: 500 }}>
              {likedItems.length} liked
            </span>
          )}
          <span className="badge badge-pink">{savedCount} saved</span>
        </div>
      </div>

      <div className="screen">
        <div className="body">

          {/* Occasion selector */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => setOccasion(o)} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
                background: occasion === o ? "var(--pink)" : "var(--bg-card)",
                borderColor: occasion === o ? "var(--pink)" : "var(--border)",
                color: occasion === o ? "white" : "var(--text-secondary)"
              }}>{o}</button>
            ))}
          </div>

          {/* How it works banner */}
          {phase === "swiping" && likedItems.length === 0 && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#3730a3" }}>
              💡 <strong>How it works:</strong> Swipe right 💗 on items you like. Once you like a top + bottom (or a dress), AI builds you a complete outfit!
            </div>
          )}

          {/* Liked items progress */}
          {phase === "swiping" && likedItems.length > 0 && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--pink-dark)", fontWeight: 500, marginBottom: 6 }}>
                💗 Liked items ({likedItems.length})
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                {likedItems.map((item, i) => (
                  <div key={i} style={{ flexShrink: 0 }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👗</div>
                    }
                  </div>
                ))}
              </div>
              {!canMakeOutfitFromLiked(likedItems) && (
                <div style={{ fontSize: 11, color: "var(--pink-dark)", marginTop: 6 }}>
                  {likedItems.filter(i => i.category === "tops" || i.category === "outerwear").length === 0
                    ? "Like a top to continue building your outfit →"
                    : "Like a bottom or dress to complete your outfit →"
                  }
                </div>
              )}
            </div>
          )}

          {/* No items state */}
          {noItems && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Your closet is empty</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Add clothing items to your closet first</div>
            </div>
          )}

          {/* Generating outfit */}
          {phase === "generating" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Building your outfit...</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>AI is analyzing your liked items</div>
            </div>
          )}

          {/* Generated outfit result */}
          {phase === "result" && generatedOutfit && (
            <OutfitResult
              outfit={generatedOutfit}
              onSave={saveOutfit}
              onDiscard={discardAndKeepSwiping}
            />
          )}

          {/* Swipe deck */}
          {phase === "swiping" && !noItems && deck.length > 0 && (
            <>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
                ← Pass &nbsp;·&nbsp; Like 💗 →
              </div>
              <div className="swipe-container" style={{ height: 420 }}>
                {deck.slice(0, 3).map((item, i) => (
                  <SwipeCard
                    key={`${item.id}-${i}`}
                    item={item}
                    isTop={i === 0}
                    position={i}
                    onSwipe={handleSwipe}
                  />
                ))}
              </div>
              {likedItems.length > 0 && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button onClick={resetSession} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                    Start over
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <TabBar active="outfits" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
