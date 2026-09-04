import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/use-auth';
import { useI18n } from '@/i18n/use-i18n';
import { DrawRule, type DrillCompositionDto } from '@/http/generated/api.schemas';

/**
 * The one slot that says why this drill looks the way it does, shown before the first Question.
 *
 * Branch on the Draw Rule, not on a missing composition. A Domain Drill with a composition
 * shows the make-up of the draw. A Mistakes drill has no composition on purpose (one bucket),
 * so it shows how many mistakes were served. An anonymous visitor on anything else still
 * gets the sign-in pitch: claiming retro-attaches their past attempts (ADR 0003).
 *
 * Deliberately not per-Question: telling someone "you missed this before" ahead of an answer
 * turns recall into recognition and corrupts the Outcome being collected. After the drill is
 * graded that same fact is a close, not a prime, so `place='review'` speaks again.
 */
export function DrillBanner({
  composition,
  drawRule,
  questionCount = 0,
  place = 'start'
}: {
  composition?: DrillCompositionDto | null;
  drawRule?: DrawRule;
  /** Questions the client was handed — the Mistakes count, with no extra field. */
  questionCount?: number;
  /** Where it speaks from: before the first Question, or over the graded review. */
  place?: 'start' | 'review';
}) {
  const { t } = useI18n();
  const { login } = useAuth();

  // The counts are optional on the wire; a missing count is a zero, not a gap.
  const missed = composition?.missed ?? 0;
  const unseen = composition?.unseen ?? 0;
  const mastered = composition?.mastered ?? 0;

  if (drawRule === DrawRule.mistakes) {
    const isReview = place === 'review';
    return (
      <div
        className={`${isReview ? 'mb-6' : 'mb-4'} flex flex-wrap items-center gap-x-3 gap-y-1 rounded-none border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]`}
      >
        <Sparkles className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='text-sm font-bold text-black'>
          {isReview
            ? t.drill.mistakesReviewed(questionCount)
            : t.drill.mistakesCount(questionCount)}
        </span>
      </div>
    );
  }

  if (composition && place === 'review') {
    // Nothing was owed back, so there is no win to claim — say nothing rather than pad.
    if (missed === 0) return null;

    return (
      <div className='mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-none border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
        <Sparkles className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='text-sm font-bold text-black'>
          {t.drill.reviewedMissed(missed)}
        </span>
      </div>
    );
  }

  if (composition) {
    return (
      <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-none border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
        <Sparkles className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='text-sm font-black uppercase tracking-wide text-black'>
          {t.drill.label}
        </span>
        <span className='text-sm font-bold text-black/70'>
          {t.drill.composition(missed, unseen, mastered)}
        </span>
      </div>
    );
  }

  return (
    <div className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded-none border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
      <span className='text-sm font-bold text-black'>
        {t.drill.signInPitch}
      </span>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={() => login('google')}>
          {t.auth.continueWith('Google')}
        </Button>
        <Button variant='outline' size='sm' onClick={() => login('github')}>
          {t.auth.continueWith('GitHub')}
        </Button>
      </div>
    </div>
  );
}
