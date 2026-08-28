import { forwardRef, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { MEDIA_FALLBACK } from '@/lib/safeMedia';
import { normalizeMediaSrc } from '@/lib/iosImage';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  /** Show a light skeleton while the bitmap is decoding (default: true). */
  skeleton?: boolean;
  /** Fade the image in once decoded — avoids the iOS "blank box" flash. */
  fade?: boolean;
}

/**
 * Image tag hardened for iOS Safari:
 *  - Safari aborts requests on bfcache restore / tab switch → we retry once
 *    with a cache-busting param instead of leaving a blank box.
 *  - `decoding="async"` + fade-in on load avoids the white flash that happens
 *    when WebKit paints the element before the bitmap is ready.
 *  - Always falls back to the placeholder so the layout never has a hole.
 */
export const ResilientImage = forwardRef<HTMLImageElement, Props>(function ResilientImage(
  { src, className, skeleton = true, fade = true, loading = 'lazy', onLoad, onError, style, ...rest },
  ref,
) {
  const normalized = normalizeMediaSrc(src);
  const [currentSrc, setCurrentSrc] = useState(normalized || MEDIA_FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    retried.current = false;
    setLoaded(false);
    setCurrentSrc(normalized || MEDIA_FALLBACK);
  }, [normalized]);

  return (
    <span className={cn('relative block', skeleton && !loaded && 'bg-muted/40 animate-pulse')} style={{ display: 'contents' }}>
      <img
        ref={ref}
        src={currentSrc}
        loading={loading}
        decoding="async"
        // WebKit sometimes never fires load for very large bitmaps behind
        // lazy-loading; sizes hints keep memory pressure down on iOS.
        className={cn(className, fade && 'transition-opacity duration-300', fade && !loaded && 'opacity-0')}
        style={style}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!retried.current && normalized && !normalized.startsWith('data:')) {
            retried.current = true;
            const sep = normalized.includes('?') ? '&' : '?';
            setCurrentSrc(`${normalized}${sep}r=${Date.now()}`);
            return;
          }
          if (!currentSrc.endsWith(MEDIA_FALLBACK)) {
            setCurrentSrc(MEDIA_FALLBACK);
            setLoaded(true);
          }
          onError?.(e);
        }}
        {...rest}
      />
    </span>
  );
});

export default ResilientImage;
