import { useCallback, useEffect, useRef, useState } from 'react';

type UseQuizKeyboardOptions = {
  /** Number of answer options for the current question. */
  count: number;
  /**
   * Whether selection keys (digits, arrows, Space) are live. Enter stays
   * active regardless so the primary action works while a Subquiz question
   * is revealed.
   */
  selectionEnabled: boolean;
  /** Select/toggle the option at this index — same semantics as clicking it. */
  onActivate: (index: number) => void;
  /** Enter — the card's primary action (Next/Finish or Check/Continue). */
  onPrimary: () => void;
  /** Focus highlight resets when this changes (pass the question id). */
  resetKey: unknown;
};

/**
 * Keyboard model for quiz answer options (Linear-style):
 * - digits 1-9 select/toggle the matching option and move focus to it;
 * - ArrowUp/Down moves focus only (wrapping); Space selects/toggles the
 *   focused option — arrows never change the selection;
 * - Enter fires the primary action, except when a button/link/dialog has
 *   focus (native activation wins) or focus is in an editable field.
 *
 * Listeners are window-global so keys work regardless of what is focused.
 */
export function useQuizKeyboard({
  count,
  selectionEnabled,
  onActivate,
  onPrimary,
  resetKey
}: UseQuizKeyboardOptions) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const optionRefs = useRef<(HTMLElement | null)[]>([]);

  // Latest-value refs so the window listener never binds stale closures.
  const stateRef = useRef({ count, selectionEnabled, focusIndex, onActivate, onPrimary });
  stateRef.current = { count, selectionEnabled, focusIndex, onActivate, onPrimary };

  useEffect(() => {
    setFocusIndex(-1);
  }, [resetKey]);

  const focusOption = useCallback((index: number) => {
    setFocusIndex(index);
    optionRefs.current[index]?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const s = stateRef.current;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], dialog')) {
        return;
      }

      if (event.key === 'Enter') {
        // A focused button/link activates natively — don't double-fire.
        if (event.repeat || target?.closest('button, a')) return;
        event.preventDefault();
        s.onPrimary();
        return;
      }

      if (!s.selectionEnabled || s.count === 0) return;

      if (event.key >= '1' && event.key <= '9') {
        if (event.repeat) return;
        const index = Number(event.key) - 1;
        if (index >= s.count) return;
        event.preventDefault();
        s.onActivate(index);
        focusOption(index);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const dir = event.key === 'ArrowDown' ? 1 : -1;
        const next =
          s.focusIndex < 0
            ? dir > 0
              ? 0
              : s.count - 1
            : (s.focusIndex + dir + s.count) % s.count;
        focusOption(next);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusOption]);

  /** Roving-tabindex props for the option at `index`; spread onto its element. */
  const getOptionProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        optionRefs.current[index] = el;
      },
      tabIndex: index === Math.max(focusIndex, 0) ? 0 : -1,
      onFocus: () => setFocusIndex(index),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === ' ') {
          event.preventDefault();
          if (stateRef.current.selectionEnabled) onActivate(index);
        }
      }
    }),
    [focusIndex, onActivate]
  );

  return { focusIndex, getOptionProps };
}
