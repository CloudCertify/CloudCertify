import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PracticeQuestionCard } from './practice-question-card';
import type { QuestionDto } from '@/http/generated/api.schemas';

const question: QuestionDto = {
  id: 1,
  text: 'Pick one',
  type: 'multiple_choice',
  selectCount: 1,
  answers: [
    { id: 10, text: 'Alpha' },
    { id: 20, text: 'Beta' }
  ]
} as QuestionDto;

function renderCard(phase: 'answering' | 'revealed', { isChecking = false, onSelect = () => {} }: { isChecking?: boolean; onSelect?: (id: number) => void } = {}) {
  return render(
    <PracticeQuestionCard
      index={0}
      total={2}
      question={question}
      selectedIds={[10]}
      onSelect={onSelect}
      phase={phase}
      reveal={
        phase === 'revealed'
          ? {
              isCorrect: true,
              correctAnswerIds: [10],
              selectedAnswerIds: [10],
              explanation: 'Because.'
            }
          : null
      }
      onCheck={() => {}}
      onContinue={() => {}}
      isChecking={isChecking}
      isFinishing={false}
      isLast={false}
      reportControl={<button type='button'>Report a problem</button>}
    />
  );
}

describe('PracticeQuestionCard report control', () => {
  it('locks mouse and keyboard selection while the answer is being checked', () => {
    const onSelect = vi.fn();
    renderCard('answering', { isChecking: true, onSelect });
    const beta = screen.getByRole('radio', { name: 'Beta' });
    expect(beta).toHaveAttribute('aria-disabled', 'true');
    beta.focus();
    fireEvent.click(beta);
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(beta, { key: ' ' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /checking/i })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /checking/i })).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps keyboard focus on Check while it is busy and through the reveal', () => {
    const onCheck = vi.fn();
    const props = {
      index: 0, total: 2, question, selectedIds: [10], onSelect: () => {}, onCheck,
      onContinue: () => {}, isFinishing: false, isLast: false
    };
    const { rerender } = render(<PracticeQuestionCard {...props} phase='answering' reveal={null} isChecking={false} />);
    const button = screen.getByRole('button', { name: 'Check' });
    button.focus();
    rerender(<PracticeQuestionCard {...props} phase='answering' reveal={null} isChecking />);
    // A disabled button would lose focus; a busy one must stay focusable but inert.
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onCheck).not.toHaveBeenCalled();
    rerender(<PracticeQuestionCard {...props} phase='revealed' reveal={{ isCorrect: true, correctAnswerIds: [10], selectedAnswerIds: [10] }} isChecking={false} />);
    expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus();
  });

  it('is not reachable before the question has been Checked', () => {
    renderCard('answering');
    expect(
      screen.queryByRole('button', { name: 'Report a problem' })
    ).not.toBeInTheDocument();
  });

  it('is shown in the post-Check feedback state', () => {
    renderCard('revealed');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('button', { name: 'Report a problem' })
    ).toBeInTheDocument();
  });
});
