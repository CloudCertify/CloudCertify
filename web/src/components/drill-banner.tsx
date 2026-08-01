import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/context';
import { useI18n } from '@/i18n/context';
import type { DrillCompositionDto } from '@/http/generated/api.schemas';

/**
 * The one slot that says why this drill looks the way it does, shown before the first Question.
 *
 * A logged-in User gets the make-up of their draw — `9 review · 4 new · 2 refresh` — which
 * doubles as a progress indicator, since the review count shrinks as they improve. An anonymous
 * visitor, whose drill is still random, gets the pitch for signing in instead: claiming
 * retro-attaches their past attempts (ADR 0003), so the promise holds on their first logged-in
 * drill (issue #53).
 *
 * Deliberately not per-Question: telling someone "you missed this before" ahead of an answer
 * turns recall into recognition and corrupts the Outcome being collected. After the drill is
 * graded that same fact is a reward instead of a prime, so `place='review'` says it again over
 * the review — from the composition the client already holds, with no change to grading.
 */
export function DrillBanner({
  composition,
  place = 'start'
}: {
  composition?: DrillCompositionDto | null;
  /** Where it speaks from: before the first Question, or over the graded review. */
  place?: 'start' | 'review';
}) {
  const { t } = useI18n();
  const { login } = useAuth();

  // The counts are optional on the wire; a missing count is a zero, not a gap.
  const missed = composition?.missed ?? 0;
  const unseen = composition?.unseen ?? 0;
  const mastered = composition?.mastered ?? 0;

  if (composition && place === 'review') {
    // Nothing was owed back, so there is no win to claim — say nothing rather than pad.
    if (missed === 0) return null;

    return (
      <div className='mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[5px] border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
        <Sparkles className='h-4 w-4 shrink-0' aria-hidden='true' />
        <span className='text-sm font-bold text-black'>
          {t.drill.reviewedMissed(missed)}
        </span>
      </div>
    );
  }

  if (composition) {
    return (
      <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[5px] border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
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
    <div className='mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[5px] border-2 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]'>
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
