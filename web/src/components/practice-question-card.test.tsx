import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderCard(phase: 'answering' | 'revealed') {
  return render(
    <PracticeQuestionCard
      index={0}
      total={2}
      question={question}
      selectedIds={[10]}
      onSelect={() => {}}
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
      isChecking={false}
      isFinishing={false}
      isLast={false}
      reportControl={<button type='button'>Report a problem</button>}
    />
  );
}

describe('PracticeQuestionCard report control', () => {
  it('is not reachable before the question has been Checked', () => {
    renderCard('answering');
    expect(
      screen.queryByRole('button', { name: 'Report a problem' })
    ).not.toBeInTheDocument();
  });

  it('is shown in the post-Check feedback state', () => {
    renderCard('revealed');
    expect(
      screen.getByRole('button', { name: 'Report a problem' })
    ).toBeInTheDocument();
  });
});
