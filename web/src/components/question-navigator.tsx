import { useEffect, useRef, useState } from 'react';
import { ListOrdered, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QuestionNavigatorProps = {
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
 * Usage: <QuestionNavigator currentIndex={i} answered={flags} onJump={setIndex} />
 */
export function QuestionNavigator({
  currentIndex,
  answered,
  onJump
}: QuestionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const answeredCount = answered.filter(Boolean).length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const jumpToQuestion = (index: number) => {
    onJump(index);
    setIsOpen(false);
  };

  return (
    <aside className='absolute left-0 top-0 z-40 shrink-0 lg:sticky lg:top-24 lg:w-10 lg:self-start'>
      <Button
        ref={triggerRef}
        type='button'
        variant='outline'
        size='icon'
        aria-label='Open question navigator'
        aria-controls='question-navigator-panel'
        aria-expanded={isOpen}
        title={`Open question navigator — question ${currentIndex + 1} of ${answered.length}`}
        onClick={() => setIsOpen(true)}
      >
        <ListOrdered />
      </Button>

      <dialog
        id='question-navigator-panel'
        ref={dialogRef}
        aria-labelledby='question-navigator-title'
        onClose={() => {
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
        className='fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-dvh w-[calc(100vw-2rem)] max-w-72 overflow-visible bg-transparent p-0 backdrop:bg-black/40'
      >
        <Card
          className='h-full gap-0 overflow-y-auto rounded-none border-y-0 border-l-0 border-r-4 py-0 shadow-[8px_0_0_0_#000]'
        >
          <CardContent className='p-4'>
            <div className='mb-4 flex items-start justify-between gap-3 border-b-2 border-black pb-4'>
              <div>
                <h2 id='question-navigator-title' className='font-black text-black'>
                  Questions
                </h2>
                <p className='text-sm font-bold text-black/60'>
                  {answeredCount} of {answered.length} answered
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                size='icon'
                aria-label='Close question navigator'
                aria-controls='question-navigator-panel'
                aria-expanded={isOpen}
                onClick={() => setIsOpen(false)}
              >
                <X />
              </Button>
            </div>

            <nav aria-label='Question navigator'>
              <div className='grid grid-cols-5 gap-2'>
                {answered.map((isAnswered, index) => {
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      key={index}
                      type='button'
                      onClick={() => jumpToQuestion(index)}
                      aria-current={isCurrent ? 'true' : undefined}
                      aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                      className={cn(
                        'h-9 w-9 rounded-[5px] border-2 border-black text-sm font-bold transition-all',
                        isCurrent
                          ? 'translate-x-[1px] translate-y-[1px] bg-black text-white shadow-none'
                          : 'shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none',
                        !isCurrent &&
                          (isAnswered
                            ? 'bg-primary text-white'
                            : 'bg-white text-black hover:bg-background')
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </nav>
          </CardContent>
        </Card>
      </dialog>
    </aside>
  );
}
