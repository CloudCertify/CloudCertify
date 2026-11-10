import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Visual keyboard-shortcut hint. Decorative (aria-hidden): pair it with
 * `aria-keyshortcuts` on the control it labels. Hidden on touch-only devices,
 * where there is no keyboard to press. Styled as a small keycap matching the
 * outline Badge, so it reads on light and filled backgrounds alike.
 */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      aria-hidden='true'
      className={cn(
        'hidden pointer-fine:inline-flex min-w-6 h-6 shrink-0 items-center justify-center rounded-none border-2 border-black bg-white px-1.5 text-xs font-black leading-none text-black shadow-[2px_2px_0px_0px_#000]',
        className
      )}
      {...props}
    />
  );
}
