import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Visual keyboard-shortcut hint. Decorative (aria-hidden): pair it with
 * `aria-keyshortcuts` on the control it labels. Hidden on touch-only devices,
 * where there is no keyboard to press. Inherits text colour, so it reads on
 * both light and filled backgrounds.
 */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      aria-hidden='true'
      className={cn(
        'hidden pointer-fine:inline-flex min-w-6 h-6 shrink-0 items-center justify-center border-2 border-current px-1 font-mono text-xs font-bold leading-none opacity-60',
        className
      )}
      {...props}
    />
  );
}
