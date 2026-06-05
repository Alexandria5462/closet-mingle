import React, { useEffect } from "react";

export default function Toast({ message, onDone, duration = 3000 }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div style={{
      position: "fixed", bottom: "max(90px, calc(env(safe-area-inset-bottom) + 80px))",
      left: "50%", transform: "translateX(-50%)",
      background: "var(--text-primary)", color: "var(--bg-card)",
      padding: "10px 20px", borderRadius: 24, fontSize: 13, fontWeight: 500,
      zIndex: 9999, maxWidth: 320, textAlign: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "pre-wrap",
      animation: "slideDown 0.2s ease",
    }}>
      {message}
    </div>
  );
}
