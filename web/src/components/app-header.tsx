import type { ReactNode } from 'react';
import { Cloud } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/auth/use-auth';
import { AuthMenu } from '@/components/auth-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';

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
  const { t } = useI18n();

  return (
    <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
      <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:border-2 focus:border-black focus:bg-white focus:px-4 focus:py-2 focus:font-bold'>
        {t.common.skipToContent}
      </a>
      <div
        className={cn(
          'container flex min-h-16 flex-wrap items-center justify-between gap-3 py-2 lg:grid lg:h-16 lg:grid-cols-[auto_1fr] lg:py-0',
          children && 'lg:grid-cols-[1fr_auto_1fr]'
        )}
      >
        <Link href='/' className='flex items-center gap-2 text-xl font-black'>
          <span className='flex h-10 w-10 items-center justify-center rounded-none border-2 border-black bg-primary shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-5 w-5 text-white' aria-hidden='true' />
          </span>
          <span>CloudCertify</span>
        </Link>

        {children && <div className='hidden items-center justify-center sm:flex'>{children}</div>}

        <div className='flex flex-wrap items-center justify-end gap-3'>
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
