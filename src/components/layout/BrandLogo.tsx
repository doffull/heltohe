import { useApp } from '@/context/AppContext';
import { CSSProperties, useState, useEffect } from 'react';

export type LogoVariant = 'header' | 'footer' | 'sidebar' | 'splash';

interface BrandLogoProps {
  variant?: LogoVariant;
  size?: number; // override
  className?: string;
  altOverride?: string;
}

const SHAPE_CLIPS: Record<string, string | undefined> = {
  none: undefined,
  circle: 'circle(50% at 50% 50%)',
  square: 'inset(0)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  blob: 'polygon(30% 0%, 70% 5%, 100% 30%, 95% 70%, 70% 100%, 30% 95%, 0% 70%, 5% 30%)',
};

export function BrandLogo({ variant = 'header', size, className, altOverride }: BrandLogoProps) {
  const { designSettings } = useApp();
  const ds = designSettings as any;

  const url =
    variant === 'footer' ? (ds.footerLogo || ds.hudLogo) :
    ds.hudLogo;
  const brandName = ds.siteName || 'BRAND';

  const finalSize = size ?? (ds.logoSize || 40);
  const shape = ds.logoBackgroundShape || 'none';
  const bgColor = ds.logoBackgroundColor || '';
  const padding = ds.logoBackgroundPadding ?? 8;

  const wrapperStyle: CSSProperties = {
    width: finalSize,
    height: finalSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: shape !== 'none' ? padding : 0,
    background: shape !== 'none' && bgColor ? bgColor : 'transparent',
    clipPath: SHAPE_CLIPS[shape],
    WebkitClipPath: SHAPE_CLIPS[shape],
    transition: 'all 0.25s ease',
    flexShrink: 0,
  };

  const imgStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  };

  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [url]);
  const showImage = !!url && !imgError;

  return (
    <span className={className} style={wrapperStyle} aria-label={altOverride || brandName}>
      {showImage ? (
        <img
          src={url}
          alt={altOverride || brandName}
          style={imgStyle}
          loading="eager"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{
          fontWeight: 900, letterSpacing: '0.18em',
          fontSize: Math.max(10, finalSize / 4),
          color: bgColor ? '#000' : 'currentColor',
          textTransform: 'uppercase',
        }}>
          {brandName}
        </span>
      )}
    </span>
  );
}

export default BrandLogo;
