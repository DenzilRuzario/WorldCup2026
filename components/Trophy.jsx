// Custom trophy mark — original vector art in the site's gold palette.
export default function Trophy({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6D27A" />
          <stop offset=".45" stopColor="#E8B339" />
          <stop offset="1" stopColor="#A97B1D" />
        </linearGradient>
        <linearGradient id="tb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A6516" />
          <stop offset="1" stopColor="#5C430E" />
        </linearGradient>
      </defs>
      {/* handles */}
      <path d="M12 14h-7v6c0 8 5 13 12 14M52 14h7v6c0 8-5 13-12 14"
        stroke="url(#tg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* cup */}
      <path d="M14 8h36v14c0 12-8 20-18 20S14 34 14 22V8z" fill="url(#tg)" />
      <path d="M14 8h36v5H14z" fill="#F6D27A" opacity=".55" />
      {/* star */}
      <path d="M32 16l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L32 16z" fill="#0B1330" opacity=".8" />
      {/* stem + base */}
      <path d="M28 42h8l2 8H26l2-8z" fill="url(#tb)" />
      <rect x="20" y="50" width="24" height="5" rx="1.5" fill="url(#tg)" />
      <rect x="17" y="55" width="30" height="5" rx="1.5" fill="url(#tb)" />
    </svg>
  );
}
