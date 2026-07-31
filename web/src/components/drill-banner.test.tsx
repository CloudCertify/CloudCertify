import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrillBanner } from './drill-banner';
import { AuthProvider } from '@/auth/context';

const renderBanner = (composition?: { missed: number; unseen: number; mastered: number } | null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DrillBanner composition={composition} />
      </AuthProvider>
    </QueryClientProvider>,
  );

describe('DrillBanner', () => {
  it('tells a logged-in User what their drill is made of', () => {
    renderBanner({ missed: 9, unseen: 4, mastered: 2 });

    expect(screen.getByText('9 review · 4 new · 2 refresh')).toBeInTheDocument();
  });

  it('pitches signing in when the drill has no composition', () => {
    renderBanner(null);

    expect(
      screen.getByText('Sign in and your missed questions come back to you.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });
});
