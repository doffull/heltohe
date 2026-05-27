import { useState, useEffect, CSSProperties } from 'react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  maxHeight?: number;
  /** Use the footer-specific logo URL when available. */
  variant?: 'header' | 'footer';
  style?: CSSProperties;
}

/**
 * Single robust logo renderer. Source order:
 *  1. designSettings.hudLogo (or footerLogo for footer variant)
 *  2. site name text
 *  3. constant fallback "LVTK6"
 *
 * - Reserves height so the layout never jumps during fetch / image swap.
 * - Falls back to text instantly on image error without leaving a hole.
 */
export function BrandLogo({
  className,
  imgClassName,
  textClassName,
  maxHeight = 40,
  variant = 'header',
  style,
}: BrandLogoProps) {
  const { designSettings } = useApp();
  const url =
    variant === 'footer'
      ? ((designSettings as any).footerLogo as string) || designSettings.hudLogo
      : designSettings.hudLogo;
  const siteName = (designSettings as any).siteName || 'LVTK6';
  const [broken, setBroken] = useState(false);

  // Reset broken state when URL changes (admin save → live update).
  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={siteName}
        width={176}
        height={maxHeight}
        decoding="async"
        loading="eager"
        onError={() => setBroken(true)}
        className={cn('w-auto object-contain shrink-0', imgClassName, className)}
        style={{ maxHeight, ...style }}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold tracking-wider uppercase truncate',
        textClassName,
        className
      )}
      style={{ minHeight: maxHeight, ...style }}
    >
      {siteName}
    </span>
  );
}
