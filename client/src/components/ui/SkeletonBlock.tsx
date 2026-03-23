import React from "react";

const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-peak) 50%, var(--skeleton-base) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite linear",
};

export default function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`rounded-sm ${className}`} style={shimmerStyle} />;
}
