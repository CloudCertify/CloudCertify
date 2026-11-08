'use client';

/*
 * PROTOTYPE — throwaway. Four practice-section layouts for the Quiz page, switchable via
 * `?variant=A|B|C|D` on /quiz/[id] (dev only). Question: which layout gets a visitor into
 * a quiz in the fewest clicks, with the whole-Quiz Mix as the obvious default?
 * Start buttons call the real start handlers; the Mix is faked (id -1) when the API has
 * not seeded one yet (#98).
 */

import { Suspense, useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Crosshair, RotateCcw, Shuffle, Target } from 'lucide-react';
import { toast } from 'sonner';
import { DrawRule, type DrillDto, type QuizDto } from '@/http/generated/api.schemas';
import { isWholeQuizMix } from '@/lib/whole-quiz-mix';
import { PrototypeSwitcher } from '@/components/prototype-switcher';

const VARIANTS = [
  { key: 'A', name: 'Two big tiles' },
  { key: 'B', name: 'One list' },
  { key: 'C', name: 'Pick, then Start' },
  { key: 'D', name: 'Sticky start bar' }
];

const FAKE_MIX: DrillDto = {
  id: -1,
  title: 'Mix',
  domain: null,
  drawRule: DrawRule.drill_mix,
  slug: 'mix',
  isAvailable: true
};

type Props = {
  variant: string;
  quiz: QuizDto;
  isAuthenticated: boolean;
  emailField: ReactNode;
  examQuestionCount: string | null;
  isStartingExam: boolean;
  startingDrillId: number | null;
  onStartExam: () => void;
  onStartDrill: (drill: DrillDto) => void;
};

type VariantProps = Omit<Props, 'variant' | 'quiz'> & {
  mix: DrillDto;
  domainDrills: DrillDto[];
  mistakes?: DrillDto;
};

const press =
  'transition-[translate,box-shadow] duration-150 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

export function QuizDetailPrototype({ variant, quiz, onStartDrill, ...rest }: Props) {
  const drills = quiz.drills ?? [];
  const props: VariantProps = {
    ...rest,
    mix: drills.find(isWholeQuizMix) ?? FAKE_MIX,
    domainDrills: drills.filter(d => d.domain != null),
    mistakes: drills.find(d => d.drawRule === DrawRule.mistakes),
    onStartDrill: drill =>
      drill.id === FAKE_MIX.id
        ? toast.info('Prototype: this API has no Mix drill yet (needs #98).')
        : onStartDrill(drill)
  };

  return (
    <>
      {variant === 'B' ? (
        <VariantB {...props} />
      ) : variant === 'C' ? (
        <VariantC {...props} />
      ) : variant === 'D' ? (
        <VariantD {...props} />
      ) : (
        <VariantA {...props} />
      )}
      <Suspense fallback={null}>
        <PrototypeSwitcher variants={VARIANTS} />
      </Suspense>
    </>
  );
}

const busy = (props: VariantProps, drill: DrillDto) => props.startingDrillId === drill.id;

// --- A: two big tiles, then one-click domain buttons --------------------------------------

function VariantA(props: VariantProps) {
  const { mix, domainDrills, mistakes, isAuthenticated } = props;
  return (
    <section className='space-y-6'>
      {props.emailField}
      <div className='grid gap-4 sm:grid-cols-[3fr_2fr]'>
        <button
          type='button'
          onClick={() => props.onStartDrill(mix)}
          className={`group flex flex-col items-start gap-3 border-4 border-black bg-primary p-6 text-left text-white shadow-[6px_6px_0px_0px_#000] ${press}`}
        >
          <Shuffle className='h-7 w-7' />
          <span className='text-2xl font-black'>{busy(props, mix) ? 'Starting...' : 'Start mix'}</span>
          <span className='text-sm font-medium text-white/85'>
            15 questions from the whole exam
            {isAuthenticated ? ', your misses first' : ''}
          </span>
          <ArrowRight className='mt-auto h-6 w-6 self-end transition-transform group-hover:translate-x-1' />
        </button>
        <button
          type='button'
          onClick={props.onStartExam}
          className={`group flex flex-col items-start gap-3 border-4 border-black bg-white p-6 text-left text-black shadow-[6px_6px_0px_0px_#000] ${press}`}
        >
          <Target className='h-7 w-7' />
          <span className='text-2xl font-black'>{props.isStartingExam ? 'Starting...' : 'Full exam'}</span>
          <span className='text-sm font-medium text-black/70'>
            {props.examQuestionCount ?? '65'} questions, scored like the real one
          </span>
          <ArrowRight className='mt-auto h-6 w-6 self-end transition-transform group-hover:translate-x-1' />
        </button>
      </div>

      <div className='space-y-3'>
        <h2 className='text-sm font-black uppercase tracking-wide text-black'>Or focus on one domain</h2>
        <div className='flex flex-wrap gap-3'>
          {domainDrills.map(drill => (
            <button
              key={drill.id}
              type='button'
              disabled={!drill.isAvailable}
              onClick={() => props.onStartDrill(drill)}
              className={`inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-[3px_3px_0px_0px_#000] hover:bg-secondary ${press}`}
            >
              {busy(props, drill) ? 'Starting...' : drill.domain}
              <ArrowRight className='h-3.5 w-3.5' />
            </button>
          ))}
          {mistakes && (
            <button
              type='button'
              disabled={!mistakes.isAvailable}
              onClick={() => props.onStartDrill(mistakes)}
              className={`inline-flex items-center gap-2 border-2 border-dashed border-black bg-white px-4 py-2 text-sm font-bold text-black hover:bg-secondary ${press}`}
            >
              <RotateCcw className='h-3.5 w-3.5' />
              {busy(props, mistakes) ? 'Starting...' : 'Review my mistakes'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// --- B: one list, every row starts on click ------------------------------------------------

function VariantB(props: VariantProps) {
  const { mix, domainDrills, mistakes } = props;
  const Row = ({
    icon,
    title,
    meta,
    onClick,
    starting,
    primary,
    disabled
  }: {
    icon: ReactNode;
    title: string;
    meta: string;
    onClick: () => void;
    starting: boolean;
    primary?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 border-b-2 border-black px-5 py-4 text-left last:border-b-0 disabled:opacity-50 ${
        primary ? 'bg-primary text-white' : 'bg-white text-black hover:bg-secondary/40'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black ${primary ? 'bg-white text-black' : 'bg-background'}`}>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block font-black'>{starting ? 'Starting...' : title}</span>
        <span className={`block text-sm font-medium ${primary ? 'text-white/85' : 'text-black/60'}`}>{meta}</span>
      </span>
      {primary && (
        <span className='hidden border-2 border-black bg-secondary px-2 py-0.5 text-xs font-black uppercase text-black sm:inline'>
          Start here
        </span>
      )}
      <ArrowRight className='h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1' />
    </button>
  );

  return (
    <section className='space-y-4'>
      {props.emailField}
      <div className='border-4 border-black bg-white shadow-[6px_6px_0px_0px_#000]'>
        <Row
          primary
          icon={<Shuffle className='h-5 w-5' />}
          title='Mix'
          meta='15 questions · whole exam · adapts to you'
          starting={busy(props, mix)}
          onClick={() => props.onStartDrill(mix)}
        />
        <Row
          icon={<Target className='h-5 w-5' />}
          title='Full exam'
          meta={`${props.examQuestionCount ?? '65'} questions · scaled score · pass / fail`}
          starting={props.isStartingExam}
          onClick={props.onStartExam}
        />
        {domainDrills.map(drill => (
          <Row
            key={drill.id}
            icon={<Crosshair className='h-5 w-5' />}
            title={drill.domain ?? drill.title}
            meta='15 questions · one domain'
            starting={busy(props, drill)}
            disabled={!drill.isAvailable}
            onClick={() => props.onStartDrill(drill)}
          />
        ))}
        {mistakes && (
          <Row
            icon={<RotateCcw className='h-5 w-5' />}
            title='My mistakes'
            meta='Only the questions you got wrong'
            starting={busy(props, mistakes)}
            disabled={!mistakes.isAvailable}
            onClick={() => props.onStartDrill(mistakes)}
          />
        )}
      </div>
    </section>
  );
}

// --- C: pick what (Mix preselected), then one big Start ------------------------------------

function VariantC(props: VariantProps) {
  const { mix, domainDrills, mistakes } = props;
  type Choice = 'mix' | 'domain' | 'exam' | 'mistakes';
  const [choice, setChoice] = useState<Choice>('mix');
  const [domainId, setDomainId] = useState(domainDrills[0]?.id);
  const domain = domainDrills.find(d => d.id === domainId);

  const tabs: { key: Choice; label: string; icon: ReactNode }[] = [
    { key: 'mix', label: 'Mix', icon: <Shuffle className='h-4 w-4' /> },
    { key: 'domain', label: 'One domain', icon: <Crosshair className='h-4 w-4' /> },
    { key: 'exam', label: 'Full exam', icon: <Target className='h-4 w-4' /> },
    ...(mistakes ? [{ key: 'mistakes' as const, label: 'Mistakes', icon: <RotateCcw className='h-4 w-4' /> }] : [])
  ];

  const summary = {
    mix: '15 questions from the whole exam. What you missed comes back first.',
    domain: `15 questions from ${domain?.domain ?? 'one domain'}.`,
    exam: `${props.examQuestionCount ?? '65'} questions, timed like the real exam, with a scaled score.`,
    mistakes: 'Only the questions you got wrong before.'
  }[choice];

  const start = () => {
    if (choice === 'exam') props.onStartExam();
    else if (choice === 'mix') props.onStartDrill(mix);
    else if (choice === 'mistakes' && mistakes) props.onStartDrill(mistakes);
    else if (domain) props.onStartDrill(domain);
  };
  const starting = props.isStartingExam || props.startingDrillId !== null;

  return (
    <section className='space-y-5 border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_#000] sm:p-6'>
      <div role='radiogroup' aria-label='What to practice' className='grid grid-cols-2 border-2 border-black sm:grid-cols-4'>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type='button'
            role='radio'
            aria-checked={choice === tab.key}
            onClick={() => setChoice(tab.key)}
            className={`flex items-center justify-center gap-2 border-black px-3 py-3 text-sm font-black [&:not(:last-child)]:border-r-2 ${
              choice === tab.key ? 'bg-black text-white' : 'bg-white text-black hover:bg-secondary/40'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {choice === 'domain' && (
        <div className='flex flex-wrap gap-2'>
          {domainDrills.map(drill => (
            <button
              key={drill.id}
              type='button'
              onClick={() => setDomainId(drill.id)}
              className={`border-2 border-black px-3 py-1.5 text-sm font-bold ${
                drill.id === domainId ? 'bg-secondary text-black shadow-[3px_3px_0px_0px_#000]' : 'bg-white text-black/70'
              }`}
            >
              {drill.domain}
            </button>
          ))}
        </div>
      )}

      <p className='flex items-start gap-2 text-sm font-medium text-black/70'>
        <BookOpen className='mt-0.5 h-4 w-4 shrink-0' />
        {summary}
      </p>

      {props.emailField}

      <button
        type='button'
        onClick={start}
        aria-disabled={starting || undefined}
        className={`flex w-full items-center justify-center gap-2 border-2 border-black bg-primary px-6 py-4 text-lg font-black text-white shadow-[4px_4px_0px_0px_#000] ${press}`}
      >
        {starting ? 'Starting...' : 'Start'}
        {!starting && <ArrowRight className='h-5 w-5' />}
      </button>
    </section>
  );
}

// --- D: content reads top-down, a sticky bar is always one click away ----------------------

function VariantD(props: VariantProps) {
  const { mix, domainDrills, mistakes } = props;
  return (
    <>
      <section className='space-y-4 pb-40'>
        <h2 className='text-xl font-black text-black'>Practice by domain</h2>
        <div className='divide-y-2 divide-black border-2 border-black bg-white'>
          {domainDrills.map(drill => (
            <div key={drill.id} className='flex items-center justify-between gap-3 px-4 py-3'>
              <span className='font-bold text-black'>{drill.domain}</span>
              <button
                type='button'
                disabled={!drill.isAvailable}
                onClick={() => props.onStartDrill(drill)}
                className='inline-flex items-center gap-1 text-sm font-black text-primary underline-offset-4 hover:underline disabled:opacity-50'
              >
                {busy(props, drill) ? 'Starting...' : 'Practice'}
                <ArrowRight className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
          {mistakes && (
            <div className='flex items-center justify-between gap-3 px-4 py-3'>
              <span className='font-bold text-black'>My mistakes</span>
              <button
                type='button'
                onClick={() => props.onStartDrill(mistakes)}
                className='inline-flex items-center gap-1 text-sm font-black text-primary underline-offset-4 hover:underline'
              >
                {busy(props, mistakes) ? 'Starting...' : 'Review'}
                <ArrowRight className='h-3.5 w-3.5' />
              </button>
            </div>
          )}
        </div>
      </section>

      <div className='fixed inset-x-0 bottom-0 z-50 border-t-4 border-black bg-background pb-16 pt-3'>
        <div className='mx-auto flex max-w-3xl flex-col gap-3 px-4 sm:flex-row sm:items-end'>
          <div className='flex-1 [&_label]:sr-only [&_input]:py-2.5'>{props.emailField}</div>
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={props.onStartExam}
              className={`flex-1 border-2 border-black bg-white px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0px_0px_#000] sm:flex-none ${press}`}
            >
              {props.isStartingExam ? 'Starting...' : `Full exam · ${props.examQuestionCount ?? '65'}`}
            </button>
            <button
              type='button'
              onClick={() => props.onStartDrill(mix)}
              className={`flex flex-[2] items-center justify-center gap-2 border-2 border-black bg-primary px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0px_0px_#000] sm:flex-none ${press}`}
            >
              <Shuffle className='h-4 w-4' />
              {busy(props, mix) ? 'Starting...' : 'Start mix · 15'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
