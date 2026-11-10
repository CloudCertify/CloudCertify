import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/messages/en';
import { resetNavigation } from '@/test/navigation';
import { MODE_RULES } from '@/attempt/reducer';
import type { Attempt } from '@/attempt/use-attempt';
import type { SubmitResponse, StartPayload } from '@/attempt/storage';
import { QuizSessionPage } from './quiz-session';
import { DrillSessionPage } from './drill-session';

vi.mock('@/components/app-header', () => ({ AppHeader: () => null }));
vi.mock('@/components/drill-banner', () => ({ DrillBanner: () => null }));

const attempt = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('@/attempt/use-attempt', () => ({ useAttempt: () => attempt.current }));

const question = {
  id: 1,
  type: 'multiple_choice' as const,
  selectCount: 1,
  text: 'Which service stores objects?',
  answers: [{ id: 11, text: 'Amazon S3' }, { id: 12, text: 'Amazon RDS' }]
};

const result: SubmitResponse = {
  score: 60,
  totalQuestions: 1,
  correctCount: 0,
  scaledScore: 710,
  passed: false,
  luckyGuessCount: 0,
  misconceptionCount: 0,
  domainBreakdown: [],
  questions: []
};

function given(payload: StartPayload, state: Partial<Attempt>) {
  const noop = vi.fn();
  attempt.current = {
    status: 'active',
    mode: payload.mode,
    rules: MODE_RULES[payload.mode],
    payload,
    questions: payload.detail.questions ?? [],
    currentIndex: 0,
    currentQuestion: payload.detail.questions?.[0] ?? null,
    isLast: true,
    selectedIds: [],
    confidences: {},
    confidence: null,
    phase: 'answering',
    checkResponse: null,
    canCheck: false,
    answered: [false],
    unansweredCount: 1,
    unsavedCount: 0,
    confirmingSubmit: false,
    submitting: false,
    restarting: false,
    result: null,
    reported: [],
    select: noop,
    rate: noop,
    goTo: noop,
    check: noop,
    proceed: noop,
    requestSubmit: noop,
    cancelSubmit: noop,
    confirmSubmit: noop,
    restart: noop,
    markReported: noop,
    ...state
  } satisfies Attempt;
}

const exam: StartPayload = {
  mode: 'exam',
  detail: { id: 1, title: 'Exam', submissionId: 5, questions: [question] },
  email: null
};
const drill: StartPayload = {
  mode: 'practice',
  detail: { id: 4, title: 'Cloud Concepts', submissionId: 6, questions: [question] },
  email: null
};

beforeEach(() => {
  resetNavigation('/quiz/1/session', { id: '1', drillId: '4' });
});

describe('session screens', () => {
  it.each([
    ['Exam', QuizSessionPage, exam],
    ['Practice', DrillSessionPage, drill]
  ] as const)('%s: shows a message and a way back for an attempt with no Questions', (_, Page, payload) => {
    given({ ...payload, detail: { ...payload.detail, questions: [] } } as StartPayload, {
      status: 'empty',
      currentQuestion: null,
      questions: []
    });
    render(<Page />);
    expect(screen.getByRole('heading', { name: en.attempt.emptyTitle })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.common.backToCertification })).toHaveAttribute(
      'href',
      '/quiz/1'
    );
  });

  it('Exam: shows the current Question and the unsaved answers count', () => {
    given(exam, { unsavedCount: 2 });
    render(<QuizSessionPage />);
    expect(screen.getByText(question.text)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(en.attempt.unsavedCount(2));
  });

  it('Exam: shows the pass mark the server graded against', () => {
    given(exam, { status: 'finished', result: { ...result, passingScore: 720 } });
    render(<QuizSessionPage />);
    expect(screen.getByText(en.results.passingScore(false, '720'))).toBeInTheDocument();
  });

  it('Exam: shows only the verdict while the server sends no pass mark', () => {
    given(exam, { status: 'finished', result: { ...result, passed: true } });
    render(<QuizSessionPage />);
    expect(screen.getByText(en.attempt.verdict(true))).toBeInTheDocument();
    expect(screen.queryByText(/700/)).not.toBeInTheDocument();
  });

  it('Practice: follows the server verdict, not a score band', () => {
    given(drill, { status: 'finished', result: { ...result, score: 90, passed: false, passingScore: 95 } });
    render(<DrillSessionPage />);
    expect(screen.getByText('90%').parentElement).toHaveStyle({ backgroundColor: '#e23b48' });
    expect(screen.getByText(en.results.passingScore(false, '95%'))).toBeInTheDocument();
  });
});
