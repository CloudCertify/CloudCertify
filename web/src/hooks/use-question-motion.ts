import { useEffect, useLayoutEffect, useRef } from 'react';

/** Keep the controls still; only the question content changes between questions. */
export function useQuestionMotion(index: number, questionId: number | undefined, reducedMotion = false) {
  const ref = useRef<HTMLDivElement>(null);
  const previousQuestion = useRef<{ index: number; id: number | undefined } | null>(null);
  const animations = useRef<Animation[]>([]);

  useEffect(() => {
    const onKeyDown = () => {
      if (ref.current) ref.current.dataset.quizInput = 'keyboard';
      animations.current.forEach(animation => animation.cancel());
    };
    const onPointerDown = () => {
      if (ref.current) ref.current.dataset.quizInput = 'pointer';
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => animations.current.forEach(animation => animation.cancel());
    media?.addEventListener('change', onPreferenceChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      media?.removeEventListener('change', onPreferenceChange);
    };
  }, []);

  useLayoutEffect(() => {
    const previous = previousQuestion.current;
    previousQuestion.current = { index, id: questionId };
    const card = ref.current;
    if (!card || !previous || (previous.index === index && previous.id === questionId)) return;

    const title = card.querySelector<HTMLElement>('[data-quiz-title]');
    const keyboard = card.dataset.quizInput === 'keyboard';
    const immediate = reducedMotion || keyboard || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Announce the new question even when the persistent Next button had focus.
    if (keyboard && (document.activeElement === document.body || card.contains(document.activeElement))) {
      title?.focus({ preventScroll: true });
    }
    // On a phone, Continue can be a full screen below the next question.
    const bounds = title?.getBoundingClientRect();
    if (bounds && (bounds.top < 16 || bounds.bottom > window.innerHeight - 16)) {
      card.scrollIntoView?.({ block: 'start', behavior: immediate ? 'instant' : 'smooth' });
    }
    if (immediate) return;

    const direction = index < previous.index ? -1 : 1;
    animations.current = [...card.querySelectorAll<HTMLElement>('[data-quiz-content]')]
      .filter(element => typeof element.animate === 'function')
      .map(element => element.animate(
        [{ opacity: .6, transform: `translateX(${direction * 6}px)` }, { opacity: 1, transform: 'translateX(0)' }],
        { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      ));
    return () => animations.current.forEach(animation => animation.cancel());
  }, [index, questionId, reducedMotion]);

  return ref;
}
