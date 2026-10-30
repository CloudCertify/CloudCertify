import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './progress';

describe('Progress', () => {
  it.each([0, 42, 100])('exposes determinate progress at %s percent', value => {
    render(<Progress value={value} aria-label='Questions answered' />);
    const bar = screen.getByRole('progressbar', { name: 'Questions answered' });
    expect(bar).toHaveAttribute('aria-valuenow', String(value));
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('leaves unknown progress indeterminate', () => {
    render(<Progress aria-label='Loading questions' />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
});
