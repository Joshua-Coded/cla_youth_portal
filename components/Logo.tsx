export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset=".5" stopColor="#6d4aff" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#logo-g)" />
      <path
        d="M20 8.5c.9 4.6 7.6 7.8 7.6 14.4a7.6 7.6 0 0 1-15.2 0c0-3.4 1.8-5.8 3.6-7.4.2 2.4 1.4 4.1 3 4.7-.9-4.6.4-8.5 1-11.7z"
        fill="#fff"
      />
    </svg>
  );
}

const PATHS: Record<string, React.ReactNode> = {
  arrow: <path d="M5 12h13M12.5 6l6 6-6 6" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" fill="currentColor" />
    </>
  ),
  spark: <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4L18 18M18 6l-2.6 2.6M8.6 15.4L6 18" />,
  book: <path d="M4 5.8c2.6-1 5.4-.9 8 .6 2.6-1.5 5.4-1.6 8-.6v12.8c-2.6-1-5.4-.9-8 .6-2.6-1.5-5.4-1.6-8-.6zM12 6.4v13" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />,
  heart: <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />,
  music: (
    <>
      <path d="M9 18V5.5l10-2v12.5" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6M15.5 5.6a3.2 3.2 0 0 1 0 6M17.5 14.6c1.5.6 2.5 2 3 4.4" />
    </>
  ),
  flame: <path d="M12 3c.6 3.2 5.2 5.4 5.2 10a5.2 5.2 0 0 1-10.4 0c0-2.4 1.2-4 2.5-5.1.1 1.7 1 2.8 2 3.2-.6-3.2.3-5.9.7-8.1z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z" />
    </>
  ),
};

export function ProgrammeIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[icon] ?? PATHS.star}
    </svg>
  );
}

const ui = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' } as const;
export const Icon = {
  dashboard: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" /><rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" /></svg>,
  programmes: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  members: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6M15.5 5.6a3.2 3.2 0 0 1 0 6M17.5 14.6c1.5.6 2.5 2 3 4.4" /></svg>,
  qr: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h1M20.5 14v1" /></svg>,
  logout: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M10 16l-4-4 4-4M6 12h9" /></svg>,
  external: (p: { size?: number }) => <svg width={p.size ?? 16} height={p.size ?? 16} {...ui}><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></svg>,
  people: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>,
  pulse: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M3 12h4l2.5-6 5 12 2.5-6h4" /></svg>,
  check: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></svg>,
  alert: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M12 4l9 15.5H3z" /><path d="M12 10v4M12 17h.01" /></svg>,
  trend: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M3.5 17l5.5-5.5 4 4 7.5-7.5M15 8h5.5v5.5" /></svg>,
  calendar: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  phone: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M5 4h3.5l1.5 4.5-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" /></svg>,
  chat: (p: { size?: number }) => <svg width={p.size ?? 18} height={p.size ?? 18} {...ui}><path d="M4 19.5l1.3-3.8A7.8 7.8 0 1 1 8.4 19z" /></svg>,
  download: (p: { size?: number }) => <svg width={p.size ?? 16} height={p.size ?? 16} {...ui}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>,
  print: (p: { size?: number }) => <svg width={p.size ?? 16} height={p.size ?? 16} {...ui}><path d="M7 9V4h10v5M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2" /><rect x="7" y="14" width="10" height="6" rx="1" /></svg>,
  search: (p: { size?: number }) => <svg width={p.size ?? 16} height={p.size ?? 16} {...ui}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>,
};
