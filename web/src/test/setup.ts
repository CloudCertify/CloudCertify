import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetNavigation } from './navigation';

vi.mock('next/navigation', async () => {
  const { navigation } = await import('./navigation');
  return {
    useRouter: () => navigation,
    usePathname: () => navigation.pathname,
    useParams: () => navigation.params,
    useSearchParams: () => navigation.searchParams
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  const { navigation } = await import('./navigation');
  return {
    default: ({ href, replace, onClick, ...props }: import('react').ComponentProps<'a'> & { href: string; replace?: boolean }) =>
      createElement('a', {
        ...props,
        href,
        onClick: (event: import('react').MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return;
          event.preventDefault();
          if (replace) navigation.replace(href);
          else navigation.push(href);
        }
      })
  };
});

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = 'cloudcertify-language=; Max-Age=0; Path=/';
  resetNavigation();
});
