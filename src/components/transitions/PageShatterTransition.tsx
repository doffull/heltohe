import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Page transition: "shatter & rebuild".
 * Renders 12 grid cells that scatter out then re-converge,
 * giving a quick decompose / recompose visual on every route change.
 * Honors prefers-reduced-motion (simple fade fallback).
 */
export function PageShatterTransition({ k }: { k: string }) {
  const reduce = useReducedMotion();
  const cells = useMemo(() => {
    const cols = 4;
    const rows = 3;
    return Array.from({ length: cols * rows }).map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // deterministic pseudo-random offset based on cell index
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const angle = r * Math.PI * 2;
      const dist = 40 + r * 60;
      return {
        i,
        col,
        row,
        cols,
        rows,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (r - 0.5) * 30,
        delay: r * 0.12,
      };
    });
  }, []);

  if (reduce) {
    return (
      <motion.div
        key={`fade-${k}`}
        className="fixed inset-0 z-[80] pointer-events-none bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.3, times: [0, 0.5, 1] }}
        aria-hidden
      />
    );
  }

  return (
    <motion.div
      key={`shatter-${k}`}
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-hidden
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(4, 1fr)`,
          gridTemplateRows: `repeat(3, 1fr)`,
        }}
      >
        {cells.map((c) => (
          <motion.div
            key={c.i}
            initial={{ opacity: 0, x: c.dx, y: c.dy, rotate: c.rot, scale: 0.85 }}
            animate={{
              opacity: [0, 0.55, 0],
              x: [c.dx, 0, -c.dx * 0.6],
              y: [c.dy, 0, -c.dy * 0.6],
              rotate: [c.rot, 0, -c.rot * 0.5],
              scale: [0.85, 1, 0.9],
            }}
            transition={{
              duration: 0.7,
              delay: c.delay,
              ease: [0.22, 1, 0.36, 1],
              times: [0, 0.55, 1],
            }}
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--foreground) / 0.08), hsl(var(--background) / 0.6))',
              borderRight: '1px solid hsl(var(--foreground) / 0.08)',
              borderBottom: '1px solid hsl(var(--foreground) / 0.08)',
              backdropFilter: 'blur(6px)',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default PageShatterTransition;
