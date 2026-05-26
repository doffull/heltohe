import { motion } from 'framer-motion';

/**
 * Glossy chrome-bar page transition.
 * A vertical chromed bar sweeps across the screen left→right
 * while pages desaturate + zoom briefly (handled in App page variants).
 */
export function ChromeBarTransition({ k }: { k: string }) {
  return (
    <motion.div
      key={`chrome-${k}`}
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Chromed bar — gradient silver with sheen */}
      <motion.div
        initial={{ x: '-30vw' }}
        animate={{ x: '110vw' }}
        transition={{ duration: 0.85, ease: [0.7, 0, 0.2, 1] }}
        className="absolute top-0 bottom-0 w-[22vw] min-w-[180px]"
        style={{
          background:
            'linear-gradient(90deg, hsl(var(--foreground) / 0) 0%, hsl(var(--foreground) / 0.15) 15%, hsl(var(--foreground) / 0.55) 40%, hsl(var(--background) / 0.9) 50%, hsl(var(--foreground) / 0.55) 60%, hsl(var(--foreground) / 0.15) 85%, hsl(var(--foreground) / 0) 100%)',
          mixBlendMode: 'overlay',
          boxShadow: '0 0 60px hsl(var(--foreground) / 0.35)',
        }}
      >
        {/* Inner highlight stripe */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px"
          style={{
            background:
              'linear-gradient(180deg, transparent, hsl(var(--background)) 50%, transparent)',
            boxShadow: '0 0 24px 4px hsl(var(--background) / 0.6)',
          }}
        />
      </motion.div>

      {/* Trailing soft light wash */}
      <motion.div
        initial={{ x: '-60vw', opacity: 0 }}
        animate={{ x: '120vw', opacity: [0, 0.35, 0] }}
        transition={{ duration: 1.0, ease: [0.7, 0, 0.2, 1] }}
        className="absolute top-0 bottom-0 w-[55vw]"
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.06), transparent)',
        }}
      />
    </motion.div>
  );
}

export default ChromeBarTransition;
