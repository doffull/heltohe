import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * MiniNavbar — Industrial Luxury floating pill header shell.
 *
 * Presentational only: caller supplies logo / links / actions slots.
 * Mirrors the reference mini-navbar's shape morph: compact chamfered
 * pill at rest, slightly larger chamfered panel when `expanded` is true,
 * with a 300ms delayed return to compact (matches the original UX).
 *
 * Tokens only — no raw colors. 45° chamfered edges via `chamfer-hud-sm`.
 */
export interface MiniNavbarProps {
  children: ReactNode;
  expanded?: boolean;
  transparent?: boolean;
  className?: string;
  /** Inline style passthrough (for admin headerBgColor / headerTextColor). */
  style?: React.CSSProperties;
}

export function MiniNavbar({
  children,
  expanded = false,
  transparent = false,
  className,
  style,
}: MiniNavbarProps) {
  const [shapeClass, setShapeClass] = useState('chamfer-hud-sm');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (expanded) {
      setShapeClass('chamfer-hud');
    } else {
      timeoutRef.current = setTimeout(() => setShapeClass('chamfer-hud-sm'), 300);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [expanded]);

  return (
    <div
      className={cn(
        'border border-border/40 transition-all duration-300 ease-out',
        'backdrop-blur-md supports-[backdrop-filter]:bg-background/70',
        transparent ? 'bg-transparent border-transparent' : 'bg-background/85',
        shapeClass,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export default MiniNavbar;
