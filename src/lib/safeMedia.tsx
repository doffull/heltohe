/**
 * Safe media helpers — always fall back to /placeholder.svg on error so
 * a single broken WordPress / storage URL never leaves a blank hole in
 * the layout. Use these in lieu of bare <img>/<video> on any user-driven
 * media source.
 */
import { ImgHTMLAttributes, SyntheticEvent, VideoHTMLAttributes, forwardRef } from 'react';

export const MEDIA_FALLBACK = '/placeholder.svg';

export function handleImageFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.dataset.fellBack && !img.src.endsWith(MEDIA_FALLBACK)) {
    img.dataset.fellBack = '1';
    img.src = MEDIA_FALLBACK;
  }
}

export const SafeImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  function SafeImage({ src, loading = 'lazy', decoding = 'async', onError, ...rest }, ref) {
    return (
      <img
        ref={ref}
        src={src || MEDIA_FALLBACK}
        loading={loading}
        decoding={decoding}
        onError={(e) => {
          handleImageFallback(e);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }
);

export const SafeVideo = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  function SafeVideo({ src, onError, children, ...rest }, ref) {
    return (
      <video
        ref={ref}
        src={src || undefined}
        onError={(e) => {
          // Hide the broken player rather than leave a black box.
          const v = e.currentTarget;
          v.style.display = 'none';
          onError?.(e);
        }}
        {...rest}
      >
        {children}
      </video>
    );
  }
);
