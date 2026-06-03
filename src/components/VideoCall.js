import React, { useState, useEffect, useRef } from "react";

export default function VideoCall({ roomUrl, onEnd }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(0,0,0,0.8)" }}>
        <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>
          <i className="ti ti-video" style={{ marginRight: 6 }} aria-hidden="true"></i>
          Video Session
        </div>
        <button
          onClick={onEnd}
          style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "6px 16px", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          End Call
        </button>
      </div>
      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 40 }}>📹</div>
          <div style={{ color: "white", fontSize: 14 }}>Connecting to video session...</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={roomUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture"
        style={{ flex: 1, border: "none", display: loading ? "none" : "block" }}
        title="Video call"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
