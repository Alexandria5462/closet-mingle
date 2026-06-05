import React from "react";
import { useDarkMode } from "../lib/AuthContext";

export default function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "0.5px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{darkMode ? "🌙" : "☀️"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Dark mode</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{darkMode ? "On" : "Off"}</div>
        </div>
      </div>
      <button
        onClick={toggleDarkMode}
        style={{
          background: darkMode ? "var(--pink)" : "#d1d5db",
          border: "none", borderRadius: 20, width: 44, height: 24,
          cursor: "pointer", position: "relative", transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute", top: 2,
          left: darkMode ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%",
          background: "white", transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}
