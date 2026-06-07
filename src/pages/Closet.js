import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import CameraModal from "../components/CameraModal";
import Toast from "../components/Toast";

const CATEGORIES = ["All","Tops","Bottoms","Dresses","Shoes","Accessories","Outerwear"];
const OCCASIONS = ["Casual","Work / Office","Date Night","Brunch","Formal","Travel","Workout"];
const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

function guessCategory(name, selectedCategory) {
  if (selectedCategory && selectedCategory !== "All") return selectedCategory.toLowerCase();
  const n = name.toLowerCase();
  if (/jacket|coat|blazer|hoodie|cardigan/.test(n)) return "outerwear";
  if (/shirt|top|blouse|tee|crop|tank|sweater/.test(n)) return "tops";
  if (/pant|jean|short|skirt|trouser|legging/.test(n)) return "bottoms";
  if (/dress|romper|jumpsuit/.test(n)) return "dresses";
  if (/shoe|boot|sneaker|heel|sandal|loafer/.test(n)) return "shoes";
  if (/bag|purse|belt|scarf|hat|necklace|earring/.test(n)) return "accessories";
  return "tops";
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  if (!response.ok) throw new Error("Upload failed");
  const data = await response.json();
  const bgRemovedUrl = data.secure_url.replace("/upload/", "/upload/e_background_removal/");
  return { imageUrl: bgRemovedUrl, fallbackUrl: data.secure_url, publicId: data.public_id };
}

async function analyzeClothing(imageUrl, category, name) {
  try {
    const cleanUrl = imageUrl.replace("/upload/e_background_removal/", "/upload/");
    const response = await fetch("/api/analyze-clothing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: cleanUrl, category, name }),
    });
    if (!response.ok) return { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
    const data = await response.json();
    return data.attributes || { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
  } catch (e) {
    return { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
  }
}

// ── Occasion tags selector ────────────────────────────────────
function OccasionTags({ selected, onChange }) {
  function toggle(occ) {
    onChange(selected.includes(occ) ? selected.filter(o => o !== occ) : [...selected, occ]);
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Tag occasions (select all that apply):</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {OCCASIONS.map(occ => (
          <button key={occ} onClick={() => toggle(occ)} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: "1px solid", cursor: "pointer",
            background: selected.includes(occ) ? "var(--pink)" : "var(--bg-card)",
            borderColor: selected.includes(occ) ? "var(--pink)" : "var(--border)",
            color: selected.includes(occ) ? "white" : "var(--text-secondary)",
          }}>{occ}</button>
        ))}
      </div>
    </div>
  );
}

// ── Item edit modal ───────────────────────────────────────────
function ItemEditModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item.name || "");
  const [category, setCategory] = useState(item.category || "tops");
  const [occasions, setOccasions] = useState(item.occasions || []);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(item.id, { name, category, occasions });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Edit item</div>

        {/* Item photo */}
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name}
            onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
            style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", marginBottom: 14, border: "0.5px solid var(--border)" }} />
        )}

        {/* Rename */}
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Item name</div>
        <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Item name" />

        {/* Edit category */}
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Category</div>
        <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ cursor: "pointer" }}>
          {["tops","bottoms","dresses","shoes","accessories","outerwear"].map(c => (
            <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        {/* Occasion tags */}
        <OccasionTags selected={occasions} onChange={setOccasions} />

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn-outline btn-sm" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button className="btn-pink btn-sm" onClick={save} disabled={saving || !name.trim()} style={{ flex: 1 }}>
            {saving ? <span className="spinner"></span> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Closet() {
  const { userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [occasionFilter, setOccasionFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name | category
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReanalyzeBtn, setShowReanalyzeBtn] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState("");

  useEffect(() => {
    if (userProfile?.uid) fetchItems();
  }, [userProfile]);

  async function fetchItems() {
    setLoading(true);
    try {
      const q = query(collection(db, "closetItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(fetched);
      setShowReanalyzeBtn(fetched.some(i => !i.attributes?.primaryColor || i.attributes?.primaryColor === "unknown"));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handlePhotos(files) {
    setShowCamera(false);
    setUploading(true);
    const fileArray = Array.from(files);
    const existingHashes = new Set(items.map(i => i.fileHash).filter(Boolean));
    let uploaded = 0;
    let duplicates = 0;
    const newItems = [];

    for (const file of fileArray) {
      try {
        // ── Duplicate detection using file size + name as a simple hash ──
        const simpleHash = `${file.name}_${file.size}`;
        if (existingHashes.has(simpleHash)) {
          duplicates++;
          continue;
        }

        setUploadProgress(`Uploading ${uploaded + 1} of ${fileArray.length - duplicates}...`);
        const { imageUrl, fallbackUrl, publicId } = await uploadToCloudinary(file);
        const category = guessCategory(file.name, filter);
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 30);
        setUploadProgress(`Analyzing item ${uploaded + 1}...`);
        const attributes = await analyzeClothing(fallbackUrl, category, name);
        const newItem = {
          userId: userProfile.uid,
          name, category, imageUrl, fallbackUrl, publicId, attributes,
          occasions: [],
          fileHash: simpleHash,
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "closetItems"), newItem);
        newItems.push({ id: docRef.id, ...newItem });
        existingHashes.add(simpleHash);
        uploaded++;
      } catch (e) {
        console.error("Upload error:", e);
        setToast(`Failed to upload ${file.name}.`);
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setUploadProgress("");
    setUploading(false);
    if (duplicates > 0) setToast(`⚠️ ${duplicates} duplicate item${duplicates !== 1 ? "s" : ""} skipped.`);
    else if (uploaded > 0) setToast(`✅ ${uploaded} item${uploaded !== 1 ? "s" : ""} added! Tap any item to edit or tag occasions.`);
  }

  async function saveItemEdits(itemId, updates) {
    try {
      await updateDoc(doc(db, "closetItems", itemId), updates);
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
      setToast("Item updated!");
    } catch (e) { console.error(e); }
  }

  async function removeItem(item, e) {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "closetItems", item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setToast("Item removed.");
    } catch (e) { console.error(e); }
  }

  async function reanalyzeAll() {
    setReanalyzing(true);
    const toUpdate = items.filter(i => !i.attributes?.primaryColor || i.attributes?.primaryColor === "unknown");
    let updated = 0;
    for (const item of toUpdate) {
      try {
        setReanalyzeProgress(`Analyzing ${updated + 1} of ${toUpdate.length} — ${item.name}...`);
        const cleanUrl = (item.fallbackUrl || item.imageUrl || "").replace("/upload/e_background_removal/", "/upload/");
        const response = await fetch("/api/analyze-clothing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: cleanUrl, category: item.category, name: item.name }),
        });
        if (response.ok) {
          const data = await response.json();
          const attributes = data.attributes;
          if (attributes?.primaryColor && attributes.primaryColor !== "unknown") {
            await updateDoc(doc(db, "closetItems", item.id), { attributes });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, attributes } : i));
            updated++;
          }
        }
      } catch (e) { console.error(e); }
    }
    setReanalyzeProgress("");
    setReanalyzing(false);
    setShowReanalyzeBtn(false);
    setToast(`✅ Updated ${updated} item${updated !== 1 ? "s" : ""} with color detection!`);
  }

  // ── Filter + search + sort ────────────────────────────────
  const filtered = items
    .filter(item => filter === "All" || item.category.toLowerCase() === filter.toLowerCase())
    .filter(item => occasionFilter === "All" || (item.occasions || []).includes(occasionFilter))
    .filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return 0;
    });

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }}><em>closet</em><span>mingle</span></div>
        {filter !== "All" && (
          <button className="btn-pink btn-sm" onClick={() => setShowCamera(true)} disabled={uploading}>
            {uploading ? <span className="spinner"></span> : <><i className="ti ti-plus" aria-hidden="true"></i> Add {filter}</>}
          </button>
        )}
      </div>

      <div className="screen">
        <div className="body">
          {/* Upload progress */}
          {uploading && uploadProgress && (
            <div style={{ background: "var(--pink-light)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "var(--pink-dark)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: "var(--pink)", borderColor: "rgba(212,83,126,0.2)", width: 16, height: 16 }}></span>
              {uploadProgress}
            </div>
          )}

          {/* Re-analyze banner */}
          {showReanalyzeBtn && !reanalyzing && (
            <div style={{ background: "#fff8e7", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span>Some items have unknown colors</span>
              <button onClick={reanalyzeAll} style={{ background: "#d97706", border: "none", borderRadius: 20, padding: "5px 14px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>Fix now</button>
            </div>
          )}
          {reanalyzing && reanalyzeProgress && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#3730a3", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: "#3730a3", borderColor: "rgba(55,48,163,0.2)", width: 16, height: 16 }}></span>
              {reanalyzeProgress}
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", fontSize: 16 }} aria-hidden="true"></i>
            <input className="input-field" placeholder="Search your closet..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36, marginBottom: 0 }} />
          </div>

          {/* Sort selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>Sort by:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 12, border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="category">Category</option>
            </select>
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8, scrollbarWidth: "none" }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
                background: filter === c ? "var(--pink)" : "var(--bg-card)",
                borderColor: filter === c ? "var(--pink)" : "var(--border)",
                color: filter === c ? "white" : "var(--text-secondary)"
              }}>{c}</button>
            ))}
          </div>

          {/* Occasion filter */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
            <button onClick={() => setOccasionFilter("All")} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid", cursor: "pointer", whiteSpace: "nowrap", background: occasionFilter === "All" ? "#3730a3" : "var(--bg-card)", borderColor: occasionFilter === "All" ? "#3730a3" : "var(--border)", color: occasionFilter === "All" ? "white" : "var(--text-secondary)" }}>All occasions</button>
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => setOccasionFilter(o)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid", cursor: "pointer", whiteSpace: "nowrap", background: occasionFilter === o ? "#3730a3" : "var(--bg-card)", borderColor: occasionFilter === o ? "#3730a3" : "var(--border)", color: occasionFilter === o ? "white" : "var(--text-secondary)" }}>{o}</button>
            ))}
          </div>

          {filter === "All" && occasionFilter === "All" && !searchQuery && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#3730a3", display: "flex", gap: 8 }}>
              <span></span>
              <span>Select a <strong>category</strong> to add items. Tap any item to <strong>rename, edit or tag occasions</strong>.</span>
            </div>
          )}

          {/* Item count */}
          {filtered.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""} {searchQuery ? `matching "${searchQuery}"` : ""}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading your closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👗</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                {searchQuery ? `No items match "${searchQuery}"` : items.length === 0 ? "Your closet is empty" : `No ${filter.toLowerCase()} yet`}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                {searchQuery ? "Try a different search term" : filter === "All" ? "Select a category above to start adding items" : `Tap + Add ${filter} to upload photos`}
              </div>
              {filter !== "All" && !searchQuery && (
                <button className="btn-pink" onClick={() => setShowCamera(true)} style={{ width: "auto", padding: "10px 24px" }}>
                  <i className="ti ti-camera-plus" aria-hidden="true"></i> Add {filter}
                </button>
              )}
            </div>
          ) : (
            <div className="closet-grid">
              {filtered.map(item => (
                <div key={item.id} className="closet-item" onClick={() => setSelectedItem(item)}>
                  <img src={item.imageUrl} alt={item.name}
                    onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                    style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 10px 10px" }}
                  />
                  <button className="remove-btn" onClick={e => removeItem(item, e)} aria-label="Remove">×</button>
                  {/* Tap to edit hint */}
                  <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.45)", borderRadius: 10, padding: "2px 7px", fontSize: 9, color: "white" }}>
                    ✏️ Edit
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.65))", padding: "16px 6px 4px" }}>
                    <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {item.attributes?.primaryColor && item.attributes.primaryColor !== "unknown" && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>{item.attributes.primaryColor} · {item.attributes.pattern}</div>
                    )}
                    {item.occasions?.length > 0 && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)" }}>{item.occasions.slice(0, 2).join(" · ")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar active="closet" type="client" />

      {showCamera && (
        <CameraModal
          onPhoto={file => handlePhotos([file])}
          onMultiplePhotos={handlePhotos}
          onClose={() => setShowCamera(false)}
        />
      )}
      {selectedItem && (
        <ItemEditModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={saveItemEdits}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
