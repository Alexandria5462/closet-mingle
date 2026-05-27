import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];

function canMakeOutfit(items) {
  const tops = items.filter(i => i.category === "tops" || i.category === "outerwear");
  const bottoms = items.filter(i => i.category === "bottoms");
  const dresses = items.filter(i => i.category === "dresses");
  return (tops.length > 0 && bottoms.length > 0) || dresses.length > 0;
}

function getMissingMessage(items) {
  const tops = items.filter(i => i.category === "tops" || i.category === "outerwear");
  const bottoms = items.filter(i => i.category === "bottoms");
  const dresses = items.filter(i => i.category === "dresses");
  if (items.length === 0) return "Your closet is empty. Add some clothes first!";
  if (tops.length === 0 && dresses.length === 0) return "Add a top or dress to your closet to generate outfits.";
  if (bottoms.length === 0 && dresses.length === 0) return "Add bottoms or a dress to complete your outfits.";
  return "Add more clothing items to get started.";
}

// Use Claude AI to generate outfit based on color, pattern, material
async function generateAIOutfit(items, occasion) {
  try {
    const itemDescriptions = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      color: item.attributes?.primaryColor || "unknown",
      secondaryColor: item.attributes?.secondaryColor || null,
      pattern: item.attributes?.pattern || "solid",
      material: item.attributes?.material || "unknown",
      style: item.attributes?.style || "casual",
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a professional fashion stylist. Create a complete outfit for the occasion: "${occasion}".

Available clothing items:
${JSON.stringify(itemDescriptions, null, 2)}

Rules:
1. The outfit MUST include either (a top/outerwear + bottom) OR a dress
2. Try to include shoes if available
3. Include accessories if they complement the outfit
4. Match colors that work well together (complementary, analogous, or neutral combinations)
5. Avoid clashing patterns (no two busy prints together)
6. Consider the occasion when selecting style

Return ONLY a JSON object like this:
{
  "selectedIds": ["id1", "id2", "id3"],
  "colorStory": "Brief explanation of why these colors work together",
  "styleNote": "One sentence about pattern/material choices",
  "outfitName": "A stylish name for this outfit"
}

No other text. Only the JSON.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    // Map selected IDs back to actual items
    const selectedItems = result.selectedIds
      .map(id => items.find(i => i.id === id))
      .filter(Boolean);

    return {
      items: selectedItems,
      colorStory: result.colorStory || "",
      styleNote: result.styleNote || "",
      outfitName: result.outfitName || "Styled Look",
    };
  } catch (e) {
    // Fallback to basic outfit if AI fails
    const tops = items.filter(i => i.category === "tops" || i.category === "outerwear");
    const bottoms = items.filter(i => i.category === "bottoms");
    const dresses = items.filter(i => i.category === "dresses");
    const shoes = items.filter(i => i.category === "shoes");
    const acc = items.filter(i => i.category === "accessories");
    const pick = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const useDress = dresses.length > 0 && (tops.length === 0 || Math.random() > 0.5);
    const outfit = [];
    if (useDress) { const d = pick(dresses); if (d) outfit.push(d); }
    else { const t = pick(tops); const b = pick(bottoms); if (t) outfit.push(t); if (b) outfit.push(b); }
    const s = pick(shoes); const a = pick(acc);
    if (s) outfit.push(s); if (a) outfit.push(a);
    return { items: outfit, colorStory: "", styleNote: "", outfitName: "Styled Look" };
  }
}

function SwipeCard({ outfitData, onSwipe, isTop }) {
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [stampVisible, setStampVisible] = useState(null);

  const { items: outfit, colorStory, styleNote, outfitName } = outfitData;

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
    card.style.transform = `translateX(${currentX.current}px) translateY(${dy * 0.3}px) rotate(${currentX.current * 0.08}deg)`;
    card.style.transition = "none";
    if (currentX.current > 40) setStampVisible("save");
    else if (currentX.current < -40) setStampVisible("pass");
    else setStampVisible(null);
  }

  function onEnd() {
    if (!isDragging.current || !isTop) return;
    isDragging.current = false;
    const card = cardRef.current;
    if (!card) return;
    if (currentX.current > 100) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(150%) rotate(20deg)";
      setTimeout(() => onSwipe("save"), 300);
    } else if (currentX.current < -100) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(-150%) rotate(-20deg)";
      setTimeout(() => onSwipe("pass"), 300);
    } else {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = "translateX(0) rotate(0)";
      setStampVisible(null);
    }
    currentX.current = 0;
  }

  function triggerSwipe(dir) {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.3s ease";
    card.style.transform = dir === "save" ? "translateX(150%) rotate(20deg)" : "translateX(-150%) rotate(-20deg)";
    setTimeout(() => onSwipe(dir), 300);
  }

  const mainItem = outfit[0];

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{ zIndex: isTop ? 10 : 5, transform: isTop ? "scale(1)" : "scale(0.95) translateY(12px)" }}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
    >
      <div className="swipe-card-img">
        {mainItem?.imageUrl
          ? <img src={mainItem.imageUrl} alt={mainItem.name} style={{ background: "repeating-conic-gradient(#f5f5f5 0% 25%, white 0% 50%) 0 0 / 12px 12px" }} />
          : <span>👗</span>
        }
      </div>

      {stampVisible && (
        <div className={`like-stamp ${stampVisible}`} style={{ opacity: 1 }}>
          {stampVisible === "save" ? "💗 SAVE" : "✕ PASS"}
        </div>
      )}

      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{outfitName}</div>

        {colorStory && (
          <div style={{ fontSize: 11, color: "var(--pink-dark)", background: "var(--pink-light)", borderRadius: 8, padding: "4px 8px", marginBottom: 6 }}>
            🎨 {colorStory}
          </div>
        )}

        {styleNote && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
            ✨ {styleNote}
          </div>
        )}

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {outfit.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg)", borderRadius: 20, padding: "3px 8px", border: "0.5px solid var(--border)" }}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
              <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "capitalize" }}>{item.category}</span>
              {item.attributes?.primaryColor && (
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>· {item.attributes.primaryColor}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isTop && (
        <div className="swipe-actions">
          <button className="swipe-btn pass" onClick={() => triggerSwipe("pass")} aria-label="Pass">✕</button>
          <button className="swipe-btn love" onClick={() => triggerSwipe("save")} aria-label="Love">♥</button>
          <button className="swipe-btn save" onClick={() => triggerSwipe("save")} aria-label="Save">🔖</button>
        </div>
      )}
    </div>
  );
}

export default function SwipeOutfits() {
  const { userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [occasion, setOccasion] = useState("Casual");
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(0);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      if (!userProfile?.uid) return;
      const q = query(collection(db, "closetItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(fetched);
      setReady(canMakeOutfit(fetched));
    }
    fetchItems();
  }, [userProfile]);

  useEffect(() => {
    if (canMakeOutfit(items)) {
      generateOutfitDeck();
    }
  }, [items, occasion]);

  async function generateOutfitDeck() {
    if (!canMakeOutfit(items)) return;
    setGenerating(true);
    try {
      // Generate 3 AI outfits in parallel
      const promises = Array.from({ length: 3 }, () => generateAIOutfit(items, occasion));
      const results = await Promise.all(promises);
      setOutfits(results.filter(r => r.items.length >= 2));
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  async function handleSwipe(dir, outfitData) {
    setOutfits(prev => prev.slice(1));

    if (dir === "save") {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        await addDoc(collection(db, "savedOutfits"), {
          userId: userProfile.uid,
          itemIds: outfitData.items.map(i => i.id),
          itemNames: outfitData.items.map(i => i.name),
          itemImages: outfitData.items.map(i => i.imageUrl || ""),
          categories: outfitData.items.map(i => i.category),
          colorStory: outfitData.colorStory,
          styleNote: outfitData.styleNote,
          outfitName: outfitData.outfitName,
          occasion,
          savedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
        setSaved(s => s + 1);
        setToast("💗 Outfit saved! Expires in 24 hours.");
      } catch (e) { console.error(e); }
    } else {
      setToast("Passed — generating next outfit!");
    }

    // Generate more when running low
    if (outfits.length <= 2) {
      generateOutfitDeck();
    }
  }

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <span className="badge badge-pink">{saved} saved today</span>
      </div>
      <div className="screen">
        <div className="body">
          <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e", display: "flex", gap: 8, alignItems: "center" }}>
            <span>⏰</span>
            <span>Saved outfits expire after <strong>24 hours</strong>. Screenshot your favorites to keep them!</span>
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16, scrollbarWidth: "none" }}>
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

          {!ready ? (
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👗</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Cannot generate full outfits yet</div>
              <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "12px 16px", fontSize: 13, color: "var(--pink-dark)", marginBottom: 16 }}>
                ⚠️ {getMissingMessage(items)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                A full outfit needs:<br />
                <strong>Tops + Bottoms</strong> or a <strong>Dress</strong>
              </div>
            </div>
          ) : generating || outfits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>AI is styling your outfits...</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Analyzing colors, patterns and materials</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                ← Swipe left to pass &nbsp;·&nbsp; Swipe right to save →
              </div>
              <div className="swipe-container">
                {outfits.slice(0, 2).map((outfitData, i) => (
                  <SwipeCard
                    key={i}
                    outfitData={outfitData}
                    isTop={i === 0}
                    onSwipe={dir => handleSwipe(dir, outfitData)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <TabBar active="outfits" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
