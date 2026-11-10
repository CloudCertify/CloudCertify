import type { ReactNode } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

export type Shortcut = { keys: ReactNode[]; label: string };

/**
 * One-line legend of the card's keyboard shortcuts, shown in the footer.
 * Decorative: the controls themselves carry `aria-keyshortcuts`. Hidden on
 * touch-only devices and narrow screens, where it would only add clutter.
 */
export function ShortcutLegend({
  items,
  className
}: {
  items: Shortcut[];
  className?: string;
}) {
  return (
    <ul
      aria-hidden='true'
      className={cn(
        'hidden md:pointer-fine:flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-black/60',
        className
      )}
    >
      {items.map(item => (
        <li key={item.label} className='flex items-center gap-1.5'>
          {item.keys.map((key, i) => (
            <Kbd key={i}>{key}</Kbd>
          ))}
          <span className='ml-0.5'>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
