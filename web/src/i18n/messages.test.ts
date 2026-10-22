import { describe, expect, it } from 'vitest';
import { en } from './messages/en';
import { pt } from './messages/pt';

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
  }
  if (typeof value === 'string') expect(value.trim()).not.toBe('');
  return typeof value;
}

describe('message dictionaries', () => {
  it('keeps keys, leaf types and translated list lengths in parity', () => {
    expect(shape(pt)).toEqual(shape(en));
  });

  it('formats decimal standing and movement using each language', () => {
    expect(en.progress.standingLabel('Security', 72.5)).toContain('72.5%');
    expect(pt.progress.standingLabel('Segurança', 72.5)).toContain('72,5%');
    expect(en.progress.delta(1.5)).toBe('+1.5 pts');
    expect(pt.progress.delta(1.5)).toBe('+1,5 pts');
    expect(pt.progress.trendLabel(62.5, 72.5, 2)).toContain('62,5% para 72,5%');
  });

  it.each([en, pt])('uses singular question counts and distinct answer names', t => {
    expect(t.common.questions(1)).not.toEqual(t.common.questions(2).replace('2', '1'));
    expect(t.report.suggest.correctLabel(0)).not.toBe(t.report.suggest.correctLabel(1));
    expect(t.demoQuiz).toHaveLength(3);
    expect(t.demoQuiz.every(question => question.options.length === 4)).toBe(true);
  });
});
