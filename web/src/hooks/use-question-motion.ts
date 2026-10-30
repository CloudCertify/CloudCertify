import { useEffect, useRef, useState } from 'react';
import { useReducedMotion, type Transition } from 'motion/react';

export const spring: Transition = { type: 'spring', duration: 0.45, bounce: 0.12 };

/**
 * Question-to-question motion: content slides in from the direction of travel
 * with a short blur, and the card scrolls back into view when the next action
 * left it above the fold (phones). Reduced motion keeps only the fade.
 */
export function useQuestionMotion(index: number) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [previous, setPrevious] = useState(index);
  const [direction, setDirection] = useState(1);
  if (index !== previous) {
    setPrevious(index);
    setDirection(index > previous ? 1 : -1);
  }

  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top;
    // Clear the sticky header, whatever height it wrapped to.
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (top != null && top < header) {
      window.scrollBy({ top: top - header - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [index, reduce]);

  const enter = (delay = 0) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: direction * 24, filter: 'blur(4px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: { ...spring, delay }
  });

  return { ref, reduce, enter };
}
