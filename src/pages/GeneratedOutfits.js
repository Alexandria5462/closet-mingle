import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";
const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];
// ── Normalize category so matching is consistent ──────────────
function normalizeCategory(cat) {
 if (!cat) return "other";
 const c = cat.toLowerCase().trim();
 if (["top","tops","shirt","blouse","tee","tank","sweater","crop"].some(x => c.includes(x))) return "tops";
 if (["outerwear","jacket","coat","blazer","hoodie","cardigan"].some(x => c.includes(x))) return "outerwear";
 if (["bottom","bottoms","pant","pants","jean","jeans","skirt","shorts","legging","trouser"].some(x => c.includes(x))) return "bottoms";
 if (["dress","dresses","romper","jumpsuit"].some(x => c.includes(x))) return "dresses";
 if (["shoe","shoes","boot","boots","sneaker","heel","sandal","loafer"].some(x => c.includes(x))) return "shoes";
 if (["bag","purse","belt","scarf","hat","necklace","earring","accessory","accessories","jewelry"].some(x => c.includes(x))) return "accessories";
 return c;
}
// ── Check if liked items can form a complete outfit ───────────
function checkCanMakeOutfit(items) {
 const normalized = items.map(i => ({ ...i, normCat: normalizeCategory(i.category) }));
 const tops = normalized.filter(i => i.normCat === "tops" || i.normCat === "outerwear");
 const bottoms = normalized.filter(i => i.normCat === "bottoms");
 const dresses = normalized.filter(i => i.normCat === "dresses");
 return {
   canMake: (tops.length > 0 && bottoms.length > 0) || dresses.length > 0,
   tops: tops.length,
   bottoms: bottoms.length,
   dresses: dresses.length,
   normalized
 };
}
// ── Call Claude AI to generate outfits ────────────────────────
async function callClaudeForOutfits(items, occasion) {
 // Build rich descriptions from whatever attributes we have
 const descriptions = items.map((item, index) => {
   const attrs = item.attributes || {};
   return {
     index,
     id: item.id || item.itemId || `item_${index}`,
     name: item.name || "Unknown item",
     category: normalizeCategory(item.category),
     primaryColor: attrs.primaryColor || attrs.color || "unknown",
     secondaryColor: attrs.secondaryColor || null,
     pattern: attrs.pattern || "solid",
     material: attrs.material || "unknown",
     style: attrs.style || "casual",
     fit: attrs.fit || "standard",
   };
 });
 const prompt = `You are an expert fashion stylist. Create 3 complete outfit combinations from these clothing items for the occasion: "${occasion}".
AVAILABLE ITEMS:
${descriptions.map(d => `- ID: ${d.id} | Name: "${d.name}" | Category: ${d.category} | Color: ${d.primaryColor}${d.secondaryColor ? " + " + d.secondaryColor : ""} | Pattern: ${d.pattern} | Material: ${d.material} | Style: ${d.style}`).join("\n")}
RULES FOR EACH OUTFIT:
1. MUST include either (a top or outerwear) + (a bottom) OR a dress
2. Include shoes if any are available
3. Include accessories only if they complement the specific color/pattern combo
4. Use REAL fashion color theory:
  - Navy/white, black/white = classic neutrals that always work
  - Earth tones together = cohesive (brown, tan, olive, rust)
  - Monochromatic = same color family different shades
  - Complementary = opposite colors on color wheel
  - If one item has a busy pattern, pair with solid colors only
5. Consider the occasion "${occasion}" when choosing
6. Make all 3 outfits DIFFERENT combinations
Return ONLY a valid JSON array. No explanation. No markdown. Just the array:
[
 {
   "outfitName": "Creative name for the outfit",
   "selectedIds": ["exact_id_1", "exact_id_2"],
   "colorStory": "Specific explanation of color harmony e.g. The navy polo creates a classic contrast with the white chinos",
   "patternNote": "How patterns work together e.g. Solid navy balanced with subtle texture",
   "styleNote": "Why this works for ${occasion} e.g. Smart casual polo and chinos are perfect for a relaxed office environment",
   "colorHarmony": "complementary OR analogous OR neutral OR monochromatic"
 }
]`;
 const response = await fetch("https://api.anthropic.com/v1/messages", {
   method: "POST",
   headers: { 
     "Content-Type": "application/json",
   "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
   "anthropic-version": "2023-06-01",
   "anthropic-dangerous-direct-browser-access": "true"
 },
   body: JSON.stringify({
     model: "claude-sonnet-4-20250514",
     max_tokens: 1500,
     messages: [{ role: "user", content: prompt }]
   })
 });
 if (!response.ok) throw new Error(`API error: ${response.status}`);
 const data = await response.json();
 const text = data.content?.[0]?.text || "[]";
 // Clean the response - remove any markdown formatting
 const clean = text
   .replace(/```json/gi, "")
   .replace(/```/g, "")
   .trim();
 // Find the JSON array in the response
 const startIdx = clean.indexOf("[");
 const endIdx = clean.lastIndexOf("]");
 if (startIdx === -1 || endIdx === -1) throw new Error("No JSON array in response");
 const jsonStr = clean.substring(startIdx, endIdx + 1);
 const outfits = JSON.parse(jsonStr);
 // Map selected IDs back to actual item objects
 return outfits.map(outfit => {
   const selectedItems = outfit.selectedIds
     .map(id => items.find(i => (i.id === id || i.itemId === id)))
     .filter(Boolean);
   // If AI couldn't match IDs exactly, fall back to category-based selection
   if (selectedItems.length < 2) {
     console.warn("ID matching failed, using category fallback");
     return null;
   }
   return {
     outfitName: outfit.outfitName || "Styled Look",
     items: selectedItems,
     colorStory: outfit.colorStory || "",
     patternNote: outfit.patternNote || "",
     styleNote: outfit.styleNote || "",
     colorHarmony: outfit.colorHarmony || "neutral",
   };
 }).filter(Boolean);
}
// ── Fallback: build outfits without AI if API fails ───────────
function buildFallbackOutfits(items, occasion) {
 const normalized = items.map(i => ({ ...i, normCat: normalizeCategory(i.category) }));
 const tops = normalized.filter(i => i.normCat === "tops" || i.normCat === "outerwear");
 const bottoms = normalized.filter(i => i.normCat === "bottoms");
 const dresses = normalized.filter(i => i.normCat === "dresses");
 const shoes = normalized.filter(i => i.normCat === "shoes");
 const accessories = normalized.filter(i => i.normCat === "accessories");
 const pick = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
 const outfits = [];
 for (let i = 0; i < 3; i++) {
   const outfit = [];
   const useDress = dresses.length > 0 && (tops.length === 0 || Math.random() > 0.5);
   if (useDress) {
     const d = pick(dresses); if (d) outfit.push(d);
   } else {
     const t = pick(tops); const b = pick(bottoms);
     if (t) outfit.push(t); if (b) outfit.push(b);
   }
   const s = pick(shoes); const a = pick(accessories);
   if (s) outfit.push(s); if (a) outfit.push(a);
   if (outfit.length >= 2) {
     outfits.push({
       outfitName: `${occasion} Look ${i + 1}`,
       items: outfit,
       colorStory: "These items work well together for a balanced look.",
       patternNote: "Clean combination that avoids pattern clashing.",
       styleNote: `A great choice for ${occasion}.`,
       colorHarmony: "neutral",
     });
   }
 }
 return outfits;
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
 const [debugInfo, setDebugInfo] = useState("");
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
     // Load valid liked items
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
     // Debug info to help diagnose
     const catBreakdown = valid.map(i => `${i.name}(${i.category})`).join(", ");
     setDebugInfo(`${valid.length} items: ${catBreakdown}`);
     if (valid.length < 2) {
       setError("You need at least 2 liked items to generate outfits. Go back and like more items.");
       setLoading(false);
       return;
     }
     const { canMake, tops, bottoms, dresses } = checkCanMakeOutfit(valid);
     if (!canMake) {
       const missing = tops === 0 && dresses === 0
         ? "Like at least one top or dress."
         : "Like at least one bottom or dress.";
       setError(`Cannot build a complete outfit yet. ${missing}`);
       setLoading(false);
       return;
     }
     await generateOutfits(valid, "Casual");
   } catch (err) {
     console.error("Load error:", err);
     setError("Error loading your liked items. Please try again.");
   }
   setLoading(false);
 }
 async function generateOutfits(items, occ) {
   const itemsToUse = items || likedItems;
   const occToUse = occ || occasion;
   if (itemsToUse.length < 2) return;
   setGenerating(true);
   setError("");
   setSavedIds(new Set());
   try {
     // Try AI generation first
     const aiOutfits = await callClaudeForOutfits(itemsToUse, occToUse);
     if (aiOutfits && aiOutfits.length > 0) {
       setOutfits(aiOutfits);
     } else {
       // Fall back to rule-based generation
       const fallback = buildFallbackOutfits(itemsToUse, occToUse);
       setOutfits(fallback);
       setToast("Using style rules to build your outfits.");
     }
   } catch (err) {
     console.error("Generation error:", err);
     // Always fall back gracefully
     const fallback = buildFallbackOutfits(itemsToUse, occToUse);
     if (fallback.length > 0) {
       setOutfits(fallback);
       setToast("AI is busy — using smart style rules instead.");
     } else {
       setError("Could not generate outfits. Please go back and make sure you have liked tops and bottoms.");
     }
   }
   setGenerating(false);
 }
 async function saveOutfit(outfit, index) {
   try {
     const expiresAt = new Date();
     expiresAt.setHours(expiresAt.getHours() + 24);
     await addDoc(collection(db, "savedOutfits"), {
       userId: userProfile.uid,
       itemIds: outfit.items.map(i => i.id || i.itemId || ""),
       itemNames: outfit.items.map(i => i.name || ""),
       itemImages: outfit.items.map(i => i.imageUrl || ""),
       categories: outfit.items.map(i => i.category || ""),
       colorStory: outfit.colorStory || "",
       patternNote: outfit.patternNote || "",
       styleNote: outfit.styleNote || "",
       outfitName: outfit.outfitName || "Saved Outfit",
       colorHarmony: outfit.colorHarmony || "",
       occasion,
       savedAt: new Date().toISOString(),
       expiresAt: expiresAt.toISOString(),
     });
     setSavedIds(prev => new Set([...prev, index]));
     setToast("💗 Outfit saved! View it in Saved.");
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
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<button onClick={() => nav("/liked")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-secondary)" }}>
<i className="ti ti-arrow-left" style={{ fontSize:20 }} aria-hidden="true"></i>
</button>
<div className="logo" style={{ cursor:"pointer" }} onClick={() => nav("/home")}>
           Closet<span>Mingle</span>
</div>
</div>
<span className="badge badge-pink">✨ AI Outfits</span>
</div>
<div className="screen">
<div className="body">
         {/* Occasion selector */}
<div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:12, scrollbarWidth:"none" }}>
           {OCCASIONS.map(o => (
<button key={o} onClick={() => { setOccasion(o); generateOutfits(likedItems, o); }} style={{
               padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:500,
               border:"1px solid", cursor:"pointer", whiteSpace:"nowrap",
               background: occasion === o ? "var(--pink)" : "var(--bg-card)",
               borderColor: occasion === o ? "var(--pink)" : "var(--border)",
               color: occasion === o ? "white" : "var(--text-secondary)"
             }}>{o}</button>
           ))}
</div>
         {/* Based on info */}
         {likedItems.length > 0 && (
<div style={{ background:"var(--pink-light)", border:"1px solid #f4c0d1", borderRadius:"var(--radius)", padding:"10px 14px", marginBottom:14, fontSize:12, color:"var(--pink-dark)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
<span>Based on your {likedItems.length} liked items</span>
<button onClick={() => nav("/liked")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--pink)", fontSize:12, fontWeight:500 }}>Edit liked →</button>
</div>
         )}
         {/* Regenerate button */}
         {!loading && !generating && outfits.length > 0 && (
<button className="btn-outline" onClick={() => generateOutfits(likedItems, occasion)} style={{ marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
             🔄 Regenerate new combinations
</button>
         )}
         {/* Loading */}
         {(loading || generating) && (
<div style={{ textAlign:"center", padding:"60px 20px" }}>
<div style={{ fontSize:40, marginBottom:12 }}>✨</div>
<div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>
               {loading ? "Loading your liked items..." : "AI is styling your outfits..."}
</div>
<div style={{ fontSize:12, color:"var(--text-secondary)" }}>
               Analyzing colors, patterns and materials
</div>
</div>
         )}
         {/* Error state */}
         {!loading && !generating && error && (
<div style={{ textAlign:"center", padding:"40px 20px" }}>
<div style={{ fontSize:40, marginBottom:12 }}>😕</div>
<div style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>Could not generate outfits</div>
<div style={{ background:"var(--pink-light)", border:"1px solid #f4c0d1", borderRadius:"var(--radius)", padding:"12px 14px", fontSize:13, color:"var(--pink-dark)", marginBottom:20, textAlign:"left" }}>
               {error}
</div>
             {debugInfo && (
<div style={{ background:"var(--bg)", borderRadius:"var(--radius)", padding:"10px 14px", fontSize:11, color:"var(--text-tertiary)", marginBottom:16, textAlign:"left" }}>
<strong>Your liked items:</strong> {debugInfo}
</div>
             )}
<button className="btn-pink" onClick={() => nav("/liked")} style={{ width:"auto", padding:"10px 24px" }}>
               ← Back to liked items
</button>
</div>
         )}
         {/* Generated outfits */}
         {!loading && !generating && !error && outfits.map((outfit, index) => (
<div key={index} className="card" style={{ padding:0, overflow:"hidden", marginBottom:16 }}>
             {/* Header */}
<div style={{ padding:"14px 14px 10px", background: harmonyBg[outfit.colorHarmony] || "var(--bg)" }}>
<div style={{ fontSize:16, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>
                 {outfit.outfitName}
</div>
<div style={{ display:"flex", gap:6, alignItems:"center" }}>
<span className="badge badge-pink" style={{ fontSize:10 }}>{occasion}</span>
                 {outfit.colorHarmony && (
<span style={{ fontSize:10, background:"rgba(255,255,255,0.7)", borderRadius:20, padding:"2px 8px", textTransform:"capitalize", color:"var(--text-secondary)" }}>
                     {outfit.colorHarmony} palette
</span>
                 )}
</div>
</div>
<div style={{ padding:"12px 14px 8px" }}>
               {/* Item photos */}
<div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", marginBottom:12, paddingBottom:4 }}>
                 {outfit.items.map((item, i) => (
<div key={i} style={{ flexShrink:0, textAlign:"center" }}>
                     {item.imageUrl
                       ? <img src={item.imageUrl} alt={item.name}
                           onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                           style={{ width:80, height:80, borderRadius:12, objectFit:"cover", border:"0.5px solid var(--border)", background:"repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 8px 8px" }} />
                       : <div style={{ width:80, height:80, borderRadius:12, background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>👗</div>
                     }
<div style={{ fontSize:9, color:"var(--text-tertiary)", marginTop:3, textTransform:"capitalize", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                       {item.category}
</div>
                     {item.attributes?.primaryColor && (
<div style={{ fontSize:9, color:"var(--text-tertiary)", textTransform:"capitalize" }}>
                         {item.attributes.primaryColor}
</div>
                     )}
</div>
                 ))}
</div>
               {/* Color story */}
               {outfit.colorStory && (
<div style={{ background:"var(--pink-light)", borderRadius:8, padding:"8px 12px", marginBottom:8, fontSize:12, color:"var(--pink-dark)" }}>
                   🎨 <strong>Color story:</strong> {outfit.colorStory}
</div>
               )}
               {/* Pattern note */}
               {outfit.patternNote && (
<div style={{ background:"var(--bg)", borderRadius:8, padding:"8px 12px", marginBottom:8, fontSize:12, color:"var(--text-secondary)" }}>
                   🔲 <strong>Patterns:</strong> {outfit.patternNote}
</div>
               )}
               {/* Style note */}
               {outfit.styleNote && (
<div style={{ background:"var(--bg)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"var(--text-secondary)" }}>
                   ✨ <strong>Why it works:</strong> {outfit.styleNote}
</div>
               )}
               {/* 24hr warning */}
<div style={{ background:"#fff8e7", border:"1px solid #fcd34d", borderRadius:8, padding:"6px 10px", marginBottom:10, fontSize:11, color:"#92400e" }}>
                 ⏰ Saved outfits expire in 24 hours. Screenshot to keep forever!
</div>
               {/* Save button */}
               {savedIds.has(index) ? (
<div style={{ textAlign:"center", padding:"10px", fontSize:14, color:"var(--success)", fontWeight:500 }}>
                   ✅ Saved! <span style={{ color:"var(--pink)", cursor:"pointer", textDecoration:"underline" }} onClick={() => nav("/saved")}>View in Saved →</span>
</div>
               ) : (
<button className="btn-pink" onClick={() => saveOutfit(outfit, index)}>
                   💗 Save this outfit
</button>
               )}
</div>
</div>
         ))}
         {/* View saved */}
         {savedIds.size > 0 && (
<button className="btn-outline" onClick={() => nav("/saved")} style={{ marginBottom:20 }}>
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