import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/** The result as one large number that counts up once, after the columns have had their moment. */
export function ScoreCount({ value, from = 0, suffix = '', delay = 0 }: { value: number; from?: number; suffix?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : from);

  useEffect(() => {
    if (reduce) return setShown(value);
    const controls = animate(from, value, { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1], onUpdate: latest => setShown(Math.round(latest)) });
    return () => controls.stop();
  }, [reduce, value, from, delay]);

  return (
    <p className='text-[5.5rem] font-black leading-none tabular-nums font-stretch-[125%] sm:text-[9rem]' aria-label={`${value}${suffix}`}>
      {shown}
      {suffix}
    </p>
  );
}
