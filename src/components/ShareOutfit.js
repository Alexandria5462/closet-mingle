import React, { useState } from "react";

export default function ShareOutfit({ outfit, onClose }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Check out this outfit I created on ClosetMingle! 👗✨\n${outfit.outfitName || "My styled look"}\n${outfit.colorStory || ""}\n\nCreate your own at closetmingle.com`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: outfit.outfitName || "My ClosetMingle Outfit",
          text: shareText,
          url: "https://closetmingle.com",
        });
      } catch (e) {
        if (e.name !== "AbortError") console.error("Share failed:", e);
      }
    }
  }

  const hasNativeShare = !!navigator.share;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>Share this outfit</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>
          Show your friends what you created!
        </div>

        {/* Outfit preview */}
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{outfit.outfitName || "My Outfit"}</div>
          {outfit.colorStory && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{outfit.colorStory}</div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            {(outfit.itemImages || []).filter(Boolean).map((img, i) => (
              <img key={i} src={img} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
            ))}
          </div>
        </div>

        {/* Share options */}
        {hasNativeShare && (
          <button className="btn-pink" onClick={nativeShare} style={{ marginBottom: 10 }}>
            <i className="ti ti-share" aria-hidden="true"></i> Share via...
          </button>
        )}

        <button className="btn-outline" onClick={copyLink} style={{ marginTop: 0 }}>
          {copied ? "✅ Copied!" : <><i className="ti ti-copy" aria-hidden="true"></i> Copy link & caption</>}
        </button>

        {/* Social shortcuts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {[
            { name: "Instagram", color: "#E1306C", icon: "ti-brand-instagram" },
            { name: "TikTok", color: "#000", icon: "ti-brand-tiktok" },
            { name: "Pinterest", color: "#E60023", icon: "ti-brand-pinterest" },
            { name: "Twitter/X", color: "#1DA1F2", icon: "ti-brand-twitter" },
          ].map(s => (
            <button
              key={s.name}
              onClick={copyLink}
              style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 8px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
            >
              <i className={`ti ${s.icon}`} style={{ color: s.color }} aria-hidden="true"></i>
              {s.name}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 10 }}>
          Tap a platform to copy caption then paste it there
        </p>

        <button className="btn-outline" onClick={onClose} style={{ marginTop: 4, color: "var(--text-secondary)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
