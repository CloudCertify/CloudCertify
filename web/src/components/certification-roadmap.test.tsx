import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '@/i18n/i18n-context';
import { en } from '@/i18n/messages/en';
import { pt } from '@/i18n/messages/pt';
import { CertificationRoadmap } from './certification-roadmap';

describe('CertificationRoadmap provider filter', () => {
  it.each([en, pt])('announces the selected provider and changes its content', t => {
    render(
      <I18nContext.Provider value={{ language: t === en ? 'en-US' : 'pt-BR', t, setLanguage: vi.fn() }}>
        <CertificationRoadmap quizzes={[
          { id: 1, quizProvider: 'aws', quizLevel: 'foundational', title: 'Cloud Practitioner', isAvailable: true }
        ]} />
      </I18nContext.Provider>
    );
    expect(screen.getByRole('group', { name: t.common.cloudProvider })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AWS' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: t.levels.foundational })).toHaveProperty('tagName', 'H3');
    expect(screen.getByRole('heading', { name: 'Cloud Practitioner' })).toHaveProperty('tagName', 'H4');
    const azure = screen.getByRole('button', { name: /Azure/ });
    fireEvent.click(azure);
    expect(azure).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'AWS' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('link', { name: /Cloud Practitioner/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(t.roadmap.providerSoon)).toHaveLength(4);
  });
});
