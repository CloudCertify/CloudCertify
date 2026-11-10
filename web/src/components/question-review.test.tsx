import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionReview } from './question-review';
import type { QuizResultQuestionDto } from '@/http/generated/api.schemas';

// The visitor picked answer 1, which today's key marks correct. Only the stamped
// verdict says whether the Score counted it (ADR 0007).
const reviewed = (id: number, isCorrect: boolean): QuizResultQuestionDto => ({
  id,
  text: `Q${id}`,
  type: 'multiple_choice',
  isCorrect,
  answers: [
    { id: 1, text: 'Picked', isCorrect: true, wasSelected: true },
    { id: 2, text: 'Other', isCorrect: false, wasSelected: false }
  ]
});

describe('QuestionReview', () => {
  it('marks each Question by its stamped verdict, not the per-Answer key', () => {
    render(<QuestionReview questions={[reviewed(1, false)]} />);

    expect(
      screen.getByText('Incorrect. Click to view details')
    ).toBeInTheDocument();
  });

  it('marks a stamped-right Question correct even when the key now disagrees', () => {
    const question = reviewed(1, true);
    question.answers = question.answers.map(a => ({ ...a, isCorrect: !a.isCorrect }));

    render(<QuestionReview questions={[question]} />);

    expect(screen.getByText('Correct. Click to view details')).toBeInTheDocument();
  });
});
