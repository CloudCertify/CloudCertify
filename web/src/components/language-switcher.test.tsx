import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageSwitcher } from './language-switcher';
import { LanguageProvider } from '@/i18n/context';
import { LANGUAGE_STORAGE_KEY } from '@/i18n/language';

function renderSwitcher(locked = false) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LanguageSwitcher locked={locked} />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-US');
});

describe('LanguageSwitcher', () => {
  it('switches the app language and persists the choice', () => {
    renderSwitcher();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Português' }));

    expect(screen.getByRole('button', { name: 'Português' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('is disabled while an attempt is running', () => {
    renderSwitcher(true);
    const option = screen.getByRole('button', { name: 'Português' });
    expect(option).toBeDisabled();

    fireEvent.click(option);
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
  });
});
