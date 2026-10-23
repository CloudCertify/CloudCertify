'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Slight rotation on entry for a hand-placed, sticker-like feel. */
  rotate?: number;
};

/**
 * Scroll-triggered rise (+ optional tilt), once, with a
 * weighty ease. Respects reduced-motion via Framer's defaults.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  rotate = 0
}: RevealProps) {
  // Keep server-rendered content visible and respect reduced motion.
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y, rotate }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

type CountUpProps = {
  to: number;
  suffix?: string;
  prefix?: string;
  className?: string;
};

/** Keep the final count visible in server-rendered and hydrated content. */
export function CountUp({
  to,
  suffix = '',
  prefix = '',
  className
}: CountUpProps) {
  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {to}
      {suffix}
    </span>
  );
}
