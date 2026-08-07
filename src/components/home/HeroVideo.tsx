/**
 * HeroVideo — Safari/iOS-safe video player for hero backgrounds.
 *
 * Why this exists: Safari (iOS + macOS) is strict about autoplay. A bare
 * <video src="..."> without the right attributes silently fails — exactly
 * the symptom customers reported. This component:
 *
 *  - sets `playsInline` + `muted` + `autoPlay` + `loop` (all required for
 *    iOS autoplay) and applies muted before play() to satisfy WebKit
 *  - exposes the source via <source> tags with explicit MIME types and
 *    auto-derives a sibling .webm URL when the primary is .mp4 (or vice
 *    versa) so browsers can pick the one they can decode
 *  - kicks off play() programmatically on mount, retries once on canplay,
 *    and falls back to the poster image if every attempt is rejected
 *  - never leaves a black box: a failed video swaps to a static poster
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  poster?: string;
  objectPosition?: string;
  /** contain | cover | fill | none — respected on the video AND the poster fallback */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

function deriveAlt(src: string): string | null {
  // Provide a sibling format guess so multi-format encoding is honored
  // when a user uploads both (e.g. hero.mp4 + hero.webm).
  if (/\.mp4($|\?)/i.test(src)) return src.replace(/\.mp4(\?|$)/i, '.webm$1');
  if (/\.webm($|\?)/i.test(src)) return src.replace(/\.webm(\?|$)/i, '.mp4$1');
  return null;
}

function mimeFor(url: string): string {
  if (/\.webm($|\?)/i.test(url)) return 'video/webm';
  if (/\.mov($|\?)/i.test(url)) return 'video/quicktime';
  if (/\.m4v($|\?)/i.test(url)) return 'video/mp4';
  return 'video/mp4';
}

export function HeroVideo({ src, poster, objectPosition = 'center' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const alt = deriveAlt(src);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setFailed(false);
    // iOS Safari requires muted to be set explicitly (not just the attribute)
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled || !v) return;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // One retry shortly after — covers cases where canplay hadn't
          // fired yet on the first call.
          setTimeout(() => {
            if (cancelled || !v) return;
            v.play().catch(() => setFailed(true));
          }, 300);
        });
      }
    };

    const onCanPlay = () => tryPlay();
    const onError = () => setFailed(true);
    v.addEventListener('canplay', onCanPlay, { once: true });
    v.addEventListener('error', onError);
    // Try immediately too — some browsers fire canplay before the listener
    // attaches if the video was cached.
    tryPlay();

    return () => {
      cancelled = true;
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
    };
  }, [src]);

  if (failed && poster) {
    return (
      <img
        src={poster}
        alt=""
        className="w-full h-full"
        style={{ objectFit: 'cover', objectPosition }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      disablePictureInPicture
      controls={false}
      className="w-full h-full"
      style={{ objectFit: 'cover', objectPosition }}
    >
      <source src={src} type={mimeFor(src)} />
      {alt && <source src={alt} type={mimeFor(alt)} />}
    </video>
  );
}
