// PROTOTYPE (throwaway). Variant C, "Skyline" carried into an Exam.
//
// An Exam defers correctness to Submit, so the columns cannot say right or wrong while
// it runs. They say the two things the visitor does know: which Questions are answered,
// and how sure they were (Confidence sets the height; Guess and Unsure turn amber, the
// same "come back to this" the Navigator marks today). The strip is the Navigator: drag
// across it to jump. At Submit the columns keep their heights and take their verdict
// colour, so a tall red column is a misconception and a short green one a lucky guess.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useQuizKeyboard } from '@/hooks/use-quiz-keyboard';
import { nextSelection } from '@/attempt/selection';
import { cn } from '@/lib/utils';
import type { Confidence } from '@/http/generated/api.schemas';
import { cue } from './feedback';
import { SAMPLES, type Sample } from './samples';
import { archivo, focusRing, press, SoundToggle } from './skyline';

type Rating = NonNullable<Confidence>;
type Tone = 'empty' | 'blue' | 'amber' | 'green' | 'red';
type Cell = { height: number; tone: Tone; dim?: boolean };

const TOTAL = 65;
const PASSING = 700;
const RATINGS: { value: Rating; label: string }[] = [
  { value: 'guess', label: 'Guess' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'confident', label: 'Confident' }
];
const HEIGHT: Record<Rating | 'unrated', number> = { unrated: 25, guess: 45, unsure: 70, confident: 100 };
const TONE: Record<Tone, string> = { empty: 'bg-black/20', blue: 'bg-primary', amber: 'bg-secondary', green: 'bg-success', red: 'bg-destructive' };

// 65 Questions, cycling the 15 samples with fresh ids, to judge the strip at real density.
const QUESTIONS: Sample[] = Array.from({ length: TOTAL }, (_, i) => {
  const source = SAMPLES[i % SAMPLES.length];
  const shift = (i + 1) * 10 - source.question.id! * 10;
  return {
    ...source,
    question: { ...source.question, id: i + 1, answers: source.question.answers!.map(answer => ({ ...answer, id: answer.id! + shift })) },
    correct: source.correct.map(id => id + shift)
  };
});

function useExamSim() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [finished, setFinished] = useState(false);

  const isRight = (i: number) => {
    const picked = answers[i] ?? [];
    return picked.length === QUESTIONS[i].correct.length && picked.every(id => QUESTIONS[i].correct.includes(id));
  };

  return {
    index, direction, answers, ratings, finished, isRight,
    answeredCount: Object.values(answers).filter(picked => picked.length > 0).length,
    go(next: number) {
      const target = Math.max(0, Math.min(TOTAL - 1, next));
      if (target === index) return;
      setDirection(target > index ? 1 : -1);
      setIndex(target);
    },
    select(answerId: number) {
      const current = answers[index] ?? [];
      const next = nextSelection(QUESTIONS[index].question, current, answerId);
      if (next === current) return;
      setAnswers({ ...answers, [index]: next });
      cue('select');
    },
    rate(rating: Rating) {
      setRatings({ ...ratings, [index]: rating });
      cue('select');
    },
    finish() {
      setFinished(true);
      cue('finish');
    },
    restart() {
      setIndex(0);
      setAnswers({});
      setRatings({});
      setFinished(false);
    },
    /** Debug: answer every open Question, about three in four right, with a spread of ratings. */
    debugFill() {
      const nextAnswers = { ...answers };
      const nextRatings = { ...ratings };
      QUESTIONS.forEach((sample, i) => {
        if (nextAnswers[i]?.length) return;
        const wrong = sample.question.answers!.map(answer => answer.id!).filter(id => !sample.correct.includes(id));
        nextAnswers[i] = Math.random() < 0.75 ? sample.correct : [wrong[0], ...sample.correct].slice(0, sample.correct.length);
        const roll = Math.random();
        if (roll < 0.85) nextRatings[i] = roll < 0.15 ? 'guess' : roll < 0.4 ? 'unsure' : 'confident';
      });
      setAnswers(nextAnswers);
      setRatings(nextRatings);
    }
  };
}

type ExamSim = ReturnType<typeof useExamSim>;

export function SkylineExam({ debug }: { debug: (controls: { fill: () => void; restart: () => void }) => React.ReactNode }) {
  const sim = useExamSim();
  return (
    <div className={cn(archivo.className, 'flex min-h-dvh flex-col bg-background text-black')}>
      {sim.finished ? <Results sim={sim} /> : <Run sim={sim} />}
      {debug({ fill: sim.debugFill, restart: sim.restart })}
    </div>
  );
}

/** The dense strip: no per-column borders at 65 across, or a phone shows only borders. */
function Strip({ cells, current, onJump, stagger = false, className }: {
  cells: Cell[];
  current?: number;
  /** Present while the Exam runs: the strip is then the Navigator. */
  onJump?: (index: number) => void;
  /** Results: colours arrive left to right. */
  stagger?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const at = (x: number) => {
    const box = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(cells.length - 1, Math.floor(((x - box.left) / box.width) * cells.length)));
  };
  const pointed = scrub ?? hover;
  const percent = (i: number) => `${((i + 0.5) / cells.length) * 100}%`;

  return (
    <div
      ref={ref}
      className={cn('relative', onJump && 'cursor-pointer touch-none py-2', className)}
      {...(onJump && {
        role: 'slider',
        'aria-label': 'Question navigator',
        'aria-valuemin': 1,
        'aria-valuemax': cells.length,
        'aria-valuenow': (current ?? 0) + 1,
        onPointerDown: (event: React.PointerEvent) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setScrub(at(event.clientX));
        },
        onPointerMove: (event: React.PointerEvent) => {
          if (scrub != null) setScrub(at(event.clientX));
          else if (event.pointerType === 'mouse') setHover(at(event.clientX));
        },
        onPointerUp: () => {
          if (scrub != null) onJump(scrub);
          setScrub(null);
        },
        onPointerCancel: () => setScrub(null),
        onPointerLeave: () => setHover(null)
      })}
    >
      <div className='flex h-full items-end gap-px border-b-2 border-black' aria-hidden='true'>
        {cells.map((cell, i) => (
          <div
            key={i}
            className={cn('flex-1 transition-[height,background-color,opacity] duration-300 ease-[var(--ease-out)]', TONE[cell.tone], cell.dim && 'opacity-15', i === pointed && 'outline-2 outline-black')}
            style={{ height: cell.tone === 'empty' ? 3 : `${cell.height}%`, transitionDelay: stagger && !reduce ? `${i * 20}ms` : undefined }}
          />
        ))}
      </div>
      {current != null && (
        <motion.div
          className='absolute bottom-0 h-1.5 -translate-x-1/2 bg-black'
          style={{ width: `max(6px, ${100 / cells.length}%)` }}
          initial={false}
          animate={{ left: percent(current) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.35, bounce: 0.2 }}
        />
      )}
      {pointed != null && (
        <span className='pointer-events-none absolute top-full z-10 -translate-x-1/2 bg-black px-2 py-0.5 text-sm font-black tabular-nums text-white' style={{ left: percent(pointed) }}>
          {pointed + 1}
        </span>
      )}
    </div>
  );
}

function Run({ sim }: { sim: ExamSim }) {
  const reduce = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const { question } = QUESTIONS[sim.index];
  const options = question.answers ?? [];
  const selectedIds = sim.answers[sim.index] ?? [];
  const multiple = question.type === 'multiple_response';
  const answered = selectedIds.length > 0;
  const rating = sim.ratings[sim.index];
  const isLast = sim.index === TOTAL - 1;
  const open = TOTAL - sim.answeredCount;
  const revisit = Object.entries(sim.ratings).filter(([i, value]) => value !== 'confident' && sim.answers[Number(i)]?.length).length;

  const cells: Cell[] = QUESTIONS.map((_, i) => {
    if (!sim.answers[i]?.length) return { height: 0, tone: 'empty' };
    const rated = sim.ratings[i];
    return { height: HEIGHT[rated ?? 'unrated'], tone: rated === 'guess' || rated === 'unsure' ? 'amber' : 'blue' };
  });

  function primary() {
    if (confirming) sim.finish();
    else if (isLast) setConfirming(true);
    else sim.go(sim.index + 1);
  }

  const { getOptionProps } = useQuizKeyboard({
    count: options.length,
    selectionEnabled: !confirming,
    onActivate: i => sim.select(options[i].id!),
    onPrimary: primary,
    onNavigate: step => !confirming && sim.go(sim.index + step),
    resetKey: question.id
  });

  const dockButton = 'h-14 shrink-0 cursor-pointer border-2 border-black text-lg font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-default disabled:opacity-40';

  return (
    <>
      <header className='sticky top-0 z-10 bg-background px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]'>
        <div className='mx-auto flex max-w-4xl items-end gap-3 sm:gap-5'>
          <Link href='/quiz' aria-label='Leave exam' className={cn('-ml-2 mb-1 flex size-11 items-center justify-center', focusRing)}>
            <X className='size-6' strokeWidth={3} />
          </Link>
          <Strip cells={cells} current={sim.index} onJump={sim.go} className='h-[3.25rem] flex-1 sm:h-[4.5rem]' />
          <button type='button' onClick={() => setConfirming(true)} className={cn('mb-1 h-11 cursor-pointer font-black underline decoration-2 underline-offset-4', focusRing)}>
            Finish
          </button>
        </div>
      </header>

      <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-4xl flex-1 px-4 pb-72 pt-6 sm:pb-64 sm:pt-10'>
        <motion.div
          key={question.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: sim.direction * 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
        >
          <div className='flex items-center justify-between'>
            <p className='text-sm font-bold text-black/60'>
              {sim.index + 1} of {TOTAL}
            </p>
            <SoundToggle />
          </div>
          <h1 className='mt-2 max-w-[34ch] text-[1.625rem] font-extrabold leading-[1.15] font-stretch-[88%] sm:text-4xl'>{question.text}</h1>
          {multiple && <p className='mt-3 font-bold'>Choose {question.selectCount}</p>}

          <div className='mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4' role={multiple ? 'group' : 'radiogroup'} aria-label={question.text ?? undefined}>
            {options.map((option, i) => {
              const id = option.id!;
              const selected = selectedIds.includes(id);
              const capped = multiple && !selected && selectedIds.length >= (question.selectCount ?? 1);
              return (
                <div
                  key={id}
                  {...getOptionProps(i)}
                  role={multiple ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  aria-disabled={capped || undefined}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => !capped && sim.select(id)}
                  className={cn(
                    'flex min-h-16 items-center gap-3 border-2 border-black p-3 text-left font-semibold leading-snug sm:p-4 sm:text-lg',
                    press,
                    focusRing,
                    capped ? 'cursor-default' : 'cursor-pointer',
                    selected
                      ? 'translate-x-1 translate-y-1 bg-primary text-white'
                      : cn('bg-white shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', capped ? 'opacity-50' : 'hover:bg-secondary/25')
                  )}
                >
                  <span className='flex size-7 shrink-0 items-center justify-center border-2 border-black bg-white text-sm font-black text-black'>
                    {selected ? <Check className='size-4' strokeWidth={4} /> : <span className='hidden pointer-fine:inline' aria-hidden='true'>{i + 1}</span>}
                  </span>
                  {option.text}
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* Same dock as a Drill, minus the verdict: an Exam never says right or wrong here. */}
      <div className={cn('fixed inset-x-0 bottom-0 z-20 border-t-4 border-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-colors duration-150', confirming ? 'bg-secondary' : 'bg-white')}>
        <div className='mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end sm:gap-8'>
          {confirming ? (
            <div className='min-w-0 flex-1' role='alert'>
              <p className='text-2xl font-black font-stretch-[112%] sm:text-3xl'>
                {open > 0 ? `Finish with ${open} unanswered?` : 'Finish the exam?'}
              </p>
              <p className='mt-1 font-medium'>
                {open > 0 ? 'Unanswered questions count as wrong.' : 'Answers lock once you finish.'}
                {revisit > 0 && ` ${revisit} marked to revisit.`}
              </p>
            </div>
          ) : (
            // Always in place, so answering never moves the buttons under the thumb.
            <div className={cn('min-w-0 flex-1 transition-opacity', !answered && 'opacity-30')} role='group' aria-label='How sure are you?'>
              <p className='mb-1.5 text-sm font-bold'>How sure are you?</p>
              <div className='grid grid-cols-3 gap-2 sm:max-w-md'>
                {RATINGS.map(({ value, label }) => (
                  <button
                    key={value}
                    type='button'
                    disabled={!answered}
                    aria-pressed={rating === value}
                    onClick={() => sim.rate(value)}
                    className={cn(
                      'h-11 cursor-pointer border-2 border-black text-[0.9375rem] font-bold disabled:cursor-default',
                      press,
                      focusRing,
                      rating === value
                        ? cn('translate-x-0.5 translate-y-0.5', value === 'confident' ? 'bg-primary text-white' : 'bg-secondary')
                        : 'bg-white shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className='flex gap-3'>
            {confirming ? (
              <button type='button' onClick={() => setConfirming(false)} className={cn(dockButton, press, focusRing, 'flex-1 bg-white px-6 sm:flex-none')}>
                Keep going
              </button>
            ) : (
              <button type='button' onClick={() => sim.go(sim.index - 1)} disabled={sim.index === 0} aria-label='Previous question' className={cn(dockButton, press, focusRing, 'flex w-14 items-center justify-center bg-white')}>
                <ArrowLeft className='size-6' strokeWidth={3} />
              </button>
            )}
            <button type='button' onClick={primary} aria-keyshortcuts='Enter' className={cn(dockButton, press, focusRing, 'flex-1 px-10 sm:min-w-52 sm:flex-none', confirming ? 'bg-black text-white' : 'bg-primary text-white')}>
              {confirming || isLast ? 'Finish exam' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Results({ sim }: { sim: ExamSim }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [spot, setSpot] = useState<'misconception' | 'lucky' | null>(null);

  const right = QUESTIONS.map((_, i) => sim.isRight(i));
  const correctCount = right.filter(Boolean).length;
  const scaled = 100 + Math.round((correctCount / TOTAL) * 900);
  const passed = scaled >= PASSING;
  const [shown, setShown] = useState(reduce ? scaled : 100);
  const kind = (i: number) => (sim.ratings[i] === 'confident' && !right[i] && sim.answers[i]?.length ? 'misconception' : sim.ratings[i] === 'guess' && right[i] ? 'lucky' : null);
  const misconceptions = QUESTIONS.filter((_, i) => kind(i) === 'misconception').length;
  const lucky = QUESTIONS.filter((_, i) => kind(i) === 'lucky').length;
  const colouring = TOTAL * 0.02 + 0.3;

  // First paint shows the strip as the visitor left it; then the verdict colours sweep in.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(100, scaled, { duration: 1, delay: colouring, ease: [0.22, 1, 0.36, 1], onUpdate: value => setShown(Math.round(value)) });
    return () => controls.stop();
  }, [reduce, scaled, colouring]);

  const cells: Cell[] = QUESTIONS.map((_, i) => {
    const isAnswered = Boolean(sim.answers[i]?.length);
    const rated = sim.ratings[i];
    const height = isAnswered ? HEIGHT[rated ?? 'unrated'] : 12;
    if (!revealed) return { height, tone: !isAnswered ? 'empty' : rated === 'guess' || rated === 'unsure' ? 'amber' : 'blue' };
    return { height, tone: right[i] ? 'green' : 'red', dim: spot != null && kind(i) !== spot };
  });

  const domains = [...new Set(QUESTIONS.map(sample => sample.domain))].map(domain => {
    const indexes = QUESTIONS.flatMap((sample, i) => (sample.domain === domain ? [i] : []));
    return { domain, total: indexes.length, correct: indexes.filter(i => right[i]).length };
  });

  const settle = (delay: number) => ({
    initial: reduce ? (false as const) : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: colouring + delay, ease: [0.22, 1, 0.36, 1] as const }
  });
  const spotlight = (target: 'misconception' | 'lucky') => ({
    type: 'button' as const,
    'aria-pressed': spot === target,
    onClick: () => setSpot(spot === target ? null : target),
    className: cn('cursor-pointer border-2 border-black p-4 text-left', press, focusRing, spot === target ? 'translate-x-1 translate-y-1 bg-black text-white' : 'bg-white shadow-[4px_4px_0px_0px_#000]')
  });

  return (
    <main id='main-content' tabIndex={-1} className='mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-[max(2rem,env(safe-area-inset-top))] sm:pt-16'>
      <Strip cells={cells} stagger={spot == null} className='h-28 sm:h-48' />
      <p className='mt-2 text-sm font-medium text-black/60'>Height is how sure you were. Green is right, red is wrong.</p>

      <p className='mt-6 text-[5.5rem] font-black leading-none tabular-nums font-stretch-[125%] sm:text-[9rem]' aria-label={String(scaled)}>
        {shown}
      </p>

      <motion.div {...settle(0.8)}>
        <p className='mt-4 max-w-[30ch] text-2xl font-extrabold leading-tight font-stretch-[88%] sm:text-3xl'>
          {passed ? 'You passed.' : 'Not a pass yet.'} {correctCount} of {TOTAL} right, {PASSING} passes.
        </p>
      </motion.div>

      {(misconceptions > 0 || lucky > 0) && (
        <motion.div {...settle(1)} className='mt-8 grid gap-4 sm:grid-cols-2'>
          {misconceptions > 0 && (
            <button {...spotlight('misconception')}>
              <span className='block text-xl font-black'>{misconceptions} sure and wrong</span>
              <span className='mt-1 block font-medium opacity-70'>The tall red columns. Start here.</span>
            </button>
          )}
          {lucky > 0 && (
            <button {...spotlight('lucky')}>
              <span className='block text-xl font-black'>{lucky} lucky guesses</span>
              <span className='mt-1 block font-medium opacity-70'>The short green ones. Worth studying anyway.</span>
            </button>
          )}
        </motion.div>
      )}

      <motion.dl {...settle(1.1)} className='mt-8 border-t-2 border-black'>
        {domains.map(({ domain, total, correct }) => (
          <div key={domain} className='grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 border-b-2 border-black py-3 sm:grid-cols-[12rem_1fr_auto]'>
            <dt className='font-bold'>{domain}</dt>
            <dd className='order-last col-span-2 h-3 border-2 border-black bg-white sm:order-none sm:col-span-1'>
              <div className='h-full bg-success' style={{ width: `${(correct / total) * 100}%` }} />
            </dd>
            <dd className='font-bold tabular-nums'>{correct} of {total}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.div {...settle(1.2)} className='mt-8 flex flex-col gap-4 sm:flex-row'>
        <button
          type='button'
          autoFocus
          onClick={() => router.replace('/prototype/drill-engagement?variant=A')}
          className={cn('h-14 cursor-pointer border-2 border-black bg-primary px-10 text-lg font-black text-white shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', press, focusRing)}
        >
          Drill your mistakes
        </button>
        <button
          type='button'
          onClick={sim.restart}
          className={cn('h-14 cursor-pointer border-2 border-black bg-white px-10 text-lg font-black shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none', press, focusRing)}
        >
          Take the exam again
        </button>
      </motion.div>
    </main>
  );
}
