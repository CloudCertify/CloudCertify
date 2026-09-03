import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { AuthProvider } from '@/auth/context';
import { clearToken, setToken } from '@/auth/token';
import { LanguageProvider } from '@/i18n/context';
import { LANGUAGE_STORAGE_KEY, setCurrentLanguage } from '@/i18n/language';
import { AppHeader } from './app-header';

const me = vi.hoisted(() => ({
  data: {
    data: {
      id: 7,
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      avatarUrl: null
    }
  }
}));

vi.mock('@/http/generated/api', () => ({
  useGetMe: () => me,
  getGetMeQueryKey: () => ['/me']
}));

function makeJwt(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;
}

function renderHeader({
  authenticated = false,
  languageLocked = false
}: {
  authenticated?: boolean;
  languageLocked?: boolean;
} = {}) {
  if (authenticated) {
    setToken(makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  }

  const location = memoryLocation({ path: '/', record: true });
  const result = render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <AuthProvider>
          <Router hook={location.hook}>
            <AppHeader
              languageLocked={languageLocked}
              anonymousActions={<a href='/dashboard'>Dashboard</a>}
            >
              <a href='#certifications'>Certifications</a>
            </AppHeader>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );

  return { location, ...result };
}

function openMenu() {
  const trigger = screen.getByRole('button', {
    name: /profile menu for Ada Lovelace|menu do perfil de Ada Lovelace/i
  });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return trigger;
}

beforeEach(() => {
  clearToken();
  setCurrentLanguage('en-US');
});

describe('AppHeader', () => {
  it('shows the standalone language and page entry point only when anonymous', () => {
    renderHeader();

    expect(screen.getByRole('group', { name: 'Change language' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /profile menu/i })).not.toBeInTheDocument();
  });

  it('collapses authenticated account controls into a profile menu', () => {
    renderHeader({ authenticated: true });

    const trigger = screen.getByRole('button', {
      name: 'Profile menu for Ada Lovelace'
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Change language' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ada Lovelace')).toBeVisible();
    expect(screen.getByText('ada@example.com')).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('menuitem', { name: 'Progress' })).toHaveAttribute(
      'href',
      '/progress'
    );
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeVisible();
  });

  it('changes language without closing the profile menu', () => {
    renderHeader({ authenticated: true });
    const trigger = openMenu();

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Português' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Progresso' })).toBeVisible();
  });

  it('includes the language choices in arrow-key menu navigation', async () => {
    renderHeader({ authenticated: true });
    openMenu();
    const dashboard = screen.getByRole('menuitem', { name: 'Dashboard' });
    const progress = screen.getByRole('menuitem', { name: 'Progress' });

    expect(dashboard).toHaveFocus();
    fireEvent.keyDown(dashboard, { key: 'ArrowDown', code: 'ArrowDown' });
    await waitFor(() => expect(progress).toHaveFocus());
    fireEvent.keyDown(progress, { key: 'ArrowDown', code: 'ArrowDown' });

    await waitFor(() =>
      expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus()
    );
  });

  it('locks language controls both standalone and inside the profile menu', () => {
    const { unmount } = renderHeader({ languageLocked: true });
    expect(screen.getByRole('button', { name: 'Português' })).toBeDisabled();
    unmount();

    renderHeader({ authenticated: true, languageLocked: true });
    openMenu();
    expect(
      screen.getByRole('menuitemradio', { name: 'Português' })
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('group', { name: 'Change language' })).toHaveAttribute(
      'title',
      expect.stringContaining('fixed for this attempt')
    );
  });

  it('closes on Escape and restores focus to the avatar trigger', async () => {
    renderHeader({ authenticated: true });
    const trigger = openMenu();
    expect(screen.getByRole('menu')).toBeVisible();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('ends the session from the profile menu', async () => {
    renderHeader({ authenticated: true });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /profile menu/i })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('group', { name: 'Change language' })).toBeVisible();
  });
});
