'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Check, Coffee, X } from 'lucide-react';

import { AppHeader } from '@/components/app-header';
import { dockButton, focusRing, press } from '@/components/attempt-frame';
import { CertificationRoadmap } from '@/components/certification-roadmap';
import { DrillColumns, runLengths } from '@/components/drill-columns';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';
import type { QuizDto } from '@/http/generated/api.schemas';

// Size classes go before this in cn(): tailwind-merge lets a later font size drop the leading.
const display = 'font-black leading-[0.9] font-stretch-[70%] text-balance';

export function HomePage({ quizzes }: { quizzes: QuizDto[] }) {
  const { t } = useI18n();

  return (
    <div className='flex min-h-dvh flex-col bg-background text-black'>
      <AppHeader
        anonymousActions={
          <Button asChild size='sm'>
            <Link href='/dashboard'>{t.common.dashboard}</Link>
          </Button>
        }
        links={[
          { href: '#certifications', label: t.nav.certifications },
          { href: '#pricing', label: t.nav.pricing }
        ]}
      />

      <main id='main-content' tabIndex={-1} className='flex-1'>
        <section id='hero' className='border-b-2 border-black'>
          <div className='container px-4 pb-12 pt-10 md:px-6 md:pb-20 md:pt-16'>
            <div className='grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-end lg:gap-16'>
              <h1 className={cn('max-w-[17ch] text-[clamp(2.75rem,6.5vw,5.5rem)]', display)}>{t.home.heroTitle}</h1>
              <div>
                <p className='max-w-[46ch] text-lg font-medium leading-snug'>{t.home.heroSubtitle}</p>
                <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
                  <Button asChild size='lg'>
                    <Link href='/dashboard'>{t.home.startCta}</Link>
                  </Button>
                  <Button asChild size='lg' variant='outline'>
                    <a href='#certifications'>{t.home.browseCta}</a>
                  </Button>
                </div>
              </div>
            </div>
            <ExampleResult />
          </div>
        </section>

        <section className='border-b-2 border-black bg-white'>
          <div className='container grid px-4 py-14 md:px-6 md:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16'>
            <SectionHeading title={t.home.drillTitle} body={t.home.drillSubtitle} />
            <DrillDemo />
          </div>
        </section>

        <section className='border-b-2 border-black'>
          <div className='container px-4 py-14 md:px-6 md:py-24'>
            <SectionHeading title={t.home.modesTitle} />
            <Modes />
          </div>
        </section>

        <section id='certifications' className='scroll-mt-16 border-b-2 border-black bg-white'>
          <div className='container px-4 py-14 md:px-6 md:py-24'>
            <SectionHeading title={t.home.roadmapTitle} body={t.home.roadmapSubtitle} />
            <CertificationRoadmap quizzes={quizzes} />
          </div>
        </section>

        <section id='pricing' className='scroll-mt-16 bg-primary text-white'>
          <div className='container px-4 py-16 md:px-6 md:py-28'>
            <h2 className={cn('text-[clamp(3.5rem,12vw,10rem)]', display)}>{t.home.pricingTitle}</h2>
            <p className='mt-6 max-w-[52ch] text-lg font-medium leading-snug'>{t.home.pricingBody}</p>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Button asChild size='lg' variant='outline'>
                <Link href='/dashboard'>{t.home.startCta}</Link>
              </Button>
              <Button asChild size='lg' className='bg-[#FFDD00] text-black'>
                <a href='https://buymeacoffee.com/snowye' target='_blank' rel='noopener noreferrer'>
                  <Coffee aria-hidden='true' />
                  {t.footer.buyMeACoffee}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SectionHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className='mb-10 md:mb-14'>
      <h2 className={cn('text-5xl md:text-7xl', display)}>{title}</h2>
      {body && <p className='mt-4 max-w-[58ch] text-lg font-medium leading-snug text-black/70'>{body}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ EXAMPLE RESULT */

type Finding = 'lucky' | 'misconception';

/**
 * One finished 65-Question Exam, a letter per Question: c confident, u unsure,
 * g guess; upper case is a right answer. 47 right, 7 misconceptions, 5 lucky guesses.
 */
const EXAMPLE = 'CCUCcCGCCuCCUgCCcCUCuGCgCCCcUCgCCUuCcGCCuCUgCgcCuGCCUCcCgCGCCUCcC';
const EXAMPLE_SCORE = 742;

const CELLS = [...EXAMPLE].map(letter => {
  const rating = letter.toLowerCase();
  return {
    rating: rating === 'c' ? ('confident' as const) : rating === 'u' ? ('unsure' as const) : ('guess' as const),
    height: rating === 'c' ? 100 : rating === 'u' ? 70 : 45,
    right: letter !== rating,
    /** The column's colour while the Exam runs: marked to revisit, or just answered. */
    before: rating === 'c' ? 'var(--primary)' : 'var(--secondary)',
    finding: (letter === 'c' ? 'misconception' : letter === 'G' ? 'lucky' : null) as Finding | null
  };
});
const count = (finding: Finding) => CELLS.filter(cell => cell.finding === finding).length;
const RIGHT = CELLS.filter(cell => cell.right).length;

/**
 * The Exam results screen, standing in for a product screenshot: its strip, score and
 * two findings. Every column can be read: hover or tap one, or move along with the arrow
 * keys. It opens on the first misconception so the line under the strip is never empty.
 * Unlike the Navigator, a touch does not capture the drag, so the page still scrolls.
 */
function ExampleResult() {
  const { t } = useI18n();
  const [spot, setSpot] = useState<Finding | null>(null);
  const [selected, setSelected] = useState(() => CELLS.findIndex(cell => cell.finding === 'misconception'));
  const [hover, setHover] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const last = CELLS.length - 1;
  const at = (x: number) => {
    const box = strip.current!.getBoundingClientRect();
    return Math.max(0, Math.min(last, Math.floor(((x - box.left) / box.width) * CELLS.length)));
  };
  const pointed = hover ?? selected;
  const read = (i: number) => t.home.heroColumn(i + 1, CELLS[i].rating, CELLS[i].right);
  const findings = [
    { key: 'misconception' as const, fill: 'bg-destructive', label: t.results.misconceptions, hint: t.results.misconceptionsHint },
    { key: 'lucky' as const, fill: 'bg-warning', label: t.results.luckyGuesses, hint: t.results.luckyGuessesHint }
  ];

  return (
    <div className='mt-12 md:mt-20'>
      <div
        ref={strip}
        role='slider'
        tabIndex={0}
        aria-label={t.review.stripLabel}
        aria-valuemin={1}
        aria-valuemax={CELLS.length}
        aria-valuenow={selected + 1}
        aria-valuetext={read(selected)}
        onKeyDown={event => {
          const target =
            event.key === 'ArrowRight' || event.key === 'ArrowUp'
              ? selected + 1
              : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                ? selected - 1
                : event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? last
                    : null;
          if (target == null) return;
          event.preventDefault();
          // The keys move the selection, so a resting pointer must not keep the caption elsewhere.
          setHover(null);
          setSelected(Math.max(0, Math.min(last, target)));
        }}
        onPointerMove={event => event.pointerType === 'mouse' && setHover(at(event.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={event => setSelected(at(event.clientX))}
        className={cn('relative cursor-pointer select-none [-webkit-tap-highlight-color:transparent]', focusRing)}
      >
        <div className='flex h-36 items-end gap-px border-b-2 border-black sm:h-52 lg:h-64' aria-hidden='true'>
          {CELLS.map((cell, i) => (
            <div
              key={i}
              className={cn(
                'skyline-col flex-1 transition-opacity duration-200',
                cell.right ? 'bg-success' : 'bg-destructive',
                spot && cell.finding !== spot && i !== pointed && 'opacity-15',
                i === pointed && 'relative z-10 outline-2 outline-black'
              )}
              style={{ height: `${cell.height}%`, '--i': i, '--before': cell.before } as CSSProperties}
            />
          ))}
        </div>
        <div
          className='absolute top-full h-2 -translate-x-1/2 bg-black transition-[left] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none'
          style={{ left: `${((pointed + 0.5) / CELLS.length) * 100}%`, width: `${100 / CELLS.length}%` }}
          aria-hidden='true'
        />
      </div>
      <p className='mt-5 flex min-h-14 items-start gap-3 text-xl font-extrabold leading-tight font-stretch-[88%] sm:min-h-0 sm:text-2xl' aria-hidden='true'>
        <span className={cn('mt-0.5 size-5 shrink-0 border-2 border-black', CELLS[pointed].right ? 'bg-success' : 'bg-destructive')} />
        {read(pointed)}
      </p>
      <p className='mt-2 text-sm font-medium text-black/60'>
        {t.home.heroExample} {t.results.stripLegend}
      </p>

      <div className='mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-16'>
        <div>
          <p className='text-[5.5rem] font-black leading-none tabular-nums font-stretch-[125%] sm:text-[8rem]'>{EXAMPLE_SCORE}</p>
          <p className='mt-4 inline-block border-2 border-black bg-success px-3 py-1 font-black'>{t.results.passingScore(true, '700')}</p>
          <p className='mt-3 text-xl font-extrabold leading-tight font-stretch-[88%]'>{t.results.scoreLine(RIGHT, CELLS.length)}.</p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          {findings.map(finding => {
            const on = spot === finding.key;
            return (
              <button
                key={finding.key}
                type='button'
                aria-pressed={on}
                onClick={() => {
                  setSpot(on ? null : finding.key);
                  if (!on && CELLS[selected].finding !== finding.key) setSelected(CELLS.findIndex(cell => cell.finding === finding.key));
                }}
                className={cn(
                  'cursor-pointer border-2 border-black p-4 text-left motion-reduce:transition-none',
                  press,
                  focusRing,
                  on ? cn('translate-x-1 translate-y-1', finding.fill) : 'bg-white shadow-[4px_4px_0px_0px_#000] hover:bg-secondary/25'
                )}
              >
                <span className='flex items-baseline gap-3'>
                  <span className='text-4xl font-black tabular-nums font-stretch-[125%]'>{count(finding.key)}</span>
                  <span className='text-lg font-black'>{finding.label}</span>
                </span>
                <span className='mt-1 block font-medium leading-snug'>{finding.hint}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- DRILL DEMO */

// Answer index per sample question, positional, so it stays in step with
// `t.home.sampleQuestions` in every locale (option order never changes).
const SAMPLE_CORRECT_ANSWERS = [2, 2, 1, 1];

/** A four-Question Drill that runs in the page: pick, Check, read why, Continue. */
function DrillDemo() {
  const { t } = useI18n();
  const questions = t.home.sampleQuestions;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<(boolean | null)[]>(() => questions.map(() => null));

  const done = index >= questions.length;
  const question = questions[index];
  const correct = SAMPLE_CORRECT_ANSWERS[index];
  const outcome = done ? null : outcomes[index];
  const checked = outcome != null;
  const streak = runLengths(outcomes)[index] ?? 0;

  // Continue, Finish and Try again replace what held focus, so focus goes to what replaced it:
  // the next Question, or the score. Not on first render, which would pull the page down.
  const heading = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [index]);

  const primary = () => {
    if (checked) {
      moved.current = true;
      setIndex(index + 1);
      setPicked(null);
    } else if (picked != null) {
      setOutcomes(outcomes.map((value, i) => (i === index ? picked === correct : value)));
    }
  };
  const restart = () => {
    moved.current = true;
    setIndex(0);
    setPicked(null);
    setOutcomes(questions.map(() => null));
  };

  return (
    <div className='border-2 border-black bg-background shadow-[8px_8px_0px_0px_#000]'>
      <div className='px-4 pt-4 sm:px-8 sm:pt-6'>
        <DrillColumns outcomes={outcomes} current={checked || done ? -1 : index} className='h-14 sm:h-20' />
      </div>

      {done ? (
        <div className='px-4 py-8 sm:px-8 sm:py-12' role='status'>
          <p ref={heading} tabIndex={-1} className='max-w-[30ch] text-3xl font-extrabold leading-tight font-stretch-[88%] focus-visible:outline-none sm:text-4xl'>
            {t.results.scoreLine(outcomes.filter(Boolean).length, questions.length)}.
          </p>
          <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
            <Button asChild size='lg'>
              <Link href='/dashboard'>{t.home.startCta}</Link>
            </Button>
            <Button size='lg' variant='outline' onClick={restart}>
              {t.common.tryAgain}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className='px-4 pb-6 pt-6 sm:px-8 sm:pb-10 sm:pt-8'>
            <p className='text-sm font-bold text-black/60'>
              {t.question.counter(index + 1, questions.length)}, {question.exam}
            </p>
            <h3 ref={heading} tabIndex={-1} className='mt-3 max-w-[34ch] text-[1.625rem] font-extrabold leading-[1.15] font-stretch-[88%] focus-visible:outline-none sm:text-4xl'>
              {question.question}
            </h3>

            {/* The radio group pattern: one Tab stop, arrows move and pick. Once checked, none is a stop. */}
            <div
              className='mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4'
              role='radiogroup'
              aria-label={question.question}
              onKeyDown={event => {
                const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
                if (!step || checked) return;
                event.preventDefault();
                const total = question.options.length;
                const next = ((picked ?? (step > 0 ? -1 : 0)) + step + total) % total;
                setPicked(next);
                event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
              }}
            >
              {question.options.map((option, i) => {
                const isCorrect = checked && i === correct;
                const isWrongPick = checked && i === picked && !isCorrect;
                return (
                  <button
                    key={option}
                    type='button'
                    role='radio'
                    aria-checked={picked === i}
                    aria-disabled={checked || undefined}
                    tabIndex={!checked && i === (picked ?? 0) ? 0 : -1}
                    onClick={() => !checked && setPicked(i)}
                    className={cn(
                      'flex min-h-16 items-center gap-3 border-2 border-black p-3 text-left font-semibold leading-snug motion-reduce:transition-none sm:p-4 sm:text-lg',
                      press,
                      focusRing,
                      checked ? 'cursor-default' : 'cursor-pointer',
                      isCorrect
                        ? '-translate-x-0.5 -translate-y-0.5 bg-success shadow-[6px_6px_0px_0px_#000]'
                        : isWrongPick
                          ? 'bg-destructive'
                          : checked
                            ? 'bg-white opacity-40'
                            : picked === i
                              ? 'translate-x-1 translate-y-1 bg-primary text-white'
                              : 'bg-white shadow-[4px_4px_0px_0px_#000] hover:bg-secondary/25 active:translate-x-1 active:translate-y-1 active:shadow-none'
                    )}
                  >
                    <span className='flex size-7 shrink-0 items-center justify-center border-2 border-black bg-white text-black' aria-hidden='true'>
                      {isCorrect || (picked === i && !checked) ? <Check className='size-4' strokeWidth={4} /> : isWrongPick ? <X className='size-4' strokeWidth={4} /> : null}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col gap-4 border-t-4 border-black px-4 py-4 transition-colors duration-150 sm:flex-row sm:items-end sm:gap-8 sm:px-8',
              !checked ? 'bg-white' : outcome ? 'bg-success' : 'bg-destructive'
            )}
          >
            <div className='min-w-0 flex-1' aria-live='polite'>
              {checked && (
                <>
                  <p className='text-2xl font-black font-stretch-[112%] sm:text-3xl'>
                    {!outcome ? t.question.notQuite : streak >= 2 ? t.question.correctStreak(streak) : t.common.correct}
                  </p>
                  {!outcome && <p className='mt-1 font-bold'>{t.question.answerIs(question.options[correct])}</p>}
                  <p className='mt-1 max-w-[70ch] text-[0.9375rem] font-medium leading-snug'>{question.explanation}</p>
                </>
              )}
            </div>
            {/* One button for Check and Continue, as in a Drill. Without a pick it stays focusable. */}
            <button
              type='button'
              onClick={primary}
              aria-disabled={(!checked && picked == null) || undefined}
              className={cn(
                dockButton,
                press,
                focusRing,
                'w-full px-10 motion-reduce:transition-none sm:w-auto sm:min-w-52',
                checked ? 'bg-white text-black' : 'bg-primary text-white',
                !checked && picked == null && 'cursor-default opacity-40 active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_#000]'
              )}
            >
              {!checked ? t.question.check : index === questions.length - 1 ? t.question.finishPractice : t.question.continue}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- MODES */

/** A Drill that went: three right, a miss, four right, a miss, two right. */
const STAIRS = [true, true, true, false, true, true, true, true, false, true, true, null, null, null, null];

function Modes() {
  const { t } = useI18n();
  const runs = runLengths(STAIRS);
  const pictures = {
    drill: (
      <div className='flex h-24 items-end border-b-2 border-black' aria-hidden='true'>
        {STAIRS.map((outcome, i) =>
          outcome == null ? (
            <div key={i} className='ml-[3px] h-[3px] flex-1 bg-black/20' />
          ) : (
            <div
              key={i}
              className={cn('flex-1 border-2 border-b-0 border-black', outcome ? 'bg-success' : 'bg-destructive', i === 0 ? '' : outcome && STAIRS[i - 1] ? '-ml-[2px]' : 'ml-[3px]')}
              style={{ height: outcome ? `${20 + 16 * Math.min(runs[i], 5)}%` : '14%' }}
            />
          )
        )}
      </div>
    ),
    // An Exam mid-run: no verdict colours, because nothing is revealed until Submit.
    exam: (
      <div className='flex h-24 items-end gap-px border-b-2 border-black' aria-hidden='true'>
        {CELLS.map((cell, i) =>
          i < 44 ? (
            <div key={i} className='flex-1' style={{ height: `${cell.height}%`, background: cell.before }} />
          ) : (
            <div key={i} className='h-[3px] flex-1 bg-black/20' />
          )
        )}
      </div>
    )
  };

  return (
    <div className='grid gap-x-12 gap-y-14 md:grid-cols-2 lg:gap-x-20'>
      {(['drill', 'exam'] as const).map(mode => (
        <div key={mode} className='grid md:row-span-6 md:grid-rows-subgrid md:gap-0'>
          {pictures[mode]}
          <h3 className='mt-5 pb-5 text-4xl font-black font-stretch-[112%]'>{t.home.modes[mode].name}</h3>
          {t.home.modeRows.map((label, i) => (
            <div key={label} className='grid grid-cols-[7.5rem_1fr] gap-4 border-t-2 border-black py-4'>
              <p className='font-bold text-black/60'>{label}</p>
              <p className='text-lg font-semibold leading-snug'>{t.home.modes[mode].rows[i]}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
