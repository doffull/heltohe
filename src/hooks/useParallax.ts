import { RefObject, useEffect, useRef, useState } from 'react';

/**
 * useParallax — applique un translateY proportionnel au scroll.
 * @param speed 0.1 → 1, plus c'est haut plus l'effet est marqué (recommandé: 0.15 - 0.4)
 * @returns ref + transform (style.transform="translate3d(0,Y,0)")
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.25) {
  const ref = useRef<T | null>(null);
  const [y, setY] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh - rect.top) / (vh + rect.height); // 0 → 1
      setY((progress - 0.5) * rect.height * speed);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [speed]);

  return { ref: ref as RefObject<T>, y, style: { transform: `translate3d(0, ${y}px, 0)`, willChange: 'transform' } };
}
