import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '@/i18n/i18n-context';
import { pt } from '@/i18n/messages/pt';
import { QuizPage } from './quiz';

vi.mock('@/components/app-header', () => ({ AppHeader: () => null }));

describe('sample Quiz localization', () => {
  it('renders Portuguese questions and keeps selections through navigation', () => {
    render(
      <I18nContext.Provider value={{ language: 'pt-BR', t: pt, setLanguage: vi.fn() }}>
        <QuizPage />
      </I18nContext.Provider>
    );
    expect(screen.getByRole('group', { name: pt.demoQuiz[0].question })).toBeInTheDocument();
    const answer = screen.getByRole('button', { name: pt.demoQuiz[0].options[0] });
    expect(answer).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(answer);
    expect(answer).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: pt.common.next }));
    expect(screen.getByRole('group', { name: pt.demoQuiz[1].question })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: pt.common.previous }));
    expect(screen.getByRole('button', { name: pt.demoQuiz[0].options[0] })).toHaveAttribute('aria-pressed', 'true');
  });
});
