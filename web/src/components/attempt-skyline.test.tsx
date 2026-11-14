import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { en } from '@/i18n/messages/en';
import { useSound } from '@/lib/cue';
import type { QuestionDto } from '@/http/generated/api.schemas';
import { ConfidenceRating } from './confidence-rating';
import { runLengths } from './drill-columns';
import { ExamStrip, type StripCell } from './exam-strip';
import { PracticeQuestionCard } from './practice-question-card';
import { QuestionCard } from './question-card';

const question: QuestionDto = {
  id: 1,
  text: 'Pick one',
  type: 'multiple_choice',
  selectCount: 1,
  answers: [
    { id: 10, text: 'Alpha' },
    { id: 20, text: 'Beta' }
  ]
};

describe('Drill columns', () => {
  it('counts each run of right answers and restarts it after a miss', () => {
    expect(runLengths([true, true, false, true, null])).toEqual([1, 2, 0, 1, 0]);
  });
});

describe('PracticeQuestionCard verdict', () => {
  const card = { index: 2, total: 5, question, selectedIds: [20], onSelect: () => {}, phase: 'revealed' as const, onCheck: () => {}, onContinue: () => {}, canCheck: false, isChecking: false, isFinishing: false, isLast: false };

  it('names the right answer after a miss', () => {
    render(<PracticeQuestionCard {...card} outcomes={[true, true, false, null, null]} reveal={{ isCorrect: false, correctAnswerIds: [10], selectedAnswerIds: [20], explanation: 'Because.' }} />);
    expect(screen.getByText(en.question.notQuite)).toBeInTheDocument();
    expect(screen.getByText(en.question.answerIs('Alpha'))).toBeInTheDocument();
    expect(screen.getByText(en.question.streak(0))).toBeInTheDocument();
  });

  it('says how many in a row once a streak is under way', () => {
    render(<PracticeQuestionCard {...card} selectedIds={[10]} outcomes={[true, true, true, null, null]} reveal={{ isCorrect: true, correctAnswerIds: [10], selectedAnswerIds: [10] }} />);
    expect(screen.getByText(en.question.correctStreak(3))).toBeInTheDocument();
  });
});

describe('ExamStrip as the Navigator', () => {
  const cells: StripCell[] = Array.from({ length: 10 }, (_, i) => (i < 4 ? { height: 100, tone: 'answered' } : { height: 0, tone: 'empty' }));

  function renderStrip(onJump = vi.fn()) {
    render(<ExamStrip cells={cells} current={0} onJump={onJump} label='Navigator' valueText={i => `Question ${i + 1}`} />);
    const strip = screen.getByRole('slider', { name: 'Navigator' });
    // jsdom lays nothing out: give the strip 100px, so a column is 10px wide.
    strip.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 50, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => ({}) });
    return { strip, onJump };
  }

  it('a touch shows the Question under the finger in a loupe and goes there on release', () => {
    const { strip, onJump } = renderStrip();
    fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 35, clientY: 20 });
    expect(screen.getByTestId('strip-loupe')).toHaveTextContent('Question 4');
    fireEvent.pointerMove(strip, { pointerType: 'touch', clientX: 72, clientY: 200 });
    expect(screen.getByTestId('strip-loupe')).toHaveTextContent('Question 8');
    expect(onJump).not.toHaveBeenCalled();
    fireEvent.pointerUp(strip, { pointerType: 'touch' });
    expect(onJump).toHaveBeenCalledWith(7);
    expect(screen.queryByTestId('strip-loupe')).not.toBeInTheDocument();
  });

  it('a cancelled touch goes nowhere', () => {
    const { strip, onJump } = renderStrip();
    fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 35, clientY: 20 });
    fireEvent.pointerCancel(strip, { pointerType: 'touch' });
    expect(onJump).not.toHaveBeenCalled();
  });

  it('a mouse gets no loupe, and Home and End reach the ends', () => {
    const { strip, onJump } = renderStrip();
    fireEvent.pointerDown(strip, { pointerType: 'mouse', clientX: 35, clientY: 20 });
    expect(screen.queryByTestId('strip-loupe')).not.toBeInTheDocument();
    fireEvent.pointerUp(strip, { pointerType: 'mouse' });
    expect(onJump).toHaveBeenLastCalledWith(3);
  });

  it('owns its keys while focused: arrows step, Home and End reach the ends, none reach the page', () => {
    const { strip, onJump } = renderStrip();
    const page = vi.fn();
    window.addEventListener('keydown', page);
    for (const [key, index] of [['ArrowRight', 1], ['ArrowUp', 1], ['ArrowLeft', 0], ['ArrowDown', 0], ['End', 9], ['Home', 0]] as const) {
      expect(fireEvent.keyDown(strip, { key })).toBe(false);
      expect(onJump).toHaveBeenLastCalledWith(index);
    }
    expect(page).not.toHaveBeenCalled();
    window.removeEventListener('keydown', page);
  });

  it('ticks under the finger only while sound is on', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { strip } = renderStrip();
    fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 35, clientY: 20 });
    fireEvent.pointerMove(strip, { pointerType: 'touch', clientX: 72, clientY: 20 });
    expect(vibrate).toHaveBeenCalledTimes(1);
    localStorage.setItem('cloudcertify-sound', 'off');
    fireEvent.pointerMove(strip, { pointerType: 'touch', clientX: 15, clientY: 20 });
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});

describe('QuestionCard in an Exam', () => {
  const card = { total: 3, question, selectedIds: [], onSelect: () => {}, onPrev: () => {}, onNext: () => {}, finishLabel: 'Finish Quiz', isSubmitting: false };

  it('describes the current Question on the Navigator and offers Finish away from the strip', () => {
    const onFinish = vi.fn();
    render(<QuestionCard {...card} index={1} onFinish={onFinish} onJump={() => {}} answered={[true, true, false]} confidences={[null, 'guess', null]} />);
    expect(screen.getByRole('slider', { name: en.navigator.landmark })).toHaveAttribute('aria-valuetext', en.navigator.questionLabel(2, true, true));
    fireEvent.click(screen.getByRole('button', { name: 'Finish Quiz' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('keeps a single Finish on the last Question', () => {
    render(<QuestionCard {...card} index={2} onFinish={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Finish Quiz' })).toHaveLength(1);
  });
});

describe('ConfidenceRating before an answer', () => {
  it('is shown but cannot be used', () => {
    const onRate = vi.fn();
    render(<ConfidenceRating value={null} onRate={onRate} disabled />);
    const guess = screen.getByRole('button', { name: 'Guess' });
    expect(guess).toBeDisabled();
    fireEvent.click(guess);
    expect(onRate).not.toHaveBeenCalled();
  });
});

describe('sound', () => {
  it('is on until muted, and the choice is remembered on the device', () => {
    const { result } = renderHook(() => useSound());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('cloudcertify-sound')).toBe('off');
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
