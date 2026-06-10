import React, { useState } from "react";

export default function ShareOutfit({ outfit, onClose }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Build outfit image URL - use first item image or outfit image
  const outfitImage = outfit?.imageUrl ||
    (outfit?.itemImages && outfit.itemImages.find(u => u)) ||
    (outfit?.items && outfit.items[0]?.imageUrl) || null;
  const allImages = (outfit?.itemImages || []).filter(Boolean).slice(0, 4);

  const shareText = `Check out this outfit I put together on ClosetMingle!\n${outfit?.outfitName || "My styled look"}${outfit?.colorStory ? `\n${outfit.colorStory}` : ""}\n\nclosetmingle.com`;

  async function shareNative() {
    setSharing(true);
    try {
      // Try sharing with image file if available
      if (outfitImage && navigator.canShare) {
        try {
          const response = await fetch(outfitImage);
          const blob = await response.blob();
          const file = new File([blob], "outfit.jpg", { type: blob.type || "image/jpeg" });
          const shareData = { title: outfit?.outfitName || "My ClosetMingle Outfit", text: shareText, files: [file] };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setSharing(false);
            return;
          }
        } catch(e) { /* fall through to URL share */ }
      }
      // Fallback: share text + URL
      if (navigator.share) {
        await navigator.share({
          title: outfit?.outfitName || "My ClosetMingle Outfit",
          text: shareText,
          url: "https://closetmingle.com",
        });
      }
    } catch(e) {
      if (e.name !== "AbortError") console.error(e);
    }
    setSharing(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) { console.error(e); }
  }

  async function shareToInstagram() {
    // On mobile, navigator.share opens native sheet including Instagram
    if (navigator.share) {
      try { await navigator.share({ title: outfit?.outfitName || "My Outfit", text: shareText, url: "https://closetmingle.com" }); } catch(e) {}
    } else { window.open("https://instagram.com", "_blank"); }
  }

  async function shareToTikTok() {
    if (navigator.share) {
      try { await navigator.share({ title: outfit?.outfitName || "My Outfit", text: shareText, url: "https://closetmingle.com" }); } catch(e) {}
    } else { window.open("https://tiktok.com", "_blank"); }
  }

  function shareToTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  }

  function sharePinterest() {
    const url = outfitImage
      ? `https://pinterest.com/pin/create/button/?url=${encodeURIComponent("https://closetmingle.com")}&media=${encodeURIComponent(outfitImage)}&description=${encodeURIComponent(shareText)}`
      : `https://pinterest.com/pin/create/button/?url=${encodeURIComponent("https://closetmingle.com")}&description=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  }

  function shareViaSMS() {
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    window.open(smsUrl, "_blank");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Outfit preview */}
        {allImages.length > 1 ? (
          <div style={{ display: "grid", gridTemplateColumns: allImages.length >= 4 ? "1fr 1fr" : `repeat(${allImages.length}, 1fr)`, gap: 4, marginBottom: 12, borderRadius: "var(--radius)", overflow: "hidden", height: 140 }}>
            {allImages.map((img, i) => <img key={i} src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />)}
          </div>
        ) : outfitImage ? (
          <img src={outfitImage} alt={outfit?.outfitName || "Outfit"} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: "var(--radius)", marginBottom: 12 }} />
        ) : null}

        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {outfit?.outfitName || "Share outfit"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
          Share this look with friends
        </div>

        {/* Primary share button (native share sheet) */}
        {(navigator.share || navigator.canShare) && (
          <button
            className="btn-pink"
            onClick={shareNative}
            disabled={sharing}
            style={{ marginBottom: 12 }}
          >
            <i className="ti ti-share" style={{ marginRight: 8 }} aria-hidden="true"></i>
            {sharing ? "Sharing..." : "Share via..."}
          </button>
        )}

        {/* SMS */}
        <button
          className="btn-outline"
          onClick={shareViaSMS}
          style={{ marginBottom: 12 }}
        >
          <i className="ti ti-message" style={{ marginRight: 8 }} aria-hidden="true"></i>
          Send via Text
        </button>

        {/* Social buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <button onClick={shareToTwitter} style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="ti ti-brand-x" aria-hidden="true"></i> X / Twitter
          </button>
          <button onClick={sharePinterest} style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="ti ti-brand-pinterest" aria-hidden="true"></i> Pinterest
          </button>
          <button onClick={shareToInstagram} style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="ti ti-brand-instagram" aria-hidden="true"></i> Instagram
          </button>
          <button onClick={shareToTikTok} style={{ padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className="ti ti-brand-tiktok" aria-hidden="true"></i> TikTok
          </button>
        </div>

        {/* Copy link */}
        <button onClick={copyLink} className="btn-outline" style={{ marginBottom: 10 }}>
          <i className="ti ti-copy" style={{ marginRight: 8 }} aria-hidden="true"></i>
          {copied ? "Copied!" : "Copy text"}
        </button>

        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-tertiary)", fontFamily: "inherit", width: "100%", padding: "8px 0" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
