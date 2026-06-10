"use client";
import { FLAG_ISO } from "@/lib/flags";

// Real flag images via flagcdn.com (still images, not emoji).
export default function Flag({ id, size = 32, radius = 4 }) {
  const iso = FLAG_ISO[id];
  if (!iso) return null;
  const h = Math.round(size * 0.7);
  return (
    <img
      src={`https://flagcdn.com/w160/${iso}.png`}
      alt={`${id} flag`}
      width={size}
      height={h}
      loading="lazy"
      style={{
        width: size, height: h, objectFit: "cover", borderRadius: radius,
        boxShadow: "0 3px 10px rgba(0,0,0,.55)",
        border: "1px solid rgba(255,255,255,.14)", display: "block",
      }}
    />
  );
}
