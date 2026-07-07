import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { QuestionCard } from './question-card';
import type { QuestionDto } from '@/http/generated/api.schemas';

const singleQuestion: QuestionDto = {
  id: 1,
  text: 'Pick one',
  type: 'multiple_choice',
  selectCount: 1,
  answers: [
    { id: 10, text: 'Alpha' },
    { id: 20, text: 'Beta' },
    { id: 30, text: 'Gamma' }
  ]
} as QuestionDto;

const multiQuestion: QuestionDto = {
  ...singleQuestion,
  type: 'multiple_response',
  selectCount: 2
} as QuestionDto;

type HarnessProps = {
  question: QuestionDto;
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  isLast?: boolean;
};

/** Renders the card with the same selection reducer the session pages use. */
function Harness({
  question,
  onPrev = () => {},
  onNext = () => {},
  onFinish = () => {},
  isLast
}: HarnessProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectCount = question.selectCount ?? 1;

  const handleSelect = (answerId: number) => {
    setSelectedIds(current => {
      if (question.type === 'multiple_response') {
        if (current.includes(answerId)) return current.filter(id => id !== answerId);
        if (current.length >= selectCount) return current;
        return [...current, answerId];
      }
      return [answerId];
    });
  };

  return (
    <QuestionCard
      index={isLast ? 1 : 0}
      total={2}
      question={question}
      selectedIds={selectedIds}
      onSelect={handleSelect}
      onPrev={onPrev}
      onNext={onNext}
      onFinish={onFinish}
      finishLabel='Finish Quiz'
      isSubmitting={false}
    />
  );
}

const option = (name: string) => screen.getByRole('radio', { name });
const checkbox = (name: string) => screen.getByRole('checkbox', { name });

describe('QuestionCard keyboard support', () => {
  it('number keys select in single-select, replacing the previous pick', () => {
    render(<Harness question={singleQuestion} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(option('Alpha')).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(window, { key: '3' });
    expect(option('Alpha')).toHaveAttribute('aria-checked', 'false');
    expect(option('Gamma')).toHaveAttribute('aria-checked', 'true');
  });

  it('ignores number keys beyond the option count', () => {
    render(<Harness question={singleQuestion} />);
    fireEvent.keyDown(window, { key: '9' });
    ['Alpha', 'Beta', 'Gamma'].forEach(name =>
      expect(option(name)).toHaveAttribute('aria-checked', 'false')
    );
  });

  it('multi-select: numbers toggle, extra picks at cap are ignored', () => {
    render(<Harness question={multiQuestion} />);
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    expect(checkbox('Alpha')).toHaveAttribute('aria-checked', 'true');
    expect(checkbox('Beta')).toHaveAttribute('aria-checked', 'true');

    // At cap: pressing 3 does nothing.
    fireEvent.keyDown(window, { key: '3' });
    expect(checkbox('Gamma')).toHaveAttribute('aria-checked', 'false');

    // Deselect 1, then 3 goes in.
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '3' });
    expect(checkbox('Alpha')).toHaveAttribute('aria-checked', 'false');
    expect(checkbox('Beta')).toHaveAttribute('aria-checked', 'true');
    expect(checkbox('Gamma')).toHaveAttribute('aria-checked', 'true');
  });

  it('single-select: arrows move focus only, wrapping; Space selects', () => {
    render(<Harness question={singleQuestion} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(option('Alpha')).toHaveFocus();
    expect(option('Alpha')).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(option('Beta')).toHaveFocus();
    expect(option('Beta')).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(option('Beta'), { key: ' ' });
    expect(option('Beta')).toHaveAttribute('aria-checked', 'true');
  });

  it('multi-select: arrows only move focus; Space toggles the focused option', () => {
    render(<Harness question={multiQuestion} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(checkbox('Beta')).toHaveFocus();
    expect(checkbox('Beta')).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(checkbox('Beta'), { key: ' ' });
    expect(checkbox('Beta')).toHaveAttribute('aria-checked', 'true');
  });

  it('Enter advances to the next question, and finishes on the last one', () => {
    const onNext = vi.fn();
    const onFinish = vi.fn();
    const { unmount } = render(<Harness question={singleQuestion} onNext={onNext} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledOnce();
    unmount();

    render(<Harness question={singleQuestion} onFinish={onFinish} isLast />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('ArrowRight goes to the next question; ArrowLeft is inert on the first', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<Harness question={singleQuestion} onPrev={onPrev} onNext={onNext} />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onNext).toHaveBeenCalledOnce();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onPrev).not.toHaveBeenCalled();
  });

  it('ArrowLeft goes back on a later question; ArrowRight is inert on the last', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<Harness question={singleQuestion} onPrev={onPrev} onNext={onNext} isLast />);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onPrev).toHaveBeenCalledOnce();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onNext).not.toHaveBeenCalled();
  });

  it('Enter on a focused button lets native activation win (no double fire)', () => {
    const onNext = vi.fn();
    render(<Harness question={singleQuestion} onNext={onNext} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    nextButton.focus();
    fireEvent.keyDown(nextButton, { key: 'Enter' });
    expect(onNext).not.toHaveBeenCalled();
  });
});
