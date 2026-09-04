import { describe, expect, it } from 'vitest';
import { drillStartErrorMessage } from './drill-start-error';

const copy = {
  nothingToReview: 'Nothing to review yet. Take an Exam or a Domain Drill first.',
  signInRequired: 'Sign in to review your mistakes.',
  fallback: 'Could not start the Drill. Please try again.'
};

function axiosStatus(status: number) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status }
  });
}

describe('drillStartErrorMessage', () => {
  it('says there is nothing to review when the start answers 409', () => {
    expect(drillStartErrorMessage(axiosStatus(409), copy)).toBe(
      copy.nothingToReview
    );
  });

  it('asks the visitor to sign in when the start answers 401', () => {
    expect(drillStartErrorMessage(axiosStatus(401), copy)).toBe(
      copy.signInRequired
    );
  });

  it('keeps the generic start error for any other failure', () => {
    expect(drillStartErrorMessage(axiosStatus(500), copy)).toBe(copy.fallback);
    expect(drillStartErrorMessage(new Error('offline'), copy)).toBe(
      copy.fallback
    );
  });
});
