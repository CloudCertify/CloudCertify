import { renderToString } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '@/i18n/i18n-context';
import { en } from '@/i18n/messages/en';
import type { QuizDto } from '@/http/generated/api.schemas';
import { HomePage } from './home';
import { DashboardPage } from './dashboard';

vi.mock('@/components/app-header', () => ({ AppHeader: () => null }));
vi.mock('@/components/auth-menu', () => ({ AuthMenu: () => null }));
// Public screens render server data without a query provider or GET hooks.
vi.mock('@/http/generated/api', () => ({}));

const quizzes: QuizDto[] = [
  { id: 1, title: 'AWS Cloud Practitioner (CLF-C02)', quizProvider: 'aws', quizLevel: 'foundational', questionCount: 120, isAvailable: true },
  { id: 2, title: 'Azure Fundamentals', quizProvider: 'azure', quizLevel: 'foundational', questionCount: 80, isAvailable: true }
];

function localized(children: import('react').ReactNode) {
  return (
    <I18nContext.Provider value={{ language: 'en-US', t: en, setLanguage: vi.fn() }}>
      {children}
    </I18nContext.Provider>
  );
}

describe('public screens with server data', () => {
  it('renders final home counts, visible copy, and certification links on the server', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(localized(<HomePage quizzes={quizzes} />));

    expect(container.textContent).toContain('500+');
    expect(container.textContent).toContain(en.home.heroTitleLead);
    expect(container.querySelector('a[href="/quiz/1"]')).not.toBeNull();
    expect(container.querySelector('[style*="opacity:0"]')).toBeNull();
    const chip = container.querySelector('h1 [aria-hidden="true"]');
    expect(chip?.textContent).toBe('AWS');
    expect(chip?.innerHTML).not.toContain('translateY(100%)');
  });

  it('keeps dashboard provider selection interactive using the supplied quizzes', () => {
    render(localized(<DashboardPage quizzes={quizzes} />));

    expect(screen.getByText(quizzes[0].title!)).toBeVisible();
    expect(screen.getByText(en.common.questions(120))).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Azure/i }));

    expect(screen.getByText(quizzes[1].title!)).toBeVisible();
    expect(screen.queryByText(quizzes[0].title!)).not.toBeInTheDocument();
  });
});
