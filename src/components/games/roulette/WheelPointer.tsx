interface Props {
  size: number;
}

export function WheelPointer({ size }: Props) {
  const pointerSize = Math.max(14, size * 0.06);
  return (
    <div
      aria-hidden
      className="absolute left-1/2 -translate-x-1/2 z-10"
      style={{
        top: -pointerSize * 0.3,
        width: 0,
        height: 0,
        borderLeft: `${pointerSize * 0.55}px solid transparent`,
        borderRight: `${pointerSize * 0.55}px solid transparent`,
        borderTop: `${pointerSize}px solid hsl(var(--foreground))`,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    />
  );
}
