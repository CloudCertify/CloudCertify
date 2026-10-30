'use client';

import { useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cloud, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/auth/use-auth';
import { AccountNav, AuthMenu } from '@/components/auth-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';

type NavLink = { href: string; label: string };

type AppHeaderProps = {
  /** In-page section links: centered on desktop, listed first in the mobile sidebar. */
  links?: NavLink[];
  anonymousActions?: ReactNode;
  languageLocked?: boolean;
};

/**
 * Shared app chrome. Pages own only the section links and any anonymous entry
 * point; account-state presentation stays consistent everywhere. Below `md`
 * everything but the logo moves into a sidebar so the header stays one row.
 */
export function AppHeader({
  links,
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
          'container flex h-16 items-center justify-between gap-3',
          links && 'md:grid md:grid-cols-[1fr_auto_1fr]'
        )}
      >
        <Link href='/' className='flex items-center gap-2 text-xl font-black'>
          <span className='flex h-10 w-10 items-center justify-center rounded-none border-2 border-black bg-primary shadow-[2px_2px_0px_0px_#000]'>
            <Cloud className='h-5 w-5 text-white' aria-hidden='true' />
          </span>
          <span>CloudCertify</span>
        </Link>

        {links && (
          <nav className='hidden items-center justify-center gap-6 md:flex'>
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className='text-sm font-bold text-black transition-colors hover:underline'
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className='hidden items-center justify-end gap-3 md:flex'>
          {isAuthenticated ? (
            <AuthMenu languageLocked={languageLocked} />
          ) : (
            <>
              <LanguageSwitcher locked={languageLocked} />
              {anonymousActions}
            </>
          )}
        </div>

        <MobileSidebar
          links={links}
          anonymousActions={anonymousActions}
          languageLocked={languageLocked}
        />
      </div>
    </header>
  );
}

function MobileSidebar({ links, anonymousActions, languageLocked }: AppHeaderProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Section links scroll only once the sidebar has released its scroll lock.
  const pendingHash = useRef<string | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant='outline' size='icon' className='md:hidden' aria-label={t.nav.openMenu}>
          <Menu aria-hidden='true' />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden' />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={event => {
            const hash = pendingHash.current;
            if (!hash) return;
            pendingHash.current = null;
            event.preventDefault();
            requestAnimationFrame(() => {
              history.pushState(null, '', hash);
              document.querySelector<HTMLElement>(hash)?.scrollIntoView();
            });
          }}
          className='fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col border-l-2 border-black bg-white data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:animate-none md:hidden'
        >
          <div className='flex h-16 shrink-0 items-center justify-between border-b-2 border-black px-4'>
            <Dialog.Title className='text-lg font-black'>{t.nav.menu}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant='outline' size='icon' aria-label={t.nav.closeMenu}>
                <X aria-hidden='true' />
              </Button>
            </Dialog.Close>
          </div>

          <div className='flex flex-1 flex-col gap-6 overflow-y-auto p-4'>
            {links && (
              <nav className='flex flex-col gap-1'>
                {links.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={event => {
                      event.preventDefault();
                      pendingHash.current = link.href;
                      setOpen(false);
                    }}
                    className='flex min-h-11 items-center px-3 font-bold text-black hover:bg-primary/20'
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}

            {isAuthenticated ? (
              <AccountNav onNavigate={() => setOpen(false)} />
            ) : (
              anonymousActions && <div className='flex flex-col gap-2'>{anonymousActions}</div>
            )}

            <LanguageSwitcher locked={languageLocked} className='mt-auto self-start' />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
