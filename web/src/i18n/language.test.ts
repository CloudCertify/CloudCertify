import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectLanguage,
  getCurrentLanguage,
  normalizeLanguage,
  setCurrentLanguage,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY
} from './language';

beforeEach(() => {
  localStorage.clear();
  document.cookie = `${LANGUAGE_COOKIE_NAME}=; Path=/; Max-Age=0`;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  it('prefers the cookie over the legacy stored choice', () => {
    document.cookie = `${LANGUAGE_COOKIE_NAME}=pt-BR; Path=/`;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-US');
    expect(detectLanguage()).toBe('pt-BR');
  });

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
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE_NAME}=pt-BR`);
  });

  it('writes a one-year cookie for all paths with SameSite=Lax', () => {
    const cookie = vi.spyOn(document, 'cookie', 'set');
    setCurrentLanguage('pt-BR');
    expect(cookie).toHaveBeenCalledWith(
      `${LANGUAGE_COOKIE_NAME}=pt-BR; Path=/; SameSite=Lax; Max-Age=31536000`
    );
  });

  it('keeps working when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    setCurrentLanguage('pt-BR');
    expect(getCurrentLanguage()).toBe('pt-BR');
  });

  it('returns the default on the server without reading storage or changing browser state', () => {
    setCurrentLanguage('pt-BR');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    vi.stubGlobal('window', undefined);
    expect(getCurrentLanguage()).toBe('en-US');
    expect(detectLanguage()).toBe('en-US');
    setCurrentLanguage('en-US');
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    expect(getCurrentLanguage()).toBe('pt-BR');
  });
});
