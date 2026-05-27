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

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "closet-mingle");
  // e_background_removal tells Cloudinary to automatically remove the background
  formData.append("eager", "e_background_removal");
  formData.append("eager_async", "false");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!response.ok) throw new Error("Upload failed");
  const data = await response.json();

  // Use the background-removed version if available, otherwise use original
  const bgRemovedUrl = data.eager?.[0]?.secure_url || data.secure_url;

  // Also analyze the image to get color and attributes using Cloudinary AI
  const analyzedUrl = bgRemovedUrl.replace("/upload/", "/upload/e_background_removal/");

  return {
    imageUrl: bgRemovedUrl,
    originalUrl: data.secure_url,
    publicId: data.public_id,
  };
}

// Use Claude AI to analyze clothing attributes from image
async function analyzeClothingAttributes(imageUrl, category, name) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl }
            },
            {
              type: "text",
              text: `Analyze this ${category} clothing item called "${name}". Return ONLY a JSON object with these fields:
{
  "primaryColor": "the main color name",
  "secondaryColor": "second color if present or null",
  "pattern": "solid, striped, plaid, floral, geometric, animal print, graphic, or other",
  "material": "cotton, denim, silk, wool, polyester, linen, leather, or unknown",
  "style": "casual, formal, business, sporty, bohemian, streetwear, or classic",
  "fit": "fitted, loose, oversized, or standard"
}
Return only the JSON, no other text.`
            }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    return {
      primaryColor: "unknown",
      pattern: "solid",
      material: "unknown",
      style: "casual",
      fit: "standard"
    };
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
        setUploadProgress(`Processing ${uploaded + 1} of ${fileArray.length} — removing background...`);
        const { imageUrl, originalUrl, publicId } = await uploadToCloudinary(file);

        setUploadProgress(`Analyzing clothing ${uploaded + 1} of ${fileArray.length}...`);
        const category = guessCategory(file.name, filter);
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 30);

        // AI analyzes color, pattern, material from the actual photo
        const attributes = await analyzeClothingAttributes(imageUrl || originalUrl, category, name);

        const newItem = {
          userId: userProfile.uid,
          name,
          category,
          imageUrl,
          originalUrl,
          publicId,
          attributes, // color, pattern, material, style, fit
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, "closetItems"), newItem);
        newItems.push({ id: docRef.id, ...newItem });
        uploaded++;
      } catch (e) {
        console.error("Failed:", file.name, e);
        setToast(`Failed to upload ${file.name}`);
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setUploadProgress("");
    setUploading(false);

    if (uploaded > 0) {
      setToast(`✅ ${uploaded} item${uploaded !== 1 ? "s" : ""} added with background removed!`);
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
              <span className="spinner" style={{ borderTopColor: "var(--pink-dark)", borderColor: "rgba(212,83,126,0.3)" }}></span>
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
              <span>Select a category tab above to add items. Photos are automatically analyzed for color, pattern and style.</span>
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
                {filter === "All" ? "Select a category above to start adding items" : `Tap + Add ${filter} to upload`}
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
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} style={{ background: "repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 0 0 / 10px 10px" }} />
                    : <div className="closet-item-placeholder"><i className="ti ti-shirt" aria-hidden="true"></i></div>
                  }
                  <button className="remove-btn" onClick={() => removeItem(item)} aria-label="Remove">×</button>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.6))", padding: "16px 6px 4px" }}>
                    <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {item.attributes?.primaryColor && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", textTransform: "capitalize" }}>
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
          onPhoto={(file) => handlePhotos([file])}
          onMultiplePhotos={handlePhotos}
          onClose={() => setShowCamera(false)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
