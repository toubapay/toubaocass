interface Props {
  size?: number;
  color?: string;
}

/** 3x3 dot grid ("apps"/"services" glyph), matching Uber's Services tab icon. */
export function ServicesIcon({ size = 20, color = 'currentColor' }: Props) {
  const positions = [4, 12, 20];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {positions.map((cy) =>
        positions.map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill={color} />)
      )}
    </svg>
  );
}
