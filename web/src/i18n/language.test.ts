import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectLanguage,
  getCurrentLanguage,
  normalizeLanguage,
  setCurrentLanguage,
  LANGUAGE_STORAGE_KEY
} from './language';

beforeEach(() => {
  localStorage.clear();
});

describe('normalizeLanguage', () => {
  it('maps any Portuguese tag to pt-BR and any English tag to en-US', () => {
    expect(normalizeLanguage('pt')).toBe('pt-BR');
    expect(normalizeLanguage('pt-PT')).toBe('pt-BR');
    expect(normalizeLanguage('EN-GB')).toBe('en-US');
  });

  it('returns null for unsupported or missing tags', () => {
    expect(normalizeLanguage('fr-FR')).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
  });
});

describe('detectLanguage', () => {
  it('prefers the stored choice over the browser preference', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pt-BR']);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-US');
    expect(detectLanguage()).toBe('en-US');
  });

  it('falls back to the first supported browser preference', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'pt-BR']);
    expect(detectLanguage()).toBe('pt-BR');
  });

  it('defaults to en-US when nothing matches', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    expect(detectLanguage()).toBe('en-US');
  });
});

describe('setCurrentLanguage', () => {
  it('persists the choice and drives the language of later requests', () => {
    setCurrentLanguage('pt-BR');
    expect(getCurrentLanguage()).toBe('pt-BR');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR');
  });
});
