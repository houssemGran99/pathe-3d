interface Props {
  size?: number;
  wordmark?: boolean;
  className?: string;
}

/** SeatView 3D mark: a seat silhouette with the screen's light cone converging on it. */
export function Logo({ size = 28, wordmark = true, className }: Props) {
  return (
    <span className={`logo ${className ?? ''}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
        <defs>
          <linearGradient id="sv-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E50914" stopOpacity="0.95" />
            <stop offset="1" stopColor="#E50914" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="6" y="3" width="20" height="2.4" rx="1.2" fill="#fff" />
        <path d="M8 6h16l-4 13H12z" fill="url(#sv-cone)" />
        <rect x="9" y="19" width="14" height="6" rx="2" fill="#fff" />
        <rect x="7" y="21" width="3" height="6" rx="1.2" fill="#fff" opacity="0.8" />
        <rect x="22" y="21" width="3" height="6" rx="1.2" fill="#fff" opacity="0.8" />
      </svg>
      {wordmark && (
        <span className="logo__word">
          SeatView <em>3D</em>
        </span>
      )}
    </span>
  );
}
