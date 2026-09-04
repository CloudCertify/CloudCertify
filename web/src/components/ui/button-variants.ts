import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-[transform,box-shadow,background-color] duration-150 ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background border-2 border-black",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        destructive:
          'bg-destructive text-white shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        outline:
          'bg-white text-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        secondary:
          'bg-white text-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
        ghost: 'border-transparent hover:bg-primary/20',
        link: 'text-black underline-offset-4 hover:underline border-transparent'
      },
      size: {
        default: 'h-10 px-5 py-2 rounded-none',
        sm: 'h-9 rounded-none gap-1.5 px-4',
        lg: 'h-12 rounded-none px-8 text-base',
        icon: 'size-10 rounded-none'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);
