import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '@/i18n/i18n-context';
import { en } from '@/i18n/messages/en';
import { pt } from '@/i18n/messages/pt';
import { ConfirmFinishDialog } from './confirm-finish-dialog';

describe('ConfirmFinishDialog', () => {
  it.each([en, pt])('names the dialog and describes unanswered consequences', t => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <I18nContext.Provider value={{ language: t === en ? 'en-US' : 'pt-BR', t, setLanguage: vi.fn() }}>
        <ConfirmFinishDialog open unansweredCount={2} onConfirm={onConfirm} onCancel={onCancel} />
      </I18nContext.Provider>
    );
    const dialog = screen.getByRole('dialog', { name: t.confirmFinish.titleWithUnanswered });
    expect(dialog).toHaveAccessibleDescription(t.confirmFinish.bodyWithUnanswered(2));
    fireEvent.click(screen.getByRole('button', { name: t.confirmFinish.keepAnswering }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes when the parent clears open and uses the all-answered copy', () => {
    const props = { unansweredCount: 0, onConfirm: vi.fn(), onCancel: vi.fn() };
    const { rerender } = render(<ConfirmFinishDialog open {...props} />);
    expect(screen.getByRole('dialog', { name: en.confirmFinish.title })).toHaveAccessibleDescription(en.confirmFinish.bodyAllAnswered);
    rerender(<ConfirmFinishDialog open={false} {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
