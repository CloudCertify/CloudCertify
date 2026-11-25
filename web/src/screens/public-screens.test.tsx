import { renderToString } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '@/i18n/i18n-context';
import { en } from '@/i18n/messages/en';
import { pt } from '@/i18n/messages/pt';
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
  it('renders the home copy, the example result, and certification links on the server', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(localized(<HomePage quizzes={quizzes} />));

    expect(container.querySelector('h1')?.textContent).toContain(en.home.heroTitleLead);
    expect(container.querySelector('h1')?.textContent).toContain('CLF-C02');
    expect(container.textContent).toContain('742');
    expect(container.textContent).toContain(en.results.scoreLine(47, 65));
    expect(container.querySelector('a[href="/quiz/1"]')).not.toBeNull();
    expect(container.querySelector('[style*="opacity:0"]')).toBeNull();
  });

  it('reads a column of the example result when it is picked', () => {
    render(localized(<HomePage quizzes={quizzes} />));
    const strip = screen.getByRole('slider', { name: en.review.stripLabel });

    expect(strip).toHaveAttribute('aria-valuetext', en.home.heroColumn(5, 'confident', false));
    fireEvent.keyDown(strip, { key: 'Home' });
    expect(strip).toHaveAttribute('aria-valuetext', en.home.heroColumn(1, 'confident', true));
    expect(screen.getByText(en.home.heroColumn(1, 'confident', true))).toBeVisible();
  });

  it('keeps the example result caption on the selected column: keys beat a resting pointer, a finding picks its own', () => {
    render(localized(<HomePage quizzes={quizzes} />));
    const strip = screen.getByRole('slider', { name: en.review.stripLabel });
    vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 650 } as DOMRect);

    fireEvent.pointerMove(strip, { clientX: 5, pointerType: 'mouse' });
    fireEvent.keyDown(strip, { key: 'End' });
    expect(screen.getByText(en.home.heroColumn(65, 'confident', true))).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.results.luckyGuesses) }));
    expect(strip).toHaveAttribute('aria-valuetext', en.home.heroColumn(7, 'guess', true));
  });

  it('runs the home drill from the keyboard in PT, moving focus to each new Question and then the score', () => {
    render(
      <I18nContext.Provider value={{ language: 'pt-BR', t: pt, setLanguage: vi.fn() }}>
        <HomePage quizzes={quizzes} />
      </I18nContext.Provider>
    );
    const answers = [2, 2, 1, 1];

    pt.home.sampleQuestions.forEach((question, n) => {
      const radios = screen.getAllByRole('radio');
      expect(radios.filter(radio => radio.tabIndex === 0)).toHaveLength(1);
      for (let presses = 0; presses <= answers[n]; presses++) fireEvent.keyDown(radios[0], { key: 'ArrowDown' });
      expect(screen.getByRole('radio', { name: question.options[answers[n]] })).toHaveFocus();

      fireEvent.click(screen.getByRole('button', { name: pt.question.check }));
      expect(screen.getAllByRole('radio').every(radio => radio.tabIndex === -1)).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: n === 3 ? pt.question.finishPractice : pt.question.continue }));
      if (n < 3) expect(screen.getByRole('heading', { name: pt.home.sampleQuestions[n + 1].question })).toHaveFocus();
    });

    expect(screen.getByText(`${pt.results.scoreLine(4, 4)}.`)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: pt.common.tryAgain }));
    expect(screen.getByRole('heading', { name: pt.home.sampleQuestions[0].question })).toHaveFocus();
  });

  it('runs the home drill: a Check reveals the explanation and the last one ends on the score', () => {
    render(localized(<HomePage quizzes={quizzes} />));
    const [first] = en.home.sampleQuestions;

    fireEvent.click(screen.getByRole('radio', { name: first.options[2] }));
    fireEvent.click(screen.getByRole('button', { name: en.question.check }));
    expect(screen.getByText(first.explanation)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: en.question.continue }));
    for (const question of en.home.sampleQuestions.slice(1)) {
      fireEvent.click(screen.getByRole('radio', { name: question.options[0] }));
      fireEvent.click(screen.getByRole('button', { name: en.question.check }));
      fireEvent.click(screen.getByRole('button', { name: /Continue|Finish drill/ }));
    }
    expect(screen.getByText(`${en.results.scoreLine(1, 4)}.`)).toBeVisible();
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
