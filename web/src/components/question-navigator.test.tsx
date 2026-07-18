import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionNavigator } from './question-navigator';

describe('QuestionNavigator', () => {
  it('starts collapsed and expands on request', () => {
    render(
      <QuestionNavigator
        currentIndex={0}
        answered={[false, false, false]}
        onJump={() => {}}
      />
    );

    expect(screen.queryByRole('navigation', { name: /question navigator/i }))
      .not.toBeInTheDocument();

    const openButton = screen.getByRole('button', {
      name: /open question navigator/i
    });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Questions' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /question navigator/i }))
      .toBeInTheDocument();
    ['1', '2', '3'].forEach(label =>
      expect(screen.getByRole('button', { name: new RegExp(`Question ${label},`) }))
        .toBeInTheDocument()
    );

    const closeButton = screen.getByRole('button', {
      name: /^close question navigator$/i
    });
    expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(closeButton);
    expect(screen.queryByRole('navigation', { name: /question navigator/i }))
      .not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('jumps to the clicked question and collapses again', () => {
    const onJump = vi.fn();
    render(
      <QuestionNavigator
        currentIndex={0}
        answered={[false, false, false]}
        onJump={onJump}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /open question navigator/i }));
    fireEvent.click(screen.getByRole('button', { name: /Question 3,/ }));

    expect(onJump).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('navigation', { name: /question navigator/i }))
      .not.toBeInTheDocument();
  });

  it('marks the current question and the answered state', () => {
    render(
      <QuestionNavigator
        currentIndex={1}
        answered={[true, false, false]}
        onJump={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /open question navigator/i }));
    expect(screen.getByRole('button', { name: 'Question 1, answered' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Question 2, unanswered' }))
      .toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Question 1, answered' }))
      .not.toHaveAttribute('aria-current');
  });
});
