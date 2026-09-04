import type { ReactNode } from 'react';
import { Cloud } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/auth/context';
import { AuthMenu } from '@/components/auth-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { cn } from '@/lib/utils';

type AppHeaderProps = {
  children?: ReactNode;
  anonymousActions?: ReactNode;
  languageLocked?: boolean;
};

/**
 * Shared app chrome. Pages own only the optional center slot and any anonymous
 * entry point; account-state presentation stays consistent everywhere.
 */
export function AppHeader({
  children,
  anonymousActions,
  languageLocked = false
}: AppHeaderProps) {
  const { isAuthenticated } = useAuth();

  return (
    <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
      <div
        className={cn(
          'container grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3',
          children && 'sm:grid-cols-[1fr_auto_1fr]'
        )}
      >
        <Link href='/' className='flex items-center gap-2 text-xl font-black'>
          <span className='flex h-10 w-10 items-center justify-center rounded-none border-2 border-black bg-primary shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-5 w-5 text-white' aria-hidden='true' />
          </span>
          <span>CloudCertify</span>
        </Link>

        <div className='hidden items-center justify-center sm:flex'>{children}</div>

        <div className='flex items-center justify-end gap-3'>
          {isAuthenticated ? (
            <AuthMenu languageLocked={languageLocked} />
          ) : (
            <>
              <LanguageSwitcher locked={languageLocked} />
              {anonymousActions}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
