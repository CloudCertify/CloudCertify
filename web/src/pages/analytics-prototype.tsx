import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  LockKeyhole,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * PROTOTYPE ONLY: Three analytics layouts on the existing `/dashboard` route,
 * switchable with `?variant=A|B|C` and `?scenario=history|first|anonymous`.
 */

type Variant = 'A' | 'B' | 'C';
type Scenario = 'history' | 'first' | 'anonymous';

type DomainStanding = {
  name: string;
  score: number;
  delta: number;
  questions: number;
};

type WeakService = {
  name: string;
  score: number;
  questions: number;
  domain: string;
};

const VARIANTS: Variant[] = ['A', 'B', 'C'];
const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'history', label: '5 attempts' },
  { key: 'first', label: '1 attempt' },
  { key: 'anonymous', label: 'Signed out' }
];

const VARIANT_NAMES: Record<Variant, string> = {
  A: 'Action first',
  B: 'Trajectory first',
  C: 'Domain ledger'
};

const DOMAIN_STANDINGS: DomainStanding[] = [
  {
    name: 'Security and Compliance',
    score: 61,
    delta: 4,
    questions: 38
  },
  {
    name: 'Cloud Technology and Services',
    score: 74,
    delta: 9,
    questions: 52
  },
  {
    name: 'Billing, Pricing, and Support',
    score: 82,
    delta: 6,
    questions: 31
  },
  {
    name: 'Cloud Concepts',
    score: 88,
    delta: 2,
    questions: 29
  }
];

const WEAK_SERVICES: WeakService[] = [
  {
    name: 'Identity and Access Management',
    score: 48,
    questions: 12,
    domain: 'Security and Compliance'
  },
  {
    name: 'AWS Organizations',
    score: 55,
    questions: 9,
    domain: 'Security and Compliance'
  },
  {
    name: 'Amazon S3',
    score: 63,
    questions: 16,
    domain: 'Cloud Technology and Services'
  }
];

const ATTEMPTS = [
  { label: 'Jul 12', score: 54 },
  { label: 'Jul 24', score: 62 },
  { label: 'Aug 03', score: 65 },
  { label: 'Aug 17', score: 71 },
  { label: 'Aug 28', score: 76 }
];

function readVariant(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS.includes(value as Variant) ? (value as Variant) : 'A';
}

function readScenario(): Scenario {
  const value = new URLSearchParams(window.location.search).get('scenario');
  return SCENARIOS.some(item => item.key === value)
    ? (value as Scenario)
    : 'history';
}

function replaceSearchParam(key: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState(null, '', url);
}

function PrototypeState({
  variant,
  scenario,
  lastAction
}: {
  variant: Variant;
  scenario: Scenario;
  lastAction: string;
}) {
  return (
    <output className='mb-4 grid gap-px border-2 border-black bg-black font-mono text-[11px] font-bold uppercase tracking-wider sm:grid-cols-3'>
      <span className='bg-secondary px-3 py-2'>Variant / {variant}</span>
      <span className='bg-white px-3 py-2'>Scenario / {scenario}</span>
      <span className='bg-white px-3 py-2'>Last action / {lastAction}</span>
    </output>
  );
}

function PlacementMarker({ children }: { children: string }) {
  return (
    <span className='inline-flex border-2 border-black bg-secondary px-2 py-1 font-mono text-[11px] font-black uppercase tracking-widest'>
      [ Proposed / {children} ]
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className='h-3 border-2 border-black bg-muted'
      role='meter'
      aria-label={`${score}% correct`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
    >
      <div className='h-full bg-primary' style={{ width: `${score}%` }} />
    </div>
  );
}

function TrendChart({ compact = false }: { compact?: boolean }) {
  const points = ATTEMPTS.map((attempt, index) => {
    const x = 18 + index * 66;
    const y = 104 - (attempt.score - 45) * 2;
    return { ...attempt, x, y };
  });
  const path = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <div>
      <svg
        viewBox='0 0 300 120'
        className={cn('w-full', compact ? 'h-28' : 'h-52')}
        role='img'
        aria-label='Exam score rose from 54 percent to 76 percent over five attempts'
      >
        <line x1='18' y1='54' x2='282' y2='54' stroke='#000' strokeDasharray='5 5' />
        <text x='282' y='49' textAnchor='end' className='fill-black text-[8px] font-bold'>
          PASS 70
        </text>
        <polyline
          points={path}
          fill='none'
          stroke='var(--primary)'
          strokeWidth='5'
          strokeLinejoin='miter'
        />
        {points.map(point => (
          <g key={point.label}>
            <rect
              x={point.x - 5}
              y={point.y - 5}
              width='10'
              height='10'
              fill='var(--secondary)'
              stroke='#000'
              strokeWidth='2'
            />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor='middle'
              className='fill-black text-[8px] font-black'
            >
              {point.score}
            </text>
          </g>
        ))}
      </svg>
      <div className='grid grid-cols-5 border-x-2 border-b-2 border-black font-mono text-[9px] font-bold uppercase'>
        {ATTEMPTS.map(attempt => (
          <span key={attempt.label} className='border-r border-black px-1 py-1 text-center last:border-r-0'>
            {attempt.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendOrBaseline({
  scenario,
  compact = false
}: {
  scenario: Exclude<Scenario, 'anonymous'>;
  compact?: boolean;
}) {
  if (scenario === 'first') {
    return (
      <div className='flex min-h-40 flex-col justify-between border-2 border-black bg-white p-5'>
        <div>
          <span className='font-mono text-xs font-black uppercase tracking-widest'>
            Baseline set
          </span>
          <div className='mt-2 text-6xl font-black tracking-[-0.06em]'>68%</div>
        </div>
        <p className='mt-5 max-w-md text-sm font-bold text-black/65'>
          Finish one more Exam to see movement from this baseline. Your Domain
          and Service results are already useful now.
        </p>
      </div>
    );
  }

  return <TrendChart compact={compact} />;
}

function SignInGate({ mode }: { mode: 'banner' | 'panel' | 'rail' }) {
  return (
    <section
      className={cn(
        'border-2 border-black bg-white shadow-[6px_6px_0px_0px_#000]',
        mode === 'banner' && 'flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center',
        mode === 'panel' && 'mx-auto max-w-3xl p-8 md:p-12',
        mode === 'rail' && 'p-6'
      )}
    >
      <div className={cn(mode === 'panel' && 'text-center')}>
        <LockKeyhole
          className={cn('mb-3 h-7 w-7', mode === 'panel' && 'mx-auto')}
          aria-hidden='true'
        />
        <h2 className={cn('font-black tracking-tight', mode === 'panel' ? 'text-4xl' : 'text-xl')}>
          Your history needs a home.
        </h2>
        <p className='mt-2 max-w-xl font-medium text-black/65'>
          Sign in to claim past Submissions and see your weak Domains, Services,
          and progress over time.
        </p>
      </div>
      <div
        className={cn(
          'flex shrink-0 flex-col gap-3 sm:flex-row',
          mode === 'panel' && 'mt-7 justify-center',
          mode === 'rail' && 'mt-6'
        )}
      >
        <Button type='button'>Continue with Google</Button>
        <Button type='button' variant='outline'>
          Continue with GitHub
        </Button>
      </div>
    </section>
  );
}

function DomainRows({ onAction }: { onAction: (action: string) => void }) {
  return (
    <div className='border-2 border-black bg-black'>
      {DOMAIN_STANDINGS.map((domain, index) => (
        <div
          key={domain.name}
          className='grid gap-3 border-b-2 border-black bg-white p-4 last:border-b-0 md:grid-cols-[1fr_80px_130px]'
        >
          <div>
            <span className='font-mono text-[10px] font-black uppercase tracking-widest'>
              Domain {String(index + 1).padStart(2, '0')} / {domain.questions} answers
            </span>
            <h3 className='mt-1 font-black'>{domain.name}</h3>
          </div>
          <div className='text-left md:text-right'>
            <div className='text-3xl font-black'>{domain.score}%</div>
            <div className='font-mono text-[10px] font-bold text-success'>+{domain.delta} pts</div>
          </div>
          <div className='flex flex-col justify-center gap-2'>
            <ScoreBar score={domain.score} />
            <button
              type='button'
              className='cursor-pointer text-left font-mono text-[10px] font-black uppercase underline underline-offset-2'
              onClick={() => onAction(`Open ${domain.name} drill`)}
            >
              Drill this Domain
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantA({
  scenario,
  onAction
}: {
  scenario: Scenario;
  onAction: (action: string) => void;
}) {
  if (scenario === 'anonymous') {
    return (
      <div className='space-y-8'>
        <PlacementMarker>dashboard top</PlacementMarker>
        <SignInGate mode='banner' />
        <div className='border-t-2 border-dashed border-black pt-6'>
          <span className='font-mono text-xs font-black uppercase tracking-widest'>
            Exam catalog continues below
          </span>
        </div>
      </div>
    );
  }

  const weakest = WEAK_SERVICES[0];

  return (
    <div className='space-y-6'>
      <PlacementMarker>dashboard top</PlacementMarker>
      <section className='grid border-2 border-black bg-black shadow-[6px_6px_0px_0px_#000] lg:grid-cols-[1.05fr_0.95fr]'>
        <div className='bg-secondary p-6 md:p-8'>
          <span className='font-mono text-xs font-black uppercase tracking-widest'>
            Your next move
          </span>
          <h1 className='mt-5 max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-7xl'>
            Fix IAM first.
          </h1>
          <p className='mt-5 max-w-lg font-bold'>
            {weakest.score}% across {weakest.questions} answers. It is your weakest
            Service inside {weakest.domain}.
          </p>
          <Button
            type='button'
            size='lg'
            className='mt-7 bg-black text-white'
            onClick={() => onAction('Start Identity and Access Management drill')}
          >
            Start IAM drill
            <ArrowUpRight aria-hidden='true' />
          </Button>
        </div>
        <div className='bg-white p-6 md:p-8'>
          <div className='mb-5 flex items-end justify-between gap-4'>
            <div>
              <span className='font-mono text-xs font-black uppercase tracking-widest'>
                Current standing
              </span>
              <h2 className='mt-1 text-2xl font-black'>By Domain</h2>
            </div>
            <span className='font-mono text-xs font-black text-success'>+22 pts total</span>
          </div>
          <div className='space-y-4'>
            {DOMAIN_STANDINGS.map(domain => (
              <div key={domain.name}>
                <div className='mb-1 flex justify-between gap-3 text-xs font-bold'>
                  <span>{domain.name}</span>
                  <span>{domain.score}%</span>
                </div>
                <ScoreBar score={domain.score} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='border-2 border-black bg-white p-5'>
          <div className='mb-3 flex items-center justify-between'>
            <h2 className='font-black'>Movement</h2>
            <span className='font-mono text-[10px] font-black uppercase'>Exam score</span>
          </div>
          <TrendOrBaseline scenario={scenario} compact />
        </div>
        <div className='border-2 border-black bg-white'>
          <div className='border-b-2 border-black px-5 py-3'>
            <h2 className='font-black'>Weak Services</h2>
          </div>
          {WEAK_SERVICES.map((service, index) => (
            <button
              type='button'
              key={service.name}
              className='grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-center gap-3 border-b-2 border-black px-4 py-3 text-left last:border-b-0 hover:bg-secondary/35'
              onClick={() => onAction(`Start ${service.name} drill`)}
            >
              <span className='font-mono text-xs font-black'>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <strong className='block text-sm'>{service.name}</strong>
                <span className='text-xs font-medium text-black/60'>
                  {service.questions} answers
                </span>
              </span>
              <span className='text-xl font-black'>{service.score}%</span>
            </button>
          ))}
        </div>
      </section>

      <div className='border-t-2 border-dashed border-black pt-5 font-mono text-xs font-black uppercase tracking-widest'>
        Exam catalog continues below
      </div>
    </div>
  );
}

function VariantB({
  scenario,
  onAction
}: {
  scenario: Scenario;
  onAction: (action: string) => void;
}) {
  if (scenario === 'anonymous') {
    return (
      <div className='min-h-[62vh] border-2 border-black bg-dotgrid p-6 md:p-12'>
        <PlacementMarker>dedicated /progress route</PlacementMarker>
        <div className='mt-12'>
          <SignInGate mode='panel' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-end'>
        <div>
          <PlacementMarker>dedicated /progress route</PlacementMarker>
          <h1 className='mt-4 text-5xl font-black leading-none tracking-[-0.055em] md:text-7xl'>
            76% and climbing.
          </h1>
        </div>
        <div className='border-l-4 border-primary pl-4'>
          <div className='font-mono text-xs font-black uppercase'>Since first Exam</div>
          <div className='text-4xl font-black text-primary'>+22 pts</div>
        </div>
      </div>

      <section className='grid border-2 border-black bg-black shadow-[6px_6px_0px_0px_#000] lg:grid-cols-[1fr_310px]'>
        <div className='bg-white p-5 md:p-8'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-black'>Exam trajectory</h2>
            <span className='font-mono text-[10px] font-black uppercase'>
              CLF-C02 / finished only
            </span>
          </div>
          <TrendOrBaseline scenario={scenario} />
        </div>
        <aside className='bg-secondary p-5 md:p-6'>
          <Target className='h-7 w-7' aria-hidden='true' />
          <h2 className='mt-4 text-2xl font-black'>Weak Services</h2>
          <p className='mt-1 text-sm font-bold text-black/65'>
            Three places where another drill pays off.
          </p>
          <div className='mt-6 space-y-3'>
            {WEAK_SERVICES.map(service => (
              <button
                type='button'
                key={service.name}
                className='w-full cursor-pointer border-2 border-black bg-white p-3 text-left shadow-[3px_3px_0px_0px_#000] transition-[transform,box-shadow] duration-150 ease-[var(--ease-out)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
                onClick={() => onAction(`Start ${service.name} drill`)}
              >
                <span className='block text-sm font-black'>{service.name}</span>
                <span className='mt-2 flex items-center justify-between font-mono text-[10px] font-black uppercase'>
                  <span>{service.questions} answers</span>
                  <span>{service.score}% correct</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-2xl font-black'>Current Domain standing</h2>
          <span className='font-mono text-[10px] font-black uppercase'>Latest snapshot</span>
        </div>
        <DomainRows onAction={onAction} />
      </section>
    </div>
  );
}

function DomainDossier({
  domain,
  index,
  onAction
}: {
  domain: DomainStanding;
  index: number;
  onAction: (action: string) => void;
}) {
  const services = WEAK_SERVICES.filter(service => service.domain === domain.name);

  return (
    <article className='grid border-x-2 border-b-2 border-black bg-white first:border-t-2 md:grid-cols-[76px_1fr_150px]'>
      <div className='flex items-center justify-center border-b-2 border-black bg-black py-4 font-mono text-xl font-black text-white md:border-b-0 md:border-r-2'>
        D-{String(index + 1).padStart(2, '0')}
      </div>
      <div className='p-5'>
        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-start'>
          <div>
            <h2 className='text-xl font-black'>{domain.name}</h2>
            <p className='mt-1 font-mono text-[10px] font-bold uppercase text-black/55'>
              {domain.questions} answers / {domain.delta >= 0 ? '+' : ''}
              {domain.delta} pts
            </p>
          </div>
          <div className='text-4xl font-black'>{domain.score}%</div>
        </div>
        <div className='mt-4'>
          <ScoreBar score={domain.score} />
        </div>
        {services.length > 0 ? (
          <div className='mt-5 grid gap-2 sm:grid-cols-2'>
            {services.map(service => (
              <button
                type='button'
                key={service.name}
                className='cursor-pointer border-2 border-black bg-secondary/45 p-3 text-left hover:bg-secondary'
                onClick={() => onAction(`Start ${service.name} drill`)}
              >
                <span className='block text-sm font-black'>{service.name}</span>
                <span className='mt-1 block font-mono text-[10px] font-bold uppercase'>
                  {service.score}% / Start drill
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className='mt-5 font-mono text-[10px] font-black uppercase text-success'>
            No Service below 65%
          </p>
        )}
      </div>
      <div className='flex flex-col justify-between border-t-2 border-black bg-muted p-4 md:border-l-2 md:border-t-0'>
        <span className='font-mono text-[10px] font-black uppercase'>Current status</span>
        <strong className='my-5 text-xl'>
          {domain.score >= 70 ? 'On target' : 'Needs work'}
        </strong>
        <button
          type='button'
          className='cursor-pointer text-left font-mono text-[10px] font-black uppercase underline underline-offset-4'
          onClick={() => onAction(`Open ${domain.name} drill`)}
        >
          Drill Domain
        </button>
      </div>
    </article>
  );
}

function VariantC({
  scenario,
  onAction
}: {
  scenario: Scenario;
  onAction: (action: string) => void;
}) {
  return (
    <div>
      <div className='flex flex-col justify-between gap-4 border-b-4 border-black pb-5 md:flex-row md:items-end'>
        <div>
          <PlacementMarker>Quiz detail / Progress tab</PlacementMarker>
          <h1 className='mt-4 text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-7xl'>
            Where the score leaks.
          </h1>
        </div>
        <p className='max-w-sm font-bold text-black/65'>
          Domain standing is the index. Weak Services and their drills live
          inside the Domain that explains them.
        </p>
      </div>

      {scenario === 'anonymous' ? (
        <div className='grid gap-6 py-8 lg:grid-cols-[1fr_360px]'>
          <div className='min-h-72 border-2 border-dashed border-black bg-dotgrid' />
          <SignInGate mode='rail' />
        </div>
      ) : (
        <>
          <div className='grid gap-px border-x-2 border-black bg-black sm:grid-cols-3'>
            <div className='bg-secondary p-4'>
              <span className='font-mono text-[10px] font-black uppercase'>Latest Exam</span>
              <div className='text-4xl font-black'>{scenario === 'first' ? '68%' : '76%'}</div>
            </div>
            <div className='bg-white p-4'>
              <span className='font-mono text-[10px] font-black uppercase'>History</span>
              <div className='text-4xl font-black'>{scenario === 'first' ? '1' : '5'}</div>
            </div>
            <div className='bg-white p-4'>
              <span className='font-mono text-[10px] font-black uppercase'>Weak Services</span>
              <div className='text-4xl font-black'>3</div>
            </div>
          </div>
          {scenario === 'first' ? (
            <div className='border-x-2 border-t-2 border-black bg-secondary/35 p-4 text-sm font-bold'>
              Baseline set. Movement appears here after the next finished Exam.
            </div>
          ) : null}
          <div>
            {DOMAIN_STANDINGS.map((domain, index) => (
              <DomainDossier
                key={domain.name}
                domain={domain}
                index={index}
                onAction={onAction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PrototypeSwitcher({
  variant,
  scenario,
  onVariantChange,
  onScenarioChange
}: {
  variant: Variant;
  scenario: Scenario;
  onVariantChange: (variant: Variant) => void;
  onScenarioChange: (scenario: Scenario) => void;
}) {
  const cycle = useCallback(
    (direction: -1 | 1) => {
      const index = VARIANTS.indexOf(variant);
      const next = (index + direction + VARIANTS.length) % VARIANTS.length;
      onVariantChange(VARIANTS[next]);
    },
    [onVariantChange, variant]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycle]);

  if (import.meta.env.PROD) return null;

  return (
    <div className='fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 border-2 border-black bg-white p-2 shadow-[6px_6px_0px_0px_#000]'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center'>
        <div className='grid grid-cols-[44px_1fr_44px] items-center'>
          <button
            type='button'
            aria-label='Previous analytics variant'
            className='flex size-11 cursor-pointer items-center justify-center border-2 border-black bg-black text-white'
            onClick={() => cycle(-1)}
          >
            <ArrowLeft aria-hidden='true' />
          </button>
          <strong className='min-w-48 px-4 text-center font-mono text-xs uppercase'>
            {variant} / {VARIANT_NAMES[variant]}
          </strong>
          <button
            type='button'
            aria-label='Next analytics variant'
            className='flex size-11 cursor-pointer items-center justify-center border-2 border-black bg-black text-white'
            onClick={() => cycle(1)}
          >
            <ArrowRight aria-hidden='true' />
          </button>
        </div>
        <div className='grid flex-1 grid-cols-3 gap-1 md:border-l-2 md:border-black md:pl-2'>
          {SCENARIOS.map(item => (
            <button
              type='button'
              key={item.key}
              className={cn(
                'min-h-11 cursor-pointer border-2 border-black px-2 font-mono text-[10px] font-black uppercase',
                scenario === item.key ? 'bg-secondary' : 'bg-white'
              )}
              onClick={() => onScenarioChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPrototype() {
  const [variant, setVariant] = useState<Variant>(readVariant);
  const [scenario, setScenario] = useState<Scenario>(readScenario);
  const [lastAction, setLastAction] = useState('none');

  const changeVariant = useCallback((next: Variant) => {
    setVariant(next);
    replaceSearchParam('variant', next);
    setLastAction(`switched to ${next}`);
  }, []);

  const changeScenario = useCallback((next: Scenario) => {
    setScenario(next);
    replaceSearchParam('scenario', next);
    setLastAction(`loaded ${next}`);
  }, []);

  return (
    <div className='pb-32'>
      <PrototypeState variant={variant} scenario={scenario} lastAction={lastAction} />
      {variant === 'A' ? <VariantA scenario={scenario} onAction={setLastAction} /> : null}
      {variant === 'B' ? <VariantB scenario={scenario} onAction={setLastAction} /> : null}
      {variant === 'C' ? <VariantC scenario={scenario} onAction={setLastAction} /> : null}
      <PrototypeSwitcher
        variant={variant}
        scenario={scenario}
        onVariantChange={changeVariant}
        onScenarioChange={changeScenario}
      />
    </div>
  );
}
