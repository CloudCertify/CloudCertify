import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.getByRole('button', { name: /Question 1:\s*Q1\s*Incorrect/ })).toBeInTheDocument();
  });

  it('marks a stamped-right Question correct even when the key now disagrees', () => {
    const question = reviewed(1, true);
    question.answers = question.answers.map(a => ({ ...a, isCorrect: !a.isCorrect }));

    render(<QuestionReview questions={[question]} />);

    expect(screen.getByRole('button', { name: /Question 1:\s*Q1\s*Correct/ })).toBeInTheDocument();
  });

  it('narrows to the misses, keeping each Question its own number', () => {
    render(<QuestionReview questions={[reviewed(1, true), reviewed(2, false), reviewed(3, true)]} />);

    fireEvent.click(screen.getByRole('button', { name: /Wrong\s*1/ }));

    expect(screen.queryByRole('button', { name: /Question 1:/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Question 2:\s*Q2\s*Incorrect/ })).toBeInTheDocument();
  });

  it('opens the Question it is pointed at, with the pick and the right answer', () => {
    const questions = [reviewed(1, true), { ...reviewed(2, false), explanation: 'Because.' }];
    const { rerender } = render(<QuestionReview questions={questions} />);
    expect(screen.queryByText('Because.')).not.toBeInTheDocument();

    rerender(<QuestionReview questions={questions} target={{ index: 1 }} />);

    expect(screen.getByText('Because.')).toBeInTheDocument();
    expect(screen.getByText('(Your answer)')).toBeInTheDocument();
  });
});
