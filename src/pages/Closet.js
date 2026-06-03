import React, { useState, useEffect } from "react";
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
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!response.ok) throw new Error("Upload failed");
  const data = await response.json();
  const bgRemovedUrl = data.secure_url.replace("/upload/", "/upload/e_background_removal/");
  return { imageUrl: bgRemovedUrl, fallbackUrl: data.secure_url, publicId: data.public_id };
}

async function analyzeClothing(imageUrl, category, name) {
  try {
    const response = await fetch("/api/analyze-clothing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, category, name }),
    });
    if (!response.ok) return { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
    const data = await response.json();
    return data.attributes || { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
  } catch (e) {
    return { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual", fit: "standard" };
  }
}

// ── Occasion tag selector component ──────────────────────────
function OccasionTags({ selected, onChange }) {
  function toggle(occ) {
    if (selected.includes(occ)) onChange(selected.filter(o => o !== occ));
    else onChange([...selected, occ]);
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Tag occasions (optional — select all that apply):</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {OCCASIONS.map(occ => (
          <button key={occ} onClick={() => toggle(occ)} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: "1px solid", cursor: "pointer",
            background: selected.includes(occ) ? "var(--pink)" : "var(--bg-card)",
            borderColor: selected.includes(occ) ? "var(--pink)" : "var(--border)",
            color: selected.includes(occ) ? "white" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}>{occ}</button>
        ))}
      </div>
    </div>
  );
}

// ── Item detail modal ─────────────────────────────────────────
function ItemDetailModal({ item, onClose, onSave }) {
  const [occasions, setOccasions] = useState(item.occasions || []);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(item.id, occasions);
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name}
              onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
              style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "0.5px solid var(--border)" }} />
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>{item.category}</div>
            {item.attributes?.primaryColor && (
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "capitalize" }}>
                {item.attributes.primaryColor} · {item.attributes.pattern}
              </div>
            )}
          </div>
        </div>
        <OccasionTags selected={occasions} onChange={setOccasions} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn-outline btn-sm" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>Cancel</button>
          <button className="btn-pink btn-sm" onClick={save} disabled={saving} style={{ flex: 1 }}>
            {saving ? <span className="spinner"></span> : "Save tags"}
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
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function fetchItems() {
      if (!userProfile?.uid) return;
      setLoading(true);
      const q = query(collection(db, "closetItems"), where("userId", "==", userProfile.uid));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    fetchItems();
  }, [userProfile]);

  async function handlePhotos(files) {
    setShowCamera(false);
    setUploading(true);
    const fileArray = Array.from(files);
    let uploaded = 0;
    const newItems = [];
    for (const file of fileArray) {
      try {
        setUploadProgress(`Uploading ${uploaded + 1} of ${fileArray.length}...`);
        const { imageUrl, fallbackUrl, publicId } = await uploadToCloudinary(file);
        const category = guessCategory(file.name, filter);
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 30);
        setUploadProgress(`Analyzing item ${uploaded + 1} of ${fileArray.length}...`);
        const attributes = await analyzeClothing(fallbackUrl, category, name);
        const newItem = {
          userId: userProfile.uid,
          name, category, imageUrl, fallbackUrl, publicId, attributes,
          occasions: [], // user can tag later
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "closetItems"), newItem);
        newItems.push({ id: docRef.id, ...newItem });
        uploaded++;
      } catch (e) {
        console.error("Upload error:", e);
        setToast(`Failed to upload ${file.name}.`);
      }
    }
    setItems(prev => [...prev, ...newItems]);
    setUploadProgress("");
    setUploading(false);
    if (uploaded > 0) setToast(`✅ ${uploaded} item${uploaded !== 1 ? "s" : ""} added! Tap any item to add occasion tags.`);
  }

  async function saveOccasionTags(itemId, occasions) {
    await updateDoc(doc(db, "closetItems", itemId), { occasions });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, occasions } : i));
    setToast("Occasion tags saved!");
  }

  async function removeItem(item, e) {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "closetItems", item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setToast("Item removed.");
    } catch (e) { console.error(e); }
  }

  // Filter by category AND occasion
  const filtered = items.filter(item => {
    const catMatch = filter === "All" || item.category.toLowerCase() === filter.toLowerCase();
    const occMatch = occasionFilter === "All" || (item.occasions || []).includes(occasionFilter);
    return catMatch && occMatch;
  });

  return (
    <>
      <div className="header">
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => {}}>Closet<span>Mingle</span></div>
        {filter !== "All" && (
          <button className="btn-pink btn-sm" onClick={() => setShowCamera(true)} disabled={uploading}>
            {uploading ? <span className="spinner"></span> : <><i className="ti ti-plus" aria-hidden="true"></i> Add {filter}</>}
          </button>
        )}
      </div>

      <div className="screen">
        <div className="body">
          {uploading && uploadProgress && (
            <div style={{ background: "var(--pink-light)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "var(--pink-dark)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ borderTopColor: "var(--pink)", borderColor: "rgba(212,83,126,0.2)", width: 16, height: 16 }}></span>
              {uploadProgress}
            </div>
          )}

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
            <button onClick={() => setOccasionFilter("All")} style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
              border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
              background: occasionFilter === "All" ? "#3730a3" : "var(--bg-card)",
              borderColor: occasionFilter === "All" ? "#3730a3" : "var(--border)",
              color: occasionFilter === "All" ? "white" : "var(--text-secondary)"
            }}>All occasions</button>
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => setOccasionFilter(o)} style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: "1px solid", cursor: "pointer", whiteSpace: "nowrap",
                background: occasionFilter === o ? "#3730a3" : "var(--bg-card)",
                borderColor: occasionFilter === o ? "#3730a3" : "var(--border)",
                color: occasionFilter === o ? "white" : "var(--text-secondary)"
              }}>{o}</button>
            ))}
          </div>

          {filter === "All" && occasionFilter === "All" && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#3730a3", display: "flex", gap: 8 }}>
              <span>💡</span>
              <span>Select a <strong>category tab</strong> to add items. Tap any item to add <strong>occasion tags</strong>.</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading your closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👗</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                {items.length === 0 ? "Your closet is empty" : `No items found`}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                {filter === "All" ? "Select a category tab above to add items" : `Tap + Add ${filter} to upload photos`}
              </div>
              {filter !== "All" && (
                <button className="btn-pink" onClick={() => setShowCamera(true)} style={{ width: "auto", padding: "10px 24px" }}>
                  <i className="ti ti-camera-plus" aria-hidden="true"></i> Add {filter}
                </button>
              )}
            </div>
          ) : (
            <div className="closet-grid">
              {filtered.map(item => (
                <div key={item.id} className="closet-item" onClick={() => setSelectedItem(item)}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                    style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 10px 10px" }}
                  />
                  <button className="remove-btn" onClick={e => removeItem(item, e)} aria-label="Remove">×</button>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.65))", padding: "16px 6px 4px" }}>
                    <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {item.occasions?.length > 0 && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)" }}>{item.occasions.slice(0, 2).join(" · ")}</div>
                    )}
                  </div>
                  {/* Occasion tag indicator */}
                  {(!item.occasions || item.occasions.length === 0) && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "rgba(212,83,126,0.85)", borderRadius: 10, padding: "2px 6px", fontSize: 9, color: "white" }}>
                      + Tag
                    </div>
                  )}
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
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={saveOccasionTags}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
