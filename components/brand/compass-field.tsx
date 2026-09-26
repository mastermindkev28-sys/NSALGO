/** Hairline compass field — the North Star motif rendered as instrument geometry, not decoration. */
export function CompassField({ className }: { className?: string }) {
  const rings = [120, 220, 330, 450, 580];
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <svg viewBox="-640 -640 1280 1280" className={className} aria-hidden>
      <defs>
        <radialGradient id="cf-fade" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cf-north" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#aecaff" stopOpacity="0" />
          <stop offset="1" stopColor="#aecaff" stopOpacity="0.55" />
        </linearGradient>
        <mask id="cf-mask">
          <rect x="-640" y="-640" width="1280" height="1280" fill="url(#cf-fade)" />
        </mask>
      </defs>
      <g mask="url(#cf-mask)" fill="none" stroke="#ffffff">
        {rings.map((r) => (
          <circle key={r} r={r} strokeOpacity={0.07} strokeWidth={1} />
        ))}
        {ticks.map((a) => {
          const major = a % 45 === 0;
          const rad = (a * Math.PI) / 180;
          const r1 = major ? 330 : 440;
          const r2 = 458;
          return (
            <line
              key={a}
              x1={Math.sin(rad) * r1}
              y1={-Math.cos(rad) * r1}
              x2={Math.sin(rad) * r2}
              y2={-Math.cos(rad) * r2}
              strokeOpacity={major ? 0.14 : 0.07}
              strokeWidth={1}
            />
          );
        })}
        <line x1={-600} y1={0} x2={600} y2={0} strokeOpacity={0.05} />
        <line x1={0} y1={600} x2={0} y2={0} strokeOpacity={0.05} />
      </g>
      <line x1={0} y1={0} x2={0} y2={-600} stroke="url(#cf-north)" strokeWidth={1.25} />
      <circle r={2.5} fill="#e9edf3" />
    </svg>
  );
}
