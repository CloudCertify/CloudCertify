import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Springs an icon in when it mounts; key it on state to replay. */
export function Pop({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className='flex'
      aria-hidden='true'
      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.35, bounce: 0.5 }}
    >
      {children}
    </motion.span>
  );
}
