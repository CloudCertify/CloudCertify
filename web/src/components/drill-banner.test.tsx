import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrillBanner } from './drill-banner';
import { AuthProvider } from '@/auth/context';
import { DrawRule } from '@/http/generated/api.schemas';

const renderBanner = ({
  composition,
  place,
  drawRule,
  questionCount,
}: {
  composition?: { missed: number; unseen: number; mastered: number } | null;
  place?: 'start' | 'review';
  drawRule?: (typeof DrawRule)[keyof typeof DrawRule];
  questionCount?: number;
} = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DrillBanner
          composition={composition}
          place={place}
          drawRule={drawRule}
          questionCount={questionCount}
        />
      </AuthProvider>
    </QueryClientProvider>,
  );

describe('DrillBanner', () => {
  it('tells a logged-in User what their drill is made of', () => {
    renderBanner({
      composition: { missed: 9, unseen: 4, mastered: 2 },
      drawRule: DrawRule.drill_mix,
    });

    expect(screen.getByText('9 review · 4 new · 2 refresh')).toBeInTheDocument();
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
      composition: { missed: 9, unseen: 4, mastered: 2 },
      drawRule: DrawRule.drill_mix,
      place: 'review',
    });

    expect(
      screen.getByText("You just retook 9 questions you'd missed before."),
    ).toBeInTheDocument();
  });

  it('says nothing over the review when nothing was owed back', () => {
    const { container } = renderBanner({
      composition: { missed: 0, unseen: 15, mastered: 0 },
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
