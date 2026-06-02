import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import CameraModal from "../components/CameraModal";
import Toast from "../components/Toast";

const CATEGORIES = ["All","Tops","Bottoms","Dresses","Shoes","Accessories","Outerwear"];
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

// Simple reliable upload to Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const data = await response.json();

  // Try to get background removed version using Cloudinary transformation URL
  // This uses the free background removal transformation
  const bgRemovedUrl = data.secure_url.replace(
    "/upload/",
    "/upload/e_background_removal/"
  );

  return {
    imageUrl: bgRemovedUrl,
    fallbackUrl: data.secure_url,
    publicId: data.public_id,
  };
}

// Use Claude AI to analyze clothing from image
async function analyzeClothing(imageUrl, category, name) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json",
   "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
   "anthropic-version": "2023-06-01",
   "anthropic-dangerous-direct-browser-access": "true"
 },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: `Analyze this ${category} item called "${name}". Return ONLY JSON:
{"primaryColor":"color name","pattern":"solid/striped/plaid/floral/graphic/other","material":"cotton/denim/silk/wool/polyester/leather/unknown","style":"casual/formal/business/sporty/classic"}` }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    return { primaryColor: "unknown", pattern: "solid", material: "unknown", style: "casual" };
  }
}

export default function Closet() {
  const { userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

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
        const name = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase())
          .slice(0, 30);

        setUploadProgress(`Analyzing item ${uploaded + 1} of ${fileArray.length}...`);
        const attributes = await analyzeClothing(fallbackUrl, category, name);

        const newItem = {
          userId: userProfile.uid,
          name,
          category,
          imageUrl,
          fallbackUrl,
          publicId,
          attributes,
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, "closetItems"), newItem);
        newItems.push({ id: docRef.id, ...newItem });
        uploaded++;
      } catch (e) {
        console.error("Upload error:", e);
        setToast(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setUploadProgress("");
    setUploading(false);
    if (uploaded > 0) {
      setToast(`✅ ${uploaded} item${uploaded !== 1 ? "s" : ""} added to your closet!`);
    }
  }

  async function removeItem(item) {
    try {
      await deleteDoc(doc(db, "closetItems", item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setToast("Item removed.");
    } catch (e) { console.error(e); }
  }

  const filtered = filter === "All" ? items : items.filter(i => i.category.toLowerCase() === filter.toLowerCase());

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
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

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14, scrollbarWidth: "none" }}>
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

          {filter === "All" && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#3730a3", display: "flex", gap: 8 }}>
              <span>💡</span>
              <span>Select a category tab above to add items to your closet.</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading your closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👗</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                {items.length === 0 ? "Your closet is empty" : `No ${filter.toLowerCase()} yet`}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                {filter === "All" ? "Select a category above to start adding items" : `Tap + Add ${filter} to upload photos`}
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
                <div key={item.id} className="closet-item">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    onError={e => { e.target.src = item.fallbackUrl || item.imageUrl; }}
                    style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 10px 10px" }}
                  />
                  <button className="remove-btn" onClick={() => removeItem(item)} aria-label="Remove">×</button>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.6))", padding: "16px 6px 4px" }}>
                    <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {item.attributes?.primaryColor && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", textTransform: "capitalize" }}>
                        {item.attributes.primaryColor} · {item.attributes.pattern}
                      </div>
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
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
