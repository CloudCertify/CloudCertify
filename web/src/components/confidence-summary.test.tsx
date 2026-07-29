import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceSummary } from './confidence-summary';
import { ConfidenceBadge } from './confidence-badge';
import type { QuizResultQuestionDto } from '@/http/generated/api.schemas';

const question = (
  id: number,
  confidence: QuizResultQuestionDto['confidence'] = null,
): QuizResultQuestionDto => ({
  id,
  text: `Q${id}`,
  type: 'multiple_choice',
  confidence,
  answers: [],
});

describe('ConfidenceSummary', () => {
  it('names lucky guesses and misconceptions when anything was rated', () => {
    render(
      <ConfidenceSummary
        luckyGuessCount={2}
        misconceptionCount={1}
        questions={[question(1, 'guess'), question(2)]}
      />,
    );

    expect(screen.getByText('Lucky guesses').parentElement).toHaveTextContent(
      '2 Lucky guesses',
    );
    expect(screen.getByText('Misconceptions').parentElement).toHaveTextContent(
      '1 Misconceptions',
    );
  });

  it('keeps a real zero on screen once something was rated', () => {
    render(
      <ConfidenceSummary
        luckyGuessCount={0}
        misconceptionCount={0}
        questions={[question(1, 'confident')]}
      />,
    );

    expect(screen.getByText('Misconceptions')).toBeInTheDocument();
  });

  it('renders nothing for an attempt where nothing was rated', () => {
    const { container } = render(
      <ConfidenceSummary
        luckyGuessCount={0}
        misconceptionCount={0}
        questions={[question(1), question(2)]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('ConfidenceBadge', () => {
  it('shows the rating the answer was committed with', () => {
    render(<ConfidenceBadge value='confident' />);

    expect(screen.getByText('You were: Confident')).toBeInTheDocument();
  });

  it('shows nothing for an unrated question', () => {
    const { container } = render(<ConfidenceBadge value={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
