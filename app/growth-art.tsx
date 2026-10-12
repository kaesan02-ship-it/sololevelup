/** Decorative vectors stay local, crisp at any pixel density, and out of the accessibility tree. */
export function GrowthBackdrop() {
  return (
    <svg
      className="growth-backdrop"
      viewBox="0 0 1000 360"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="#aa92ca" strokeWidth="1">
        <ellipse
          cx="845"
          cy="175"
          rx="205"
          ry="138"
          transform="rotate(-28 845 175)"
          opacity=".22"
        />
        <ellipse
          cx="845"
          cy="175"
          rx="243"
          ry="170"
          transform="rotate(-28 845 175)"
          opacity=".13"
        />
        <path
          d="M360 360C535 240 655 390 790 255S930 90 1040 110"
          opacity=".25"
        />
        <path
          d="M440 380C605 265 700 405 840 270S975 120 1080 135"
          opacity=".14"
        />
      </g>
      <g fill="#fff" opacity=".85">
        <path d="m697 57 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
        <path d="m938 260 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" />
      </g>
      <circle cx="675" cy="245" r="5" fill="#b9dbcc" />
      <circle cx="938" cy="83" r="4" fill="#c2acd9" />
      <circle cx="575" cy="315" r="3" fill="#c2acd9" opacity=".5" />
    </svg>
  );
}

export function XpRing({ value, max }: { value: number; max: number }) {
  const progress = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <svg
      className="xp-ring"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="60"
        cy="60"
        r="53"
        fill="none"
        stroke="#eee8f5"
        strokeWidth="5"
      />
      <circle
        cx="60"
        cy="60"
        r="53"
        fill="none"
        stroke="#9470c4"
        strokeWidth="5"
        pathLength="100"
        strokeDasharray={`${progress * 100} 100`}
        strokeLinecap={progress ? "round" : "butt"}
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="7" r="3" fill="#9470c4" />
    </svg>
  );
}
