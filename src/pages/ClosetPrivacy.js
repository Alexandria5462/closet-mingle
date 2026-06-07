import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import TabBar from "../components/TabBar";
import Toast from "../components/Toast";

export default function ClosetPrivacy() {
  const nav = useNavigate();
  const { userProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("All");

  const CATEGORIES = ["All","Tops","Bottoms","Dresses","Shoes","Accessories","Outerwear"];

  useEffect(() => {
    if (userProfile?.uid) loadItems();
  }, [userProfile]);

  async function loadItems() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "closetItems"), where("userId", "==", userProfile.uid))
      );
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function togglePrivacy(item) {
    const newVal = !item.isPrivate;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPrivate: newVal } : i));
    try {
      await updateDoc(doc(db, "closetItems", item.id), { isPrivate: newVal });
    } catch (e) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPrivate: item.isPrivate } : i));
      setToast("Failed to update. Try again.");
    }
  }

  async function setAllPublic() {
    setSaving(true);
    try {
      const updates = items.map(item =>
        updateDoc(doc(db, "closetItems", item.id), { isPrivate: false })
      );
      await Promise.all(updates);
      setItems(prev => prev.map(i => ({ ...i, isPrivate: false })));
      setToast("All items set to public.");
    } catch (e) { setToast("Failed to update."); }
    setSaving(false);
  }

  async function setAllPrivate() {
    setSaving(true);
    try {
      const updates = items.map(item =>
        updateDoc(doc(db, "closetItems", item.id), { isPrivate: true })
      );
      await Promise.all(updates);
      setItems(prev => prev.map(i => ({ ...i, isPrivate: true })));
      setToast("All items set to private.");
    } catch (e) { setToast("Failed to update."); }
    setSaving(false);
  }

  const filtered = items.filter(i =>
    filter === "All" || i.category?.toLowerCase() === filter.toLowerCase()
  );
  const publicCount = items.filter(i => !i.isPrivate).length;
  const privateCount = items.filter(i => i.isPrivate).length;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div className="logo" style={{ cursor: "pointer" }} onClick={() => nav("/home")}>
            <em>closet</em><span>mingle</span>
          </div>
        </div>
      </div>

      <div className="screen">
        <div className="body">
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Closet Privacy</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
            Choose which items your stylist can see during a session. Private items are hidden from stylists.
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Visible to stylist</div>
              <div className="stat-val" style={{ fontSize: 20, color: "var(--success)" }}>{publicCount}</div>
            </div>
            <div className="stat-card" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div className="stat-label">Private</div>
              <div className="stat-val" style={{ fontSize: 20 }}>{privateCount}</div>
            </div>
          </div>

          {/* Bulk actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={setAllPublic}
              disabled={saving}
              style={{ flex: 1, padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "var(--text-primary)" }}
            >
              Make all visible
            </button>
            <button
              onClick={setAllPrivate}
              disabled={saving}
              style={{ flex: 1, padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "var(--text-primary)" }}
            >
              Make all private
            </button>
          </div>

          {/* Info card */}
          <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>How it works:</strong> When a stylist views your closet they can only see items marked as visible. Items marked private stay completely hidden.
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
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

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading your closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>No items in this category</div>
          ) : (
            <div className="closet-grid">
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => togglePrivacy(item)}
                  style={{ position: "relative", cursor: "pointer", opacity: item.isPrivate ? 0.5 : 1, transition: "opacity 0.2s" }}
                >
                  <div className="closet-item" style={{ border: `2px solid ${item.isPrivate ? "var(--border)" : "var(--success)"}` }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      onError={e => { if (item.fallbackUrl) e.target.src = item.fallbackUrl; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {/* Privacy badge */}
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: item.isPrivate ? "rgba(0,0,0,0.7)" : "rgba(74,103,65,0.9)",
                      borderRadius: 20, padding: "3px 8px", fontSize: 10,
                      color: "white", fontWeight: 500
                    }}>
                      {item.isPrivate ? "Private" : "Visible"}
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.65))", padding: "16px 6px 4px" }}>
                      <div style={{ fontSize: 10, color: "white", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
            Tap any item to toggle between visible and private
          </div>
        </div>
      </div>

      <TabBar active="closet" type="client" />
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
