import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionNavigator } from './question-navigator';

describe('QuestionNavigator', () => {
  it('renders one numbered button per question', () => {
    render(
      <QuestionNavigator total={3} currentIndex={0} answered={[]} onJump={() => {}} />
    );
    ['1', '2', '3'].forEach(label =>
      expect(screen.getByRole('button', { name: new RegExp(`Question ${label},`) }))
        .toBeInTheDocument()
    );
  });

  it('jumps to the clicked question', () => {
    const onJump = vi.fn();
    render(
      <QuestionNavigator total={3} currentIndex={0} answered={[]} onJump={onJump} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Question 3,/ }));
    expect(onJump).toHaveBeenCalledWith(2);
  });

  it('marks the current question and the answered state', () => {
    render(
      <QuestionNavigator
        total={3}
        currentIndex={1}
        answered={[true, false, false]}
        onJump={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Question 1, answered' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 2, unanswered' }))
      .toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Question 1, answered' }))
      .not.toHaveAttribute('aria-current');
  });
});
