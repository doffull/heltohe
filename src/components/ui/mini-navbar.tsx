import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * MiniNavbar — Industrial Luxury floating glossy header shell.
 * Always floating; glassmorphism with backdrop blur + saturate.
 * `transparent` softens the background for use over hero imagery.
 */
export interface MiniNavbarProps {
  children: ReactNode;
  expanded?: boolean;
  transparent?: boolean;
  className?: string;
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
        'relative',
        'backdrop-blur-xl backdrop-saturate-150',
        'ring-1 ring-foreground/10',
        'shadow-[0_8px_32px_-12px_hsl(var(--foreground)/0.25)]',
        transparent
          ? 'bg-background/70 lg:bg-foreground/5 border border-foreground/10'
          : 'bg-gradient-to-b from-background/75 to-background/55 border border-border/40',
        shapeClass,
        className,
      )}
      style={style}
    >
      {/* Glossy top sheen */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-1/2',
          'bg-gradient-to-b from-foreground/5 to-transparent',
          shapeClass,
        )}
        style={{ position: 'absolute' }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default MiniNavbar;
