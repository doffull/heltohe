import { forwardRef, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { MEDIA_FALLBACK } from '@/lib/safeMedia';
import { normalizeMediaSrc } from '@/lib/iosImage';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  /** Fade the image in once decoded — avoids the iOS "blank box" flash. */
  fade?: boolean;
}

/**
 * Image tag hardened for iOS Safari:
 *  - Safari aborts requests on bfcache restore / tab switch → retry once with
 *    a cache-busting param instead of leaving a blank box.
 *  - `decoding="async"` + fade-in on load avoids the white flash WebKit shows
 *    when it paints the element before the bitmap is ready.
 *  - Always falls back to the placeholder so the layout never has a hole.
 */
export const ResilientImage = forwardRef<HTMLImageElement, Props>(function ResilientImage(
  { src, className, fade = true, loading = 'lazy', onLoad, onError, ...rest },
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
    <img
      ref={ref}
      src={currentSrc}
      loading={loading}
      decoding="async"
      className={cn(className, fade && 'transition-opacity duration-300', fade && !loaded && 'opacity-0')}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        if (!retried.current && normalized && /^https?:/i.test(normalized)) {
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
  );
});

export default ResilientImage;
