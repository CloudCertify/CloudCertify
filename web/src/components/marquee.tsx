import type { CSSProperties } from 'react';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarqueeProps = {
  items: string[];
  className?: string;
  /** Seconds for one full loop. Lower = faster. */
  speed?: number;
  reverse?: boolean;
};

/**
 * Infinite horizontal ticker. Content is duplicated so the CSS translate of
 * -50% loops seamlessly. Pauses for reduced-motion users.
 */
export function Marquee({
  items,
  className,
  speed = 28,
  reverse = false
}: MarqueeProps) {
  const Row = () => (
    <ul
      className='flex shrink-0 items-center'
      aria-hidden='true'
    >
      {items.map((item, i) => (
        <li
          key={i}
          className='flex items-center gap-6 whitespace-nowrap px-6 text-2xl font-black uppercase tracking-tight md:text-3xl'
        >
          {item}
          <Cloud className='h-5 w-5 shrink-0 fill-current md:h-6 md:w-6' />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        'marquee-root flex w-full overflow-hidden border-y-2 border-black',
        className
      )}
    >
      <div
        className='marquee-track flex w-max'
        style={
          {
            '--marquee-duration': `${speed}s`,
            '--marquee-direction': reverse ? 'reverse' : 'normal'
          } as CSSProperties
        }
      >
        <Row />
        <Row />
      </div>
    </div>
  );
}
