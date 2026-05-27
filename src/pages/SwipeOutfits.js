import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];
const EMOJIS = { tops:"👕", bottoms:"👖", dresses:"👗", shoes:"👟", accessories:"👜", outerwear:"🧥" };

function buildOutfitFromItems(items, occasion) {
  const tops = items.filter(i=>["tops","outerwear"].includes(i.category));
  const bottoms = items.filter(i=>["bottoms","dresses"].includes(i.category));
  const shoes = items.filter(i=>i.category==="shoes");
  const acc = items.filter(i=>i.category==="accessories");
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const outfit = [tops.length&&pick(tops), bottoms.length&&pick(bottoms), shoes.length&&pick(shoes), acc.length&&pick(acc)].filter(Boolean);
  return outfit.length >= 2 ? outfit : items.slice(0, Math.min(3, items.length));
}

function SwipeCard({ outfit, onSwipe, isTop }) {
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [stampVisible, setStampVisible] = useState(null); // "pass" | "save"

  function getPos(e) {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    if (!isTop) return;
    const pos = getPos(e);
    startX.current = pos.x;
    startY.current = pos.y;
    isDragging.current = true;
  }

  function onMove(e) {
    if (!isDragging.current || !isTop) return;
    const pos = getPos(e);
    currentX.current = pos.x - startX.current;
    const dy = pos.y - startY.current;
    const card = cardRef.current;
    if (!card) return;
    const rotate = currentX.current * 0.08;
    card.style.transform = `translateX(${currentX.current}px) translateY(${dy * 0.3}px) rotate(${rotate}deg)`;
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
    const threshold = 100;
    if (currentX.current > threshold) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = `translateX(150%) rotate(20deg)`;
      setTimeout(() => onSwipe("save"), 300);
    } else if (currentX.current < -threshold) {
      card.style.transition = "transform 0.3s ease";
      card.style.transform = `translateX(-150%) rotate(-20deg)`;
      setTimeout(() => onSwipe("pass"), 300);
    } else {
      card.style.transition = "transform 0.3s spring";
      card.style.transform = "translateX(0) rotate(0)";
      setStampVisible(null);
    }
    currentX.current = 0;
  }

  function triggerSwipe(dir) {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.3s ease";
    card.style.transform = dir==="save" ? "translateX(150%) rotate(20deg)" : "translateX(-150%) rotate(-20deg)";
    setTimeout(() => onSwipe(dir), 300);
  }

  const mainItem = outfit[0];
  const restItems = outfit.slice(1);

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{zIndex: isTop ? 10 : 5, transform: isTop ? "scale(1)" : "scale(0.95) translateY(12px)"}}
      onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
    >
      <div className="swipe-card-img">
        {mainItem?.imageUrl
          ? <img src={mainItem.imageUrl} alt={mainItem.name} />
          : <span>{EMOJIS[mainItem?.category] || "👗"}</span>
        }
      </div>
      {stampVisible && (
        <div className={`like-stamp ${stampVisible}`} style={{opacity:1}}>
          {stampVisible === "save" ? "💗 SAVE" : "✕ PASS"}
        </div>
      )}
      <div style={{padding:"12px 16px"}}>
        <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Outfit suggestion</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {outfit.map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:"var(--bg)",borderRadius:20,padding:"3px 10px"}}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{width:18,height:18,borderRadius:"50%",objectFit:"cover"}} />}
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
      {isTop && (
        <div className="swipe-actions">
          <button className="swipe-btn pass" onClick={()=>triggerSwipe("pass")} aria-label="Pass"><i className="ti ti-x" aria-hidden="true"></i></button>
          <button className="swipe-btn love" onClick={()=>triggerSwipe("save")} aria-label="Love"><i className="ti ti-heart" aria-hidden="true"></i></button>
          <button className="swipe-btn save" onClick={()=>triggerSwipe("save")} aria-label="Save"><i className="ti ti-bookmark" aria-hidden="true"></i></button>
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(0);

  useEffect(() => { fetchItems(); }, [userProfile]);
  useEffect(() => { if (items.length >= 2) generateOutfits(); }, [items, occasion]);

  async function fetchItems() {
    if (!userProfile?.uid) return;
    const q = query(collection(db,"closetItems"), where("userId","==",userProfile.uid));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d=>({id:d.id,...d.data()})));
  }

  function generateOutfits() {
    const generated = Array.from({length:6}, ()=>buildOutfitFromItems(items, occasion));
    setOutfits(generated);
  }

  async function handleSwipe(dir, outfit) {
    setOutfits(prev => prev.slice(1));
    if (dir === "save") {
      try {
        await addDoc(collection(db,"savedOutfits"), {
          userId: userProfile.uid,
          itemIds: outfit.map(i=>i.id),
          itemNames: outfit.map(i=>i.name),
          occasion,
          savedAt: new Date().toISOString(),
        });
        setSaved(s=>s+1);
        setToast("💗 Outfit saved!");
      } catch(e) { console.error(e); }
    } else {
      setToast("Passed — keep swiping!");
    }
    if (outfits.length <= 2) generateOutfits();
  }

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <span className="badge badge-pink">{saved} saved</span>
      </div>
      <div className="screen">
        <div className="body">
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16,scrollbarWidth:"none"}}>
            {OCCASIONS.map(o=>(
              <button key={o} onClick={()=>setOccasion(o)} style={{
                padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:500,border:"1px solid",cursor:"pointer",whiteSpace:"nowrap",
                background:occasion===o?"var(--pink)":"var(--bg-card)",
                borderColor:occasion===o?"var(--pink)":"var(--border)",
                color:occasion===o?"white":"var(--text-secondary)"
              }}>{o}</button>
            ))}
          </div>

          {items.length < 2 ? (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>👗</div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:6}}>Add items to your closet first</div>
              <div style={{fontSize:13,color:"var(--text-secondary)"}}>You need at least 2 items to start swiping outfits</div>
            </div>
          ) : outfits.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:"var(--text-secondary)"}}>Generating outfits...</div>
          ) : (
            <>
              <div style={{textAlign:"center",fontSize:13,color:"var(--text-secondary)",marginBottom:12}}>
                <i className="ti ti-arrow-left" aria-hidden="true"></i> Pass &nbsp;·&nbsp; Save <i className="ti ti-arrow-right" aria-hidden="true"></i>
              </div>
              <div className="swipe-container">
                {outfits.slice(0,2).map((outfit,i)=>(
                  <SwipeCard
                    key={JSON.stringify(outfit.map(x=>x.id))+i}
                    outfit={outfit}
                    isTop={i===0}
                    onSwipe={dir=>handleSwipe(dir, outfit)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <TabBar active="outfits" type="client" />
      {toast && <Toast message={toast} onDone={()=>setToast("")} />}
    </>
  );
}
