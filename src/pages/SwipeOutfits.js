import React, { useState, useEffect, useRef } from "react";

import { collection, query, where, getDocs, addDoc, doc, setDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

import { useAuth } from "../lib/AuthContext";

import { useNavigate } from "react-router-dom";

import TabBar from "../components/TabBar";

import Toast from "../components/Toast";

const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];

const SESSION_HOURS = 6;

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

    card.style.transform = dir === "like" ? "translateX(150%) rotate(20deg)" : "translateX(-150%) rotate(-20deg)";

    setTimeout(() => onSwipe(dir, item), 300);

  }

  const scale = isTop ? 1 : position === 1 ? 0.96 : 0.92;

  const ty = isTop ? 0 : position === 1 ? 10 : 20;

  return (
<div

      ref={cardRef}

      className="swipe-card"

      style={{ zIndex: isTop ? 10 : 10 - position, transform: `scale(${scale}) translateY(${ty}px)`, transition: isTop ? "none" : "transform 0.3s ease" }}

      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}

      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
>
<div className="swipe-card-img" style={{ height: 300 }}>

        {item.imageUrl

          ? <img src={item.imageUrl} alt={item.name}

              onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}

              style={{ width: "100%", height: "100%", objectFit: "cover", background: "repeating-conic-gradient(#f5f5f5 0% 25%, white 0% 50%) 0 0 / 12px 12px" }} />

          : <span style={{ fontSize: 80 }}>👗</span>

        }
</div>

      {stamp === "like" && (
<div style={{ position: "absolute", top: 28, left: 16, padding: "5px 14px", borderRadius: 8, fontSize: 20, fontWeight: 700, border: "3px solid var(--pink)", color: "var(--pink)", transform: "rotate(-20deg)", background: "rgba(255,255,255,0.92)" }}>💗 LIKE</div>

      )}

      {stamp === "pass" && (
<div style={{ position: "absolute", top: 28, right: 16, padding: "5px 14px", borderRadius: 8, fontSize: 20, fontWeight: 700, border: "3px solid #ef4444", color: "#ef4444", transform: "rotate(20deg)", background: "rgba(255,255,255,0.92)" }}>✕ PASS</div>

      )}
<div style={{ padding: "10px 14px 4px" }}>
<div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{item.name}</div>
<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
<span style={{ fontSize: 11, background: "var(--bg)", borderRadius: 20, padding: "2px 10px", border: "0.5px solid var(--border)", textTransform: "capitalize", color: "var(--text-secondary)" }}>{item.category}</span>

          {item.attributes?.primaryColor && (
<span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{item.attributes.primaryColor} · {item.attributes.pattern}</span>

          )}
</div>
</div>

      {isTop && (
<div className="swipe-actions" style={{ paddingBottom: 6 }}>
<button className="swipe-btn pass" onClick={() => triggerSwipe("pass")} aria-label="Pass">✕</button>
<button className="swipe-btn save" onClick={() => triggerSwipe("like")} aria-label="Like">💗</button>
</div>

      )}
</div>

  );

}

export default function SwipeOutfits() {

  const { userProfile } = useAuth();

  const nav = useNavigate();

  const [deck, setDeck] = useState([]);

  const [likedCount, setLikedCount] = useState(0);

  const [savedCount, setSavedCount] = useState(0);

  const [canGenerate, setCanGenerate] = useState(false);

  const [occasion, setOccasion] = useState("Casual");

  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(true);

  const [sessionResetsAt, setSessionResetsAt] = useState(null);

  const [timeUntilReset, setTimeUntilReset] = useState("");

  const [allDone, setAllDone] = useState(false);

  useEffect(() => {

    loadSession();

  }, [userProfile]);

  // Countdown timer for session reset

  useEffect(() => {

    if (!sessionResetsAt) return;

    const interval = setInterval(() => {

      const diff = new Date(sessionResetsAt) - new Date();

      if (diff <= 0) {

        clearInterval(interval);

        loadSession(); // Auto reload when session resets

        return;

      }

      const hours = Math.floor(diff / (1000 * 60 * 60));

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);

    }, 30000); // Update every 30 seconds

    // Set initial value immediately

    const diff = new Date(sessionResetsAt) - new Date();

    const hours = Math.floor(diff / (1000 * 60 * 60));

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    setTimeUntilReset(`${hours}h ${minutes}m`);

    return () => clearInterval(interval);

  }, [sessionResetsAt]);

  async function loadSession() {

    if (!userProfile?.uid) return;

    setLoading(true);

    // Get all closet items

    const itemsSnap = await getDocs(query(collection(db, "closetItems"), where("userId", "==", userProfile.uid)));

    const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get or create swipe session

    const sessionSnap = await getDocs(query(collection(db, "swipeSessions"), where("userId", "==", userProfile.uid)));

    const now = new Date();

    let session = null;

    if (!sessionSnap.empty) {

      const s = { id: sessionSnap.docs[0].id, ...sessionSnap.docs[0].data() };

      // Check if session is still valid (within 6 hours)

      if (new Date(s.resetsAt) > now) {

        session = s;

        setSessionResetsAt(s.resetsAt);

      }

    }

    // Build set of already swiped item IDs this session

    const swipedIds = new Set(session?.swipedItemIds || []);

    // Filter out already swiped items

    const remaining = allItems.filter(item => !swipedIds.has(item.id));

    // Shuffle remaining

    const shuffled = [...remaining].sort(() => Math.random() - 0.5);

    setDeck(shuffled);

    setAllDone(shuffled.length === 0 && allItems.length > 0);

    // Get liked count

    const likedSnap = await getDocs(query(collection(db, "likedItems"), where("userId", "==", userProfile.uid)));

    const validLiked = likedSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.expiresAt || new Date(d.expiresAt) > now);

    setLikedCount(validLiked.length);

    checkCanGenerate(validLiked);

    // Get saved count

    const savedSnap = await getDocs(query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid)));

    const validSaved = savedSnap.docs.filter(d => { const data = d.data(); return !data.expiresAt || new Date(data.expiresAt) > now; });

    setSavedCount(validSaved.length);

    setLoading(false);

  }

  function checkCanGenerate(liked) {

    const tops = liked.filter(i => i.category === "tops" || i.category === "outerwear");

    const bottoms = liked.filter(i => i.category === "bottoms");

    const dresses = liked.filter(i => i.category === "dresses");

    setCanGenerate((tops.length > 0 && bottoms.length > 0) || dresses.length > 0);

  }

  async function handleSwipe(dir, item) {

    // Remove from deck immediately

    setDeck(prev => prev.slice(1));

    const now = new Date();

    // Record this item as swiped in the session

    const sessionSnap = await getDocs(query(collection(db, "swipeSessions"), where("userId", "==", userProfile.uid)));

    let sessionId = null;

    let currentSwipedIds = [];

    let resetsAt = null;

    if (!sessionSnap.empty) {

      const s = sessionSnap.docs[0];

      sessionId = s.id;

      const data = s.data();

      if (new Date(data.resetsAt) > now) {

        currentSwipedIds = data.swipedItemIds || [];

        resetsAt = data.resetsAt;

      }

    }

    // Create or update session

    if (!resetsAt) {

      // New session — resets 6 hours from now

      const newResetsAt = new Date();

      newResetsAt.setHours(newResetsAt.getHours() + SESSION_HOURS);

      resetsAt = newResetsAt.toISOString();

      setSessionResetsAt(resetsAt);

    }

    const updatedSwipedIds = [...new Set([...currentSwipedIds, item.id])];

    if (sessionId) {

      await setDoc(doc(db, "swipeSessions", sessionId), {

        userId: userProfile.uid,

        swipedItemIds: updatedSwipedIds,

        resetsAt,

        updatedAt: now.toISOString(),

      });

    } else {

      await addDoc(collection(db, "swipeSessions"), {

        userId: userProfile.uid,

        swipedItemIds: updatedSwipedIds,

        resetsAt,

        createdAt: now.toISOString(),

        updatedAt: now.toISOString(),

      });

    }

    // Check if deck is now empty

    setDeck(prev => {

      if (prev.length === 0) setAllDone(true);

      return prev;

    });

    if (dir === "like") {

      // Save to liked items with 24hr expiry

      const expiresAt = new Date();

      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, "likedItems"), {

        userId: userProfile.uid,

        itemId: item.id,

        name: item.name,

        category: item.category,

        imageUrl: item.imageUrl || "",

        fallbackUrl: item.fallbackUrl || "",

        attributes: item.attributes || {},

        likedAt: now.toISOString(),

        expiresAt: expiresAt.toISOString(),

      });

      const newCount = likedCount + 1;

      setLikedCount(newCount);

      setToast(`💗 Liked ${item.name}!`);

      // Reload liked to check if combo is met

      const lSnap = await getDocs(query(collection(db, "likedItems"), where("userId", "==", userProfile.uid)));

      const validLiked = lSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.expiresAt || new Date(d.expiresAt) > now);

      checkCanGenerate(validLiked);

    } else {

      setToast("Passed!");

    }

  }

  if (loading) {

    return (
<>
<div className="header">
<div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>Closet<span>Mingle</span></div>
</div>
<div className="screen">
<div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>Loading your closet...</div>
</div>
<TabBar active="outfits" type="client" />
</>

    );

  }

  return (
<>
<div className="header">

        {/* Clickable logo → Home */}
<div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>

          Closet<span>Mingle</span>
</div>
<div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* Clickable liked badge → Liked page */}
<button onClick={() => nav("/liked")} style={{ background: likedCount > 0 ? "var(--pink-light)" : "var(--bg)", border: `1px solid ${likedCount > 0 ? "#f4c0d1" : "var(--border)"}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: likedCount > 0 ? "var(--pink-dark)" : "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>

            💗 {likedCount} liked
</button>

          {/* Clickable saved badge → Saved page */}
<button onClick={() => nav("/saved")} style={{ background: savedCount > 0 ? "var(--pink-light)" : "var(--bg)", border: `1px solid ${savedCount > 0 ? "#f4c0d1" : "var(--border)"}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: savedCount > 0 ? "var(--pink-dark)" : "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>

            🔖 {savedCount} saved
</button>
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

          {/* How it works */}
<div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#3730a3" }}>

            💡 Swipe 💗 on items you like. Like a <strong>top + bottom</strong> or a <strong>dress</strong> to unlock outfit generation. Each item can only be swiped once every <strong>6 hours</strong>.
</div>

          {/* Ready to generate banner */}

          {canGenerate && (
<div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#065f46", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
<span>✅ Ready to generate outfits!</span>
<button onClick={() => nav("/liked")} style={{ background: "#059669", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "white", cursor: "pointer", fontWeight: 500 }}>

                View Liked →
</button>
</div>

          )}

          {/* All items swiped state */}

          {allDone && (
<div style={{ textAlign: "center", padding: "32px 20px" }}>
<div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
<div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>You have swiped all items!</div>
<div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16 }}>

                ⏰ New items available to swipe in <strong>{timeUntilReset}</strong>
</div>

              {likedCount > 0 && (
<button className="btn-pink" onClick={() => nav("/liked")} style={{ width: "auto", padding: "10px 24px" }}>

                  💗 View my {likedCount} liked items
</button>

              )}
</div>

          )}

          {/* Empty closet state */}

          {!allDone && deck.length === 0 && !loading && (
<div style={{ textAlign: "center", padding: "48px 20px" }}>
<div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
<div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Your closet is empty</div>
<div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Add clothing items to your closet first</div>
</div>

          )}

          {/* Swipe deck */}

          {!allDone && deck.length > 0 && (
<>
<div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>

                ← Pass &nbsp;·&nbsp; Like 💗 → &nbsp;|&nbsp; {deck.length} item{deck.length !== 1 ? "s" : ""} remaining
</div>
<div className="swipe-container" style={{ height: 400 }}>

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
</>

          )}
</div>
</div>
<TabBar active="outfits" type="client" />

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
</>

  );

}
 