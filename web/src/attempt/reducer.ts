import type {
  CheckAnswerResponseDto,
  Confidence,
  QuestionDto
} from '@/http/generated/api.schemas';
import { nextSelection, requiredCount } from './selection';
import type { AttemptProgress, SubmitResponse, Mode, StartPayload } from './storage';

/**
 * What each Mode does (CONTEXT.md, ADR 0010). Exam: deferred correctness, the
 * Navigator, optional Confidence, every selection committed as a Recorded Answer.
 * Practice: Check, forward-only, no Confidence, no Navigator.
 */
export const MODE_RULES = {
  exam: {
    feedbackTiming: 'submit',
    navigator: true,
    confidence: true,
    forwardOnly: false,
    commitsSelections: true
  },
  practice: {
    feedbackTiming: 'check',
    navigator: false,
    confidence: false,
    forwardOnly: true,
    commitsSelections: false
  }
} as const satisfies Record<Mode, unknown>;

export type QuestionPhase = 'answering' | 'checking' | 'checked';

export type AttemptState = {
  status: 'loading' | 'active' | 'empty' | 'finished';
  payload: StartPayload | null;
  currentIndex: number;
  selections: Record<number, number[]>;
  /** Confidence is optional and never gates Submit: an unrated Question is absent. */
  confidences: Record<number, Confidence>;
  /** Practice: the Check response per Question. A Check is final. */
  checks: Record<number, CheckAnswerResponseDto>;
  checking: boolean;
  /** One Report per (Submission, Question), carried onto the results list (#41). */
  reported: number[];
  /** Exam: Questions whose latest commit is queued, in flight or failed. */
  commits: Record<number, 'pending' | 'failed'>;
  confirmingSubmit: boolean;
  submitting: boolean;
  restarting: boolean;
  result: SubmitResponse | null;
};

export type AttemptAction =
  | { type: 'loaded'; payload: StartPayload; progress: AttemptProgress | null }
  | { type: 'selected'; answerId: number }
  | { type: 'rated'; confidence: Confidence }
  | { type: 'moved'; index: number }
  | { type: 'checkStarted' }
  | { type: 'checked'; questionId: number; check: CheckAnswerResponseDto }
  | { type: 'checkFailed' }
  | { type: 'continued' }
  | { type: 'submitRequested' }
  | { type: 'submitCancelled' }
  | { type: 'submitStarted' }
  | { type: 'submitStopped' }
  | { type: 'finished'; result: SubmitResponse }
  | { type: 'commit'; questionId: number; status: 'pending' | 'failed' | null }
  | { type: 'reported'; questionId: number }
  | { type: 'restartStarted' }
  | { type: 'restartStopped' };

export const initialAttemptState: AttemptState = {
  status: 'loading',
  payload: null,
  currentIndex: 0,
  selections: {},
  confidences: {},
  checks: {},
  checking: false,
  reported: [],
  commits: {},
  confirmingSubmit: false,
  submitting: false,
  restarting: false,
  result: null
};

export function questionsOf(state: AttemptState): QuestionDto[] {
  return state.payload?.detail.questions ?? [];
}

export function currentQuestionOf(state: AttemptState): QuestionDto | null {
  return questionsOf(state)[state.currentIndex] ?? null;
}

export function rulesOf(state: AttemptState) {
  return MODE_RULES[state.payload?.mode ?? 'exam'];
}

export function selectionOf(state: AttemptState, questionId: number | undefined): number[] {
  return questionId == null ? [] : state.selections[questionId] ?? [];
}

export function phaseOf(state: AttemptState, questionId: number | undefined): QuestionPhase {
  if (questionId != null && state.checks[questionId]) return 'checked';
  return state.checking && currentQuestionOf(state)?.id === questionId ? 'checking' : 'answering';
}

export function canCheck(state: AttemptState): boolean {
  const question = currentQuestionOf(state);
  return (
    state.status === 'active' &&
    !state.submitting &&
    rulesOf(state).feedbackTiming === 'check' &&
    question?.id != null &&
    phaseOf(state, question.id) === 'answering' &&
    selectionOf(state, question.id).length === requiredCount(question)
  );
}

export function isLastQuestion(state: AttemptState): boolean {
  return state.currentIndex >= questionsOf(state).length - 1;
}

function without<T>(record: Record<number, T>, key: number): Record<number, T> {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

/** Pure: every change to an attempt goes through here. An ignored action returns `state`. */
export function attemptReducer(state: AttemptState, action: AttemptAction): AttemptState {
  const question = currentQuestionOf(state);
  const questionId = question?.id;
  const rules = rulesOf(state);
  const active = state.status === 'active';
  // Once Submit is under way the graded set is fixed: no more answer changes.
  const answering = active && !state.submitting;

  switch (action.type) {
    case 'loaded': {
      const count = action.payload.detail.questions?.length ?? 0;
      const progress = action.payload.detail.questions?.length ? action.progress : null;
      return {
        ...initialAttemptState,
        payload: action.payload,
        status: count === 0 ? 'empty' : progress?.result ? 'finished' : 'active',
        currentIndex: Math.min(progress?.currentIndex ?? 0, Math.max(count - 1, 0)),
        selections: progress?.selections ?? {},
        confidences: progress?.confidences ?? {},
        checks: progress?.checks ?? {},
        reported: progress?.reported ?? [],
        commits: Object.fromEntries((progress?.unsaved ?? []).map(id => [id, 'pending'])),
        result: progress?.result ?? null
      };
    }
    case 'selected': {
      if (!answering || question == null || questionId == null) return state;
      if (phaseOf(state, questionId) !== 'answering') return state;
      const current = selectionOf(state, questionId);
      const next = nextSelection(question, current, action.answerId);
      // Nothing changed (capped, or the same single choice re-picked): keep any Confidence.
      if (next === current) return state;
      return {
        ...state,
        selections: { ...state.selections, [questionId]: next },
        // A new answer invalidates the old rating: changing the answer means re-rating it.
        confidences: without(state.confidences, questionId)
      };
    }
    case 'rated':
      if (!answering || !rules.confidence || questionId == null) return state;
      if (selectionOf(state, questionId).length === 0) return state;
      if (state.confidences[questionId] === action.confidence) return state;
      return { ...state, confidences: { ...state.confidences, [questionId]: action.confidence } };
    case 'moved': {
      if (!active || !rules.navigator) return state;
      const index = Math.max(0, Math.min(action.index, questionsOf(state).length - 1));
      return index === state.currentIndex ? state : { ...state, currentIndex: index };
    }
    case 'checkStarted':
      return canCheck(state) ? { ...state, checking: true } : state;
    case 'checked':
      return {
        ...state,
        checking: false,
        checks: { ...state.checks, [action.questionId]: action.check }
      };
    case 'checkFailed':
      return { ...state, checking: false };
    case 'continued':
      if (!active || !rules.forwardOnly || phaseOf(state, questionId) !== 'checked') return state;
      return isLastQuestion(state) ? state : { ...state, currentIndex: state.currentIndex + 1 };
    case 'submitRequested':
      return active && rules.feedbackTiming === 'submit' ? { ...state, confirmingSubmit: true } : state;
    case 'submitCancelled':
      return { ...state, confirmingSubmit: false };
    case 'submitStarted':
      return !active || state.submitting
        ? state
        : { ...state, submitting: true, confirmingSubmit: false };
    case 'submitStopped':
      return { ...state, submitting: false };
    case 'finished':
      return { ...state, status: 'finished', submitting: false, result: action.result };
    case 'commit':
      return {
        ...state,
        commits:
          action.status == null
            ? without(state.commits, action.questionId)
            : { ...state.commits, [action.questionId]: action.status }
      };
    case 'reported':
      return state.reported.includes(action.questionId)
        ? state
        : { ...state, reported: [...state.reported, action.questionId] };
    case 'restartStarted':
      return state.restarting ? state : { ...state, restarting: true };
    case 'restartStopped':
      return { ...state, restarting: false };
  }
}

export function progressOf(state: AttemptState): AttemptProgress {
  return {
    submissionId: state.payload?.detail.submissionId ?? null,
    currentIndex: state.currentIndex,
    selections: state.selections,
    confidences: state.confidences,
    checks: state.checks,
    reported: state.reported,
    unsaved: Object.keys(state.commits).map(Number),
    result: state.result
  };
}
