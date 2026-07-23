interface Props {
  size?: number;
  color?: string;
  detailColor?: string;
}

/**
 * Wallet glyph (body + a bill peeking out of the fold + a clasp), matching
 * the reference icon the user provided rather than relying on an emoji
 * (💰/👛 render inconsistently across platforms and don't read as "wallet").
 */
export function WalletIcon({ size = 20, color = 'currentColor', detailColor = '#fff' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,8 16,8 11.5,2.5" fill={color} stroke={detailColor} strokeWidth="1" strokeLinejoin="round" />
      <rect x="2" y="7" width="20" height="14" rx="3.5" fill={color} />
      <circle cx="17.2" cy="14" r="2" fill={detailColor} />
      <circle cx="17.2" cy="14" r="0.8" fill={color} />
    </svg>
  );
}
