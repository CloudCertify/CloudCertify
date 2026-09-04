import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-none border-2 border-black px-3 py-1 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all overflow-hidden shadow-[2px_2px_0px_0px_#000]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white',
        secondary: 'bg-secondary text-black',
        destructive: 'bg-destructive text-white',
        outline: 'bg-white text-black'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);
