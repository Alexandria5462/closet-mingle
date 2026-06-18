import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import Toast from "../components/Toast";

/**
 * StylistOutfitBuilder
 * Allows a stylist to browse a client's closet and build an outfit
 * suggestion by selecting items. The built outfit is sent as a message.
 *
 * Route: /stylist/build-outfit/:clientId
 */
export default function StylistOutfitBuilder() {
  const nav = useNavigate();
  const { clientId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const [client, setClient] = useState(null);
  const [closet, setCloset] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [note, setNote] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [categories, setCategories] = useState([]);

  const conversationId = [clientId, currentUser?.uid].sort().join("_");

  useEffect(() => {
    if (!currentUser?.uid || !clientId) return;
    loadClientAndCloset();
  }, [clientId, currentUser]);

  async function loadClientAndCloset() {
    setLoading(true);
    try {
      const clientSnap = await getDoc(doc(db, "users", clientId));
      if (clientSnap.exists()) setClient(clientSnap.data());

      const closetSnap = await getDocs(
        query(collection(db, "closetItems"), where("userId", "==", clientId))
      );
      const items = closetSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.privacy !== "private");

      setCloset(items);

      const cats = ["all", ...new Set(items.map(i => i.category).filter(Boolean))];
      setCategories(cats);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function toggleItem(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendOutfitSuggestion() {
    if (selected.size < 2) { setToast("Select at least 2 items to build an outfit"); return; }
    setSending(true);
    try {
      const selectedItems = closet.filter(i => selected.has(i.id));
      const outfitText = `👗 Outfit suggestion for you:\n\n${selectedItems.map(i => `• ${i.name} (${i.category}${i.attributes?.primaryColor ? " · " + i.attributes.primaryColor : ""})`).join("\n")}${note ? "\n\n💬 " + note : ""}`;

      await addDoc(collection(db, "messages"), {
        conversationId,
        senderId: currentUser.uid,
        senderName: userProfile?.name || "Stylist",
        content: outfitText,
        type: "outfit_suggestion",
        outfitItems: selectedItems.map(i => ({
          id: i.id,
          name: i.name,
          category: i.category,
          imageUrl: i.imageUrl,
          color: i.attributes?.primaryColor,
        })),
        createdAt: new Date().toISOString(),
        read: false,
      });

      setToast("Outfit suggestion sent!");
      setTimeout(() => nav(`/stylist/chat/${clientId}`), 1200);
    } catch(e) {
      console.error(e);
      setToast("Failed to send. Try again.");
    }
    setSending(false);
  }

  const filtered = filterCat === "all"
    ? closet
    : closet.filter(i => i.category === filterCat);

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true"></i>
          </button>
          <div>
            <div className="logo"><em>closet</em><span>mingle</span></div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Building for {client?.name || "client"}</div>
          </div>
        </div>
        <span className="badge badge-pink">{selected.size} selected</span>
      </div>

      <div className="screen">
        <div className="body">

          {/* Instruction */}
          <div style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--text-secondary)" }}>
            Tap items to select them for an outfit. Select 2+ items then tap <strong>Send Outfit</strong>.
          </div>

          {/* Category filter */}
          {categories.length > 2 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 14, paddingBottom: 2 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontFamily: "inherit", cursor: "pointer", border: `1px solid ${filterCat === cat ? "var(--pink)" : "var(--border)"}`, background: filterCat === cat ? "var(--pink)" : "var(--bg-card)", color: filterCat === cat ? "white" : "var(--text-secondary)", textTransform: "capitalize" }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Closet grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-tertiary)" }}>Loading closet...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <i className="ti ti-hanger" style={{ fontSize: 48, color: "var(--text-tertiary)", display: "block", marginBottom: 12 }} aria-hidden="true"></i>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No items in this category</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Try a different filter</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
              {filtered.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <div key={item.id} onClick={() => toggleItem(item.id)} style={{ cursor: "pointer", borderRadius: "var(--radius)", overflow: "hidden", border: `2px solid ${isSelected ? "var(--pink)" : "var(--border)"}`, position: "relative", background: "var(--bg-card)", transition: "border-color 0.15s" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", aspectRatio: "1", background: "var(--avatar-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-hanger" style={{ fontSize: 28, color: "var(--text-tertiary)" }} aria-hidden="true"></i>
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ position: "absolute", top: 6, right: 6, background: "var(--pink)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-check" style={{ fontSize: 13, color: "white" }} aria-hidden="true"></i>
                      </div>
                    )}
                    <div style={{ padding: "4px 6px 6px", fontSize: 10, color: "var(--text-secondary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ paddingBottom: 4, paddingLeft: 6, fontSize: 9, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{item.category}{item.attributes?.primaryColor ? " · " + item.attributes.primaryColor : ""}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Note to client */}
          {selected.size > 0 && (
            <div style={{ marginBottom: 80 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Add a note (optional)</div>
              <textarea
                className="input-field"
                placeholder="e.g. This outfit works great for a business casual event..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                style={{ resize: "none", fontFamily: "inherit", fontSize: 13 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Send button — fixed at bottom */}
      {selected.size >= 2 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 430, margin: "0 auto", padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", background: "var(--bg-card)", borderTop: "0.5px solid var(--border)", zIndex: 50 }}>
          <button
            className="btn-pink"
            onClick={sendOutfitSuggestion}
            disabled={sending}
            style={{ marginBottom: 0 }}
          >
            {sending ? "Sending..." : `Send Outfit Suggestion (${selected.size} items)`}
          </button>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
