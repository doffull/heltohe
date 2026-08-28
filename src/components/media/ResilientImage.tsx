import { forwardRef, useEffect, useMemo, useRef, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { MEDIA_FALLBACK } from '@/lib/safeMedia';
import { decodeWhenIdle, getImageLoadStrategy, normalizeMediaSrc } from '@/lib/iosImage';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  /** Fade the image in once decoded — avoids the iOS "blank box" flash. */
  fade?: boolean;
  /** Above-the-fold image: loaded eagerly with a high fetch priority. */
  priority?: boolean;
}

/**
 * Image tag hardened for iOS Safari:
 *  - Apple/WebKit detection drives the loading strategy: fewer parallel
 *    decodes, explicit `img.decode()` before display, low fetch priority for
 *    off-screen media.
 *  - A refused decode (WebKit memory pressure) or an aborted request triggers
 *    one cache-busting retry instead of leaving a blank box.
 *  - Always falls back to the placeholder so the layout never has a hole.
 */
export const ResilientImage = forwardRef<HTMLImageElement, Props>(function ResilientImage(
  { src, className, fade = true, priority = false, loading, decoding, onLoad, onError, ...rest },
  ref,
) {
  const normalized = normalizeMediaSrc(src);
  const strategy = useMemo(() => getImageLoadStrategy({ priority }), [priority]);
  const [currentSrc, setCurrentSrc] = useState(normalized || MEDIA_FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const retried = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    retried.current = false;
    setLoaded(false);
    setCurrentSrc(normalized || MEDIA_FALLBACK);
  }, [normalized]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const retryOnce = () => {
    if (retried.current || !normalized || !/^https?:/i.test(normalized)) return false;
    retried.current = true;
    const sep = normalized.includes('?') ? '&' : '?';
    setCurrentSrc(`${normalized}${sep}r=${Date.now()}`);
    setLoaded(false);
    return true;
  };

  const fallback = () => {
    if (!currentSrc.endsWith(MEDIA_FALLBACK)) {
      setCurrentSrc(MEDIA_FALLBACK);
      setLoaded(true);
    }
  };

  return (
    <img
      ref={ref}
      src={currentSrc}
      loading={loading ?? strategy.loading}
      decoding={decoding ?? strategy.decoding}
      fetchPriority={strategy.fetchPriority}
      className={cn(className, fade && 'transition-opacity duration-300', fade && !loaded && 'opacity-0')}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (strategy.preDecode) {
          // WebKit peut échouer au décodage même après un `load` réussi.
          decodeWhenIdle(img, strategy.concurrency).then((ok) => {
            if (!alive.current) return;
            if (ok) setLoaded(true);
            else if (!retryOnce()) fallback();
          });
        } else {
          setLoaded(true);
        }
        onLoad?.(e);
      }}
      onError={(e) => {
        if (retryOnce()) return;
        fallback();
        onError?.(e);
      }}
      {...rest}
    />
  );
});

export default ResilientImage;
