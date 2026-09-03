import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export function PageBackLink({
  href,
  children,
  className = ''
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 text-sm font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <ArrowLeft className='h-4 w-4' aria-hidden='true' />
      {children}
    </Link>
  );
}
