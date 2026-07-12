interface Props {
  size?: number;
  color?: string;
}

export function MicIcon({ size = 18, color = 'currentColor' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" fill={color} />
      <path d="M19 11a7 7 0 0 1-14 0" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 21h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
