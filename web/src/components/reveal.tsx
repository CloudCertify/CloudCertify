'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform
} from 'motion/react';
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
  duration?: number;
  className?: string;
};

/**
 * Server HTML carries the real number. Stats still below the fold at
 * hydration reset to 0 and count up the first time they scroll into view.
 */
export function CountUp({
  to,
  suffix = '',
  prefix = '',
  duration = 1.4,
  className
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const count = useMotionValue(to);
  const rounded = useTransform(count, Math.round);
  const armed = useRef(false);

  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top;
    if (!reduce && top != null && top > window.innerHeight) {
      count.set(0);
      armed.current = true;
    }
  }, [count, reduce]);

  useEffect(() => {
    if (!armed.current || !inView) return;
    const controls = animate(count, to, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [count, inView, to, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
