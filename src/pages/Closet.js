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

function guessCategory(name) {
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
  return data.secure_url;
}

export default function Closet() {
  const { userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);

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

  async function handlePhoto(file) {
    setShowCamera(false);
    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      const category = guessCategory(file.name);
      const newItem = {
        userId: userProfile.uid,
        name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 30),
        category,
        imageUrl,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "closetItems"), newItem);
      setItems(prev => [...prev, { id: docRef.id, ...newItem }]);
      setToast("Item added to your closet!");
    } catch (e) {
      setToast("Upload failed. Check your internet and try again.");
    }
    setUploading(false);
  }

  async function removeItem(item) {
    try {
      await deleteDoc(doc(db, "closetItems", item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      setToast("Item removed.");
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = filter === "All" ? items : items.filter(i => i.category.toLowerCase() === filter.toLowerCase());

  return (
    <>
      <div className="header">
        <div className="logo">Closet<span>Mingle</span></div>
        <button className="btn-pink btn-sm" onClick={() => setShowCamera(true)} disabled={uploading}>
          {uploading ? <span className="spinner"></span> : <><i className="ti ti-plus" aria-hidden="true"></i> Add</>}
        </button>
      </div>
      <div className="screen">
        <div className="body">
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:14, scrollbarWidth:"none" }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                border:"1px solid", cursor:"pointer", whiteSpace:"nowrap",
                background: filter===c ? "var(--pink)" : "var(--bg-card)",
                borderColor: filter===c ? "var(--pink)" : "var(--border)",
                color: filter===c ? "white" : "var(--text-secondary)"
              }}>{c}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:"var(--text-tertiary)" }}>Loading your closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👗</div>
              <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>
                {items.length === 0 ? "Your closet is empty" : `No ${filter.toLowerCase()} yet`}
              </div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:20 }}>Tap + Add to upload your clothing items</div>
              <button className="btn-pink" onClick={() => setShowCamera(true)} style={{ width:"auto", padding:"10px 24px" }}>
                <i className="ti ti-camera-plus" aria-hidden="true"></i> Add first item
              </button>
            </div>
          ) : (
            <div className="closet-grid">
              {filtered.map(item => (
                <div key={item.id} className="closet-item">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} />
                    : <div className="closet-item-placeholder"><i className="ti ti-shirt" aria-hidden="true"></i><span>{item.category}</span></div>
                  }
                  <button className="remove-btn" onClick={() => removeItem(item)} aria-label="Remove">×</button>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.5))", padding:"16px 6px 4px" }}>
                    <div style={{ fontSize:10, color:"white", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  </div>
                </div>
              ))}
              <div className="closet-item" style={{ cursor:"pointer", border:"2px dashed var(--border)" }} onClick={() => setShowCamera(true)}>
                <div className="closet-item-placeholder">
                  <i className="ti ti-plus" style={{ fontSize:28, color:"var(--pink)" }} aria-hidden="true"></i>
                  <span style={{ color:"var(--pink)" }}>Add</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <TabBar active="closet" type="client" />
      {showCamera && <CameraModal onPhoto={handlePhoto} onClose={() => setShowCamera(false)} />}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
