import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { HydratedContentContext, StaticRenderContext } from '@/lib/static-render-context';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Slight rotation on entry for a hand-placed, sticker-like feel. */
  rotate?: number;
};

/**
 * Scroll-triggered entry: fade + rise (+ optional tilt), once, with a
 * weighty ease. Respects reduced-motion via Framer's defaults.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  rotate = 0
}: RevealProps) {
  // Motion's whileInView does NOT auto-respect reduced motion — gate the
  // movement ourselves, keeping the opacity fade so comprehension survives.
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, rotate }}
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

/** Animates a number from 0 → `to` the first time it scrolls into view. */
export function CountUp({
  to,
  suffix = '',
  prefix = '',
  duration = 1.4,
  className
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);
  const isStatic = useContext(StaticRenderContext);
  const hydrated = useContext(HydratedContentContext);
  const reducedMotion = useReducedMotion();
  const showFinalValue = isStatic || hydrated || reducedMotion;

  useEffect(() => {
    if (!inView || showFinalValue) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, showFinalValue]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {showFinalValue ? to : value}
      {suffix}
    </span>
  );
}
