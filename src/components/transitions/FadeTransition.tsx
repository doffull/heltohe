import { motion, useReducedMotion } from 'framer-motion';

interface Props { k: string }

/**
 * Simple fade page transition (lightweight alternative to shutter).
 */
export function FadeTransition({ k }: Props) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      key={`fade-${k}`}
      className="fixed inset-0 z-[70] pointer-events-none bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0] }}
      transition={{ duration: 0.45, ease: 'easeInOut', times: [0, 0.5, 1] }}
    />
  );
}
