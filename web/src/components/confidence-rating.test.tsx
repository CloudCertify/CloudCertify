import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfidenceRating } from './confidence-rating';
import { needsReview } from '@/lib/confidence';

describe('ConfidenceRating', () => {
  it('offers exactly the three ratings, with no unrated option', () => {
    render(<ConfidenceRating value={null} onRate={() => {}} />);

    const options = screen.getAllByRole('button');
    expect(options.map(o => o.textContent)).toEqual([
      'Guess',
      'Unsure',
      'Confident',
    ]);
    options.forEach(option =>
      expect(option).toHaveAttribute('aria-pressed', 'false'),
    );
  });

  it('reports the picked rating and marks it pressed', () => {
    const onRate = vi.fn();
    const { rerender } = render(
      <ConfidenceRating value={null} onRate={onRate} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(onRate).toHaveBeenCalledWith('guess');

    rerender(<ConfidenceRating value='guess' onRate={onRate} />);
    expect(screen.getByRole('button', { name: 'Guess' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is keyboard-operable: focusable and activated by Enter and Space', () => {
    const onRate = vi.fn();
    render(<ConfidenceRating value={null} onRate={onRate} />);

    const unsure = screen.getByRole('button', { name: 'Unsure' });
    unsure.focus();
    expect(unsure).toHaveFocus();

    // Native <button> activation: no custom key handling to clash with the
    // quiz's global keyboard model (digits select answers, arrows navigate).
    fireEvent.keyDown(unsure, { key: 'Enter' });
    fireEvent.click(unsure);
    expect(onRate).toHaveBeenCalledWith('unsure');
  });

  it('flags a low rating as one to revisit, in words and not only in colour', () => {
    const { rerender } = render(<ConfidenceRating value={null} onRate={() => {}} />);
    expect(screen.queryByText(/revisit/i)).not.toBeInTheDocument();

    rerender(<ConfidenceRating value='guess' onRate={() => {}} />);
    expect(screen.getByText(/revisit/i)).toBeInTheDocument();

    rerender(<ConfidenceRating value='unsure' onRate={() => {}} />);
    expect(screen.getByText(/revisit/i)).toBeInTheDocument();

    rerender(<ConfidenceRating value='confident' onRate={() => {}} />);
    expect(screen.queryByText(/revisit/i)).not.toBeInTheDocument();
  });

  it('treats Guess and Unsure — and nothing else — as needing review', () => {
    expect(needsReview('guess')).toBe(true);
    expect(needsReview('unsure')).toBe(true);
    expect(needsReview('confident')).toBe(false);
    expect(needsReview(null)).toBe(false);
    expect(needsReview(undefined)).toBe(false);
  });

  it('allows re-rating — the latest pick wins', () => {
    const onRate = vi.fn();
    const { rerender } = render(
      <ConfidenceRating value='guess' onRate={onRate} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confident' }));
    expect(onRate).toHaveBeenLastCalledWith('confident');

    rerender(<ConfidenceRating value='confident' onRate={onRate} />);
    expect(screen.getByRole('button', { name: 'Guess' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Confident' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
