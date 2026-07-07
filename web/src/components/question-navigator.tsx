import { Card, CardContent } from '@/components/ui/card';

type QuestionNavigatorProps = {
  total: number;
  /** Zero-based index of the question currently on screen. */
  currentIndex: number;
  /** answered[i] is true when question i has at least one selected answer. */
  answered: boolean[];
  onJump: (index: number) => void;
};

/**
 * Navigator (CONTEXT.md): numbered jump control for a full Quiz attempt.
 * Marks every served question as answered, unanswered, or current, and jumps
 * directly to any of them. Never rendered for a Subquiz — those are
 * forward-only (ADR 0002).
 *
 * Usage: <QuestionNavigator total={65} currentIndex={i} answered={flags} onJump={setIndex} />
 */
export function QuestionNavigator({
  total,
  currentIndex,
  answered,
  onJump
}: QuestionNavigatorProps) {
  return (
    <Card className='w-full border-4 border-black shadow-[8px_8px_0px_0px_#000]'>
      <CardContent className='py-4'>
        <nav aria-label='Question navigator'>
          <div className='flex flex-wrap gap-2'>
            {Array.from({ length: total }, (_, index) => {
              const isCurrent = index === currentIndex;
              const isAnswered = answered[index] ?? false;
              return (
                <button
                  key={index}
                  type='button'
                  onClick={() => onJump(index)}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                  className={`h-9 w-9 rounded-[5px] border-2 border-black text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-black text-white shadow-none translate-x-[1px] translate-y-[1px]'
                      : isAnswered
                        ? 'bg-primary text-white shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                        : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-background hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </nav>
      </CardContent>
    </Card>
  );
}
