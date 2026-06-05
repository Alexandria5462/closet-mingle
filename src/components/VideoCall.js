import React, { useEffect, useRef } from "react";

export default function VideoCall({ roomUrl, onEnd }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && (e.data.action === "left-meeting" || e.data.action === "error")) {
        onEnd && onEnd();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEnd]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "#000", display: "flex", flexDirection: "column"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", background: "#111" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "white" }}>📹 Video Session</div>
        <button
          onClick={onEnd}
          style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "6px 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          End Call
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={`${roomUrl}?showLeaveButton=1&showFullscreenButton=1`}
        style={{ flex: 1, border: "none", width: "100%", background: "#000" }}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        title="Video call"
      />
    </div>
  );
}
