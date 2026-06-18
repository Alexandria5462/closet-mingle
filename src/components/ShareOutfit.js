import React, { useState } from "react";

export default function ShareOutfit({ outfit, onClose }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Build outfit image URL - use first item image or outfit image
  const outfitImage = outfit?.imageUrl ||
    (outfit?.itemImages && outfit.itemImages.find(u => u)) ||
    (outfit?.items && outfit.items[0]?.imageUrl) || null;
  const allImages = (outfit?.itemImages || []).filter(Boolean).slice(0, 8);

  const shareText = `Check out this outfit I put together on ClosetMingle!\n${outfit?.outfitName || "My styled look"}${outfit?.colorStory ? `\n${outfit.colorStory}` : ""}\n\nclosetmingle.com`;

  async function shareNative() {
    setSharing(true);
    try {
      // Attach ALL outfit item images as files
      if (allImages.length > 0 && navigator.canShare) {
        try {
          const files = (await Promise.all(
            allImages.map(async (url, i) => {
              try {
                const res = await fetch(url);
                const blob = await res.blob();
                return new File([blob], `outfit-${i + 1}.jpg`, { type: "image/jpeg" });
              } catch(e) { return null; }
            })
          )).filter(Boolean);

          if (files.length > 0) {
            const shareData = {
              title: outfit?.outfitName || "My ClosetMingle Outfit",
              text: shareText,
              files,
            };
            if (navigator.canShare(shareData)) {
              await navigator.share(shareData);
              setSharing(false);
              return;
            }
          }
        } catch(e) { /* fall through */ }
      }
      // Fallback: text + URL (no files)
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
    const imageText = allImages.length > 0
      ? "\n\nOutfit items:\n" + allImages.join("\n")
      : "";
    const smsUrl = `sms:?body=${encodeURIComponent(shareText + imageText)}`;
    window.open(smsUrl, "_blank");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Outfit preview — up to 8 item photos in a grid */}
        {allImages.length > 1 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: allImages.length <= 2 ? "1fr 1fr" : allImages.length <= 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
            gridTemplateRows: allImages.length <= 4 ? "1fr" : "1fr 1fr",
            gap: 3,
            marginBottom: 12,
            borderRadius: "var(--radius)",
            overflow: "hidden",
            height: allImages.length <= 4 ? 120 : 200,
          }}>
            {allImages.map((img, i) => (
              <img key={i} src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ))}
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

        {/* Native share — opens iOS/Android share sheet with all apps */}
        <button
          className="btn-pink"
          onClick={shareNative}
          disabled={sharing}
          style={{ marginBottom: 12 }}
        >
          <i className="ti ti-share" style={{ marginRight: 8 }} aria-hidden="true"></i>
          {sharing ? "Sharing..." : "Share outfit"}
        </button>

        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-tertiary)", fontFamily: "inherit", width: "100%", padding: "8px 0" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
