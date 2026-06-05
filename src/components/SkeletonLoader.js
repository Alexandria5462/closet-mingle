import React from "react";

export function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.5s infinite",
      ...style
    }} />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ gap: 10, display: "flex", flexDirection: "column" }}>
      <SkeletonBox height={14} width="60%" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBox key={i} height={12} width={i === lines - 2 ? "40%" : "90%"} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 52 }) {
  return <SkeletonBox width={size} height={size} borderRadius="50%" />;
}

export function SkeletonList({ count = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SkeletonAvatar size={48} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonBox height={14} width="50%" />
            <SkeletonBox height={11} width="70%" />
            <SkeletonBox height={11} width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="closet-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} height={160} borderRadius={12} />
      ))}
    </div>
  );
}

export default function SkeletonLoader({ type = "list", count = 4 }) {
  if (type === "grid") return <SkeletonGrid count={count} />;
  if (type === "card") return <SkeletonCard />;
  return <SkeletonList count={count} />;
}
