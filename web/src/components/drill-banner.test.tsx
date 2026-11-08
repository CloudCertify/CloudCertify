import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrillBanner } from './drill-banner';
import { AuthProvider } from '@/auth/context';
import { DrawRule } from '@/http/generated/api.schemas';
import { LanguageProvider } from '@/i18n/context';
import type { Language } from '@/i18n/language';

const renderBanner = ({
  composition,
  place,
  drawRule,
  questionCount,
  language,
}: {
  composition?: { missed: number; due: number; unseen: number; mastered: number } | null;
  place?: 'start' | 'review';
  drawRule?: (typeof DrawRule)[keyof typeof DrawRule];
  questionCount?: number;
  language?: Language;
} = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider initialLanguage={language}>
        <AuthProvider>
          <DrillBanner
            composition={composition}
            place={place}
            drawRule={drawRule}
            questionCount={questionCount}
          />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );

describe('DrillBanner', () => {
  it('tells a logged-in User what their drill is made of', () => {
    renderBanner({
      composition: { missed: 7, due: 4, unseen: 4, mastered: 0 },
      drawRule: DrawRule.drill_mix,
    });

    expect(screen.getByText('7 missed · 4 due · 4 new')).toBeInTheDocument();
  });

  it('counts last-resort Mastered seats only when there are some', () => {
    renderBanner({
      composition: { missed: 2, due: 0, unseen: 1, mastered: 12 },
      drawRule: DrawRule.drill_mix,
    });

    expect(
      screen.getByText('2 missed · 0 due · 1 new · 12 mastered'),
    ).toBeInTheDocument();
  });

  it('tells the make-up in Portuguese', () => {
    renderBanner({
      composition: { missed: 7, due: 4, unseen: 4, mastered: 0 },
      drawRule: DrawRule.drill_mix,
      language: 'pt-BR',
    });

    expect(screen.getByText('7 erradas · 4 vencidas · 4 novas')).toBeInTheDocument();
  });

  it('pitches signing in when the drill has no composition', () => {
    renderBanner({ composition: null, drawRule: DrawRule.uniform });

    expect(
      screen.getByText('Sign in and your missed questions come back to you.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('turns the same fact into a reward over the review', () => {
    renderBanner({
      composition: { missed: 9, due: 0, unseen: 4, mastered: 2 },
      drawRule: DrawRule.drill_mix,
      place: 'review',
    });

    expect(
      screen.getByText("You just retook 9 questions you'd missed before."),
    ).toBeInTheDocument();
  });

  it('says nothing over the review when nothing was owed back', () => {
    const { container } = renderBanner({
      composition: { missed: 0, due: 0, unseen: 15, mastered: 0 },
      drawRule: DrawRule.drill_mix,
      place: 'review',
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('still pitches signing in over the review', () => {
    renderBanner({
      composition: null,
      drawRule: DrawRule.uniform,
      place: 'review',
    });

    expect(
      screen.getByText('Sign in and your missed questions come back to you.'),
    ).toBeInTheDocument();
  });

  it('tells a Mistakes drill how many mistakes it holds, not to sign in', () => {
    renderBanner({
      composition: null,
      drawRule: DrawRule.mistakes,
      questionCount: 12,
    });

    expect(screen.getByText('12 mistakes')).toBeInTheDocument();
    expect(
      screen.queryByText('Sign in and your missed questions come back to you.'),
    ).not.toBeInTheDocument();
  });

  it('words a single-mistake drill in the singular', () => {
    renderBanner({
      composition: null,
      drawRule: DrawRule.mistakes,
      questionCount: 1,
    });

    expect(screen.getByText('1 mistake')).toBeInTheDocument();
  });

  it('closes a Mistakes review without claiming the misses were cleared', () => {
    renderBanner({
      composition: null,
      drawRule: DrawRule.mistakes,
      questionCount: 12,
      place: 'review',
    });

    expect(screen.getByText('You just reviewed 12 mistakes.')).toBeInTheDocument();
    expect(
      screen.queryByText('Sign in and your missed questions come back to you.'),
    ).not.toBeInTheDocument();
  });
});
