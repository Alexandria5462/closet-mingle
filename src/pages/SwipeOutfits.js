import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

const OCCASIONS = ["All","Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];
const SESSION_HOURS = 6;

// ─── Swipe Card Component ─────────────────────────────────────
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
              style={{ width:"100%", height:"100%", objectFit:"cover", background:"repeating-conic-gradient(#f5f5f5 0% 25%, white 0% 50%) 0 0 / 12px 12px" }} />
          : <span style={{ fontSize: 80 }}>👗</span>
        }
      </div>
      {stamp === "like" && (
        <div style={{ position:"absolute", top:28, left:16, padding:"5px 14px", borderRadius:8, fontSize:20, fontWeight:700, border:"3px solid var(--pink)", color:"var(--pink)", transform:"rotate(-20deg)", background:"rgba(255,255,255,0.92)" }}>LIKE</div>
      )}
      {stamp === "pass" && (
        <div style={{ position:"absolute", top:28, right:16, padding:"5px 14px", borderRadius:8, fontSize:20, fontWeight:700, border:"3px solid #ef4444", color:"#ef4444", transform:"rotate(20deg)", background:"rgba(255,255,255,0.92)" }}>✕ PASS</div>
      )}
      <div style={{ padding:"10px 14px 4px" }}>
        <div style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", marginBottom:2 }}>{item.name}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, background:"var(--bg-card)", borderRadius:20, padding:"3px 12px", border:"1px solid var(--border)", textTransform:"capitalize", color:"var(--text-primary)", fontWeight:500 }}>{item.category}</span>
          {item.attributes?.primaryColor && item.attributes.primaryColor !== "unknown" && (
            <span style={{ fontSize:11, background:"var(--bg-card)", borderRadius:20, padding:"3px 12px", border:"1px solid var(--border)", textTransform:"capitalize", color:"var(--text-secondary)" }}>{item.attributes.primaryColor} · {item.attributes.pattern}</span>
          )}
        </div>
      </div>
      {isTop && (
        <div className="swipe-actions" style={{ paddingBottom:6 }}>
          <button className="swipe-btn pass" onClick={() => triggerSwipe("pass")} aria-label="Pass">✕</button>
          <button className="swipe-btn save" onClick={() => triggerSwipe("like")} aria-label="Like">💗</button>
        </div>
      )}
    </div>
  );
}

// ─── Main SwipeOutfits Page ───────────────────────────────────
export default function SwipeOutfits() {
  const { userProfile } = useAuth();
  // Only free accounts have time constraints
  const isFreeAccount = !userProfile?.subscriptionTier || userProfile?.subscriptionTier === "free";
  const nav = useNavigate();
  const [deck, setDeck] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [canGenerate, setCanGenerate] = useState(false);
  const [occasion, setOccasion] = useState("All");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [allDone, setAllDone] = useState(false);
  const [sessionDocId, setSessionDocId] = useState(null);
  const [swipedIds, setSwipedIds] = useState(new Set());
  const [resetsAt, setResetsAt] = useState(null);

  useEffect(() => {
    if (userProfile?.uid) loadEverything();
  }, [userProfile]);

  // Countdown timer
  useEffect(() => {
    if (!resetsAt) return;
    const tick = () => {
      const diff = new Date(resetsAt) - new Date();
      if (diff <= 0) {
        setTimeUntilReset("");
        loadEverything();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeUntilReset(`${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [resetsAt]);

  async function loadEverything() {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      // ── 1. Load all closet items ──────────────────────────
      const itemsSnap = await getDocs(
        query(collection(db, "closetItems"), where("userId", "==", userProfile.uid))
      );
      const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ── Load already liked items to exclude from deck ─────
      const alreadyLikedSnap = await getDocs(
        query(collection(db, "likedItems"), where("userId", "==", userProfile.uid))
      );
      const alreadyLikedIds = new Set(alreadyLikedSnap.docs.map(d => d.data().itemId || d.data().id));

      // ── 2. Load swipe session (free accounts only) ──────────
      const now = new Date();
      let alreadySwiped = new Set();
      let sessionResetsAt = null;

      if (isFreeAccount) {
        // Only free accounts track swiped items with 6hr reset
        const sessionSnap = await getDocs(
          query(collection(db, "swipeSessions"), where("userId", "==", userProfile.uid))
        );
        let sessionId = null;
        if (!sessionSnap.empty) {
          const sDoc = sessionSnap.docs[0];
          const sData = sDoc.data();
          if (new Date(sData.resetsAt) > now) {
            sessionId = sDoc.id;
            alreadySwiped = new Set(sData.swipedItemIds || []);
            sessionResetsAt = sData.resetsAt;
          }
        }
        setSessionDocId(sessionId);
        if (sessionResetsAt) setResetsAt(sessionResetsAt);
      }
      // Paid accounts — no tracking, all items always available
      setSwipedIds(alreadySwiped);

      // ── 3. Build deck from unswiped items ─────────────────
      const remaining = isFreeAccount
        ? allItems.filter(item => !alreadySwiped.has(item.id) && !alreadyLikedIds.has(item.id))
        : allItems.filter(item => !alreadyLikedIds.has(item.id)); // paid still exclude liked items
      // Apply occasion filter if set
      // "All" shows everything, specific occasion shows tagged items + untagged items
      const occasionFiltered = occasionFilter === "All"
        ? remaining
        : remaining.filter(item => {
            const tags = item.occasions || [];
            // Show items tagged with this occasion OR items with no tags at all
            return tags.includes(occasionFilter) || tags.length === 0;
          });
      const shuffled = [...occasionFiltered].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
      setAllDone(shuffled.length === 0 && allItems.length > 0);

      // ── 4. Load liked items count ─────────────────────────
      const likedSnap = await getDocs(
        query(collection(db, "likedItems"), where("userId", "==", userProfile.uid))
      );
      const validLiked = likedSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.expiresAt || new Date(d.expiresAt) > now);
      setLikedCount(validLiked.length);
      checkCanGenerate(validLiked);

      // ── 5. Load saved outfits count ───────────────────────
      const savedSnap = await getDocs(
        query(collection(db, "savedOutfits"), where("userId", "==", userProfile.uid))
      );
      const validSaved = savedSnap.docs.filter(d => {
        const data = d.data();
        return !data.expiresAt || new Date(data.expiresAt) > now;
      });
      setSavedCount(validSaved.length);

    } catch (err) {
      console.error("Load error:", err);
      setToast("Error loading. Please refresh.");
    }
    setLoading(false);
  }

  function checkCanGenerate(liked) {
    const tops = liked.filter(i => i.category === "tops" || i.category === "outerwear");
    const bottoms = liked.filter(i => i.category === "bottoms");
    const dresses = liked.filter(i => i.category === "dresses");
    setCanGenerate((tops.length > 0 && bottoms.length > 0) || dresses.length > 0);
  }

  async function handleSwipe(dir, item) {
    // Remove from top of deck immediately
    setDeck(prev => {
      const next = prev.slice(1);
      if (next.length === 0) setAllDone(true);
      return next;
    });

    const now = new Date();
    const newSwipedIds = new Set([...swipedIds, item.id]);
    setSwipedIds(newSwipedIds);

    // ── Save/update swipe session (free accounts only) ──────
    if (isFreeAccount) {
      try {
        let currentResetsAt = resetsAt;
        if (!currentResetsAt || new Date(currentResetsAt) <= now) {
          const newResetsAt = new Date();
          newResetsAt.setHours(newResetsAt.getHours() + SESSION_HOURS);
          currentResetsAt = newResetsAt.toISOString();
          setResetsAt(currentResetsAt);
        }
        const sessionData = {
          userId: userProfile.uid,
          swipedItemIds: [...newSwipedIds],
          resetsAt: currentResetsAt,
          updatedAt: now.toISOString(),
        };
        if (sessionDocId) {
          await updateDoc(doc(db, "swipeSessions", sessionDocId), sessionData);
        } else {
          const newDoc = await addDoc(collection(db, "swipeSessions"), {
            ...sessionData,
            createdAt: now.toISOString(),
          });
          setSessionDocId(newDoc.id);
        }
      } catch (err) {
        console.error("Session save error:", err);
      }
    }
    // Paid accounts — no session tracking needed

    // ── If liked, save to likedItems collection ───────────
    if (dir === "like") {
      try {
        // Only set 24hr expiry for free accounts — paid accounts keep liked items forever
        const expiresAt = isFreeAccount
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null;
        await addDoc(collection(db, "likedItems"), {
          userId: userProfile.uid,
          itemId: item.id,
          name: item.name,
          category: item.category,
          imageUrl: item.imageUrl || "",
          fallbackUrl: item.fallbackUrl || "",
          attributes: item.attributes || {},
          likedAt: now.toISOString(),
          expiresAt: expiresAt,
        });
        const newCount = likedCount + 1;
        setLikedCount(newCount);
        setToast(`Liked ${item.name}!`);

        // Reload liked items to check combo
        const lSnap = await getDocs(
          query(collection(db, "likedItems"), where("userId", "==", userProfile.uid))
        );
        const validLiked = lSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => !d.expiresAt || new Date(d.expiresAt) > now);
        checkCanGenerate(validLiked);
      } catch (err) {
        console.error("Like save error:", err);
      }
    } else {
      setToast("Passed!");
    }
  }

  return (
    <>
      <div className="header">
        {/* Clickable logo */}
        <div className="logo" style={{ cursor:"pointer" }} onClick={() => nav("/home")}>
          <em>closet</em><span>mingle</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => nav("/liked")} style={{ background: likedCount > 0 ? "var(--pink-light)" : "var(--bg)", border:`1px solid ${likedCount > 0 ? "#f4c0d1" : "var(--border)"}`, borderRadius:20, padding:"4px 12px", fontSize:12, color: likedCount > 0 ? "var(--pink-dark)" : "var(--text-secondary)", cursor:"pointer", fontWeight:500 }}>
            {likedCount} liked
          </button>
          <button onClick={() => nav("/saved")} style={{ background: savedCount > 0 ? "var(--pink-light)" : "var(--bg)", border:`1px solid ${savedCount > 0 ? "#f4c0d1" : "var(--border)"}`, borderRadius:20, padding:"4px 12px", fontSize:12, color: savedCount > 0 ? "var(--pink-dark)" : "var(--text-secondary)", cursor:"pointer", fontWeight:500 }}>
            🔖 {savedCount} saved
          </button>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          {/* Watermark banner for free accounts */}
          {isFreeAccount && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f4c0d1", borderRadius: "var(--radius)", padding: "6px 12px", marginBottom: 10, fontSize: 11, color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>📸 Screenshots include a ClosetMingle watermark on Free plan</span>
              <span onClick={() => {}} style={{ cursor: "pointer", textDecoration: "underline", fontSize: 11 }} onClick={() => window.location.href="/plans"}>Upgrade</span>
            </div>
          )}

          {/* Occasion selector */}
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:12, scrollbarWidth:"none" }}>
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => { setOccasionFilter(o); setOccasion(o); }} style={{
                padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                border:"1px solid", cursor:"pointer", whiteSpace:"nowrap",
                background: occasionFilter === o ? "var(--pink)" : "var(--bg-card)",
                borderColor: occasionFilter === o ? "var(--pink)" : "var(--border)",
                color: occasionFilter === o ? "white" : "var(--text-secondary)"
              }}>{o}</button>
            ))}
          </div>

          {/* Instruction banner */}
          <div style={{ background:"#f0f4ff", border:"1px solid #c7d2fe", borderRadius:"var(--radius)", padding:"10px 14px", marginBottom:12, fontSize:12, color:"#3730a3" }}>
            Swipe on items you like. Like a <strong>top + bottom</strong> or a <strong>dress</strong> to unlock AI outfit generation.{isFreeAccount && " Each item can only be swiped once every 6 hours."}
          </div>

          {/* Ready to generate */}
          {canGenerate && (
            <div style={{ background:"#d1fae5", border:"1px solid #6ee7b7", borderRadius:"var(--radius)", padding:"12px 14px", marginBottom:12, fontSize:13, color:"#065f46", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>✅ Ready to generate outfits!</span>
              <button onClick={() => nav("/liked")} style={{ background:"#059669", border:"none", borderRadius:20, padding:"6px 14px", fontSize:12, color:"white", cursor:"pointer", fontWeight:500 }}>
                View Liked →
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-secondary)" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>👗</div>
              <div style={{ fontSize:14 }}>Loading your closet...</div>
            </div>
          )}

          {/* All items swiped */}
          {!loading && allDone && (
            <div style={{ textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>You have swiped all items!</div>
              {isFreeAccount && timeUntilReset && (
                <div style={{ background:"#fff8e7", border:"1px solid #fcd34d", borderRadius:"var(--radius)", padding:"10px 14px", fontSize:13, color:"#92400e", marginBottom:16 }}>
                  ⏰ Free plan — new swipe session available in <strong>{timeUntilReset}</strong>. <span style={{color:"var(--pink)", cursor:"pointer", textDecoration:"underline"}} onClick={() => nav("/plans")}>Upgrade to remove limits</span>
                </div>
              )}
              {likedCount > 0 && (
                <button className="btn-pink" onClick={() => nav("/liked")} style={{ width:"auto", padding:"10px 24px" }}>
                  View my {likedCount} liked items
                </button>
              )}
            </div>
          )}

          {/* Empty closet */}
          {!loading && !allDone && deck.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 20px" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👗</div>
              <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>Your closet is empty</div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:20 }}>Add clothing items to your closet first</div>
              <button className="btn-pink" onClick={() => nav("/closet")} style={{ width:"auto", padding:"10px 24px" }}>
                Go to Closet →
              </button>
            </div>
          )}

          {/* Swipe deck */}
          {!loading && !allDone && deck.length > 0 && (
            <>
              <div style={{ textAlign:"center", fontSize:12, color:"var(--text-secondary)", marginBottom:10 }}>
                ← Pass &nbsp;·&nbsp; Like → &nbsp;|&nbsp; <strong>{deck.length}</strong> item{deck.length !== 1 ? "s" : ""} remaining
              </div>
              <div className="swipe-container" style={{ height:420 }}>
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


          {/* Watermark for free accounts */}
          {isFreeAccount && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", overflow: "hidden",
            }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute", top: `${10 + i * 13}%`, left: "-20%", width: "140%",
                  textAlign: "center", fontSize: 13, fontWeight: 600,
                  color: "rgba(212,83,126,0.07)", transform: "rotate(-30deg)",
                  letterSpacing: 2, whiteSpace: "nowrap", userSelect: "none",
                }}>
                  ClosetMingle Free Plan · Upgrade to remove watermark ·&nbsp;
                </div>
              ))}
            </div>
          )}
      <TabBar active="outfits" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
