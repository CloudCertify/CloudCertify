import { useMemo, useState } from 'react';
import { ArrowRight, Clock, Lock } from 'lucide-react';
import { Link } from 'wouter';

import { cn } from '@/lib/utils';
import { getLucideIcon } from '@/lib/quiz-icon';
import { PROVIDERS } from '@/lib/quiz-provider';
import { LEVEL_ORDER } from '@/lib/quiz-level';
import { useI18n } from '@/i18n/context';
import type {
  QuizDto,
  QuizLevel,
  QuizProvider
} from '@/http/generated/api.schemas';

type TierStyle = {
  label: string;
  marker: string;
  accent: string;
  nodeBg: string;
  nodeIcon: string;
};

const TIER_STYLES: Record<QuizLevel, TierStyle> = {
  foundational: {
    label: 'text-black',
    marker: 'border-black bg-success text-white',
    accent: 'bg-success',
    nodeBg: 'bg-success',
    nodeIcon: 'text-white'
  },
  associate: {
    label: 'text-black',
    marker: 'border-black bg-primary text-white',
    accent: 'bg-primary',
    nodeBg: 'bg-primary',
    nodeIcon: 'text-white'
  },
  specialist: {
    label: 'text-black',
    marker: 'border-black bg-secondary text-black',
    accent: 'bg-secondary',
    nodeBg: 'bg-secondary',
    nodeIcon: 'text-black'
  },
  professional: {
    label: 'text-black',
    marker: 'border-black bg-destructive text-white',
    accent: 'bg-destructive',
    nodeBg: 'bg-destructive',
    nodeIcon: 'text-white'
  }
};

type Tier = {
  number: string;
  level: QuizLevel;
};

// Same ladder the Dashboard renders, so the two can't drift apart.
const TIERS: Tier[] = LEVEL_ORDER.map((level, index) => ({
  number: String(index + 1).padStart(2, '0'),
  level
}));


type CertificationRoadmapProps = {
  quizzes: QuizDto[];
  isLoading?: boolean;
};

export function CertificationRoadmap({
  quizzes,
  isLoading
}: CertificationRoadmapProps) {
  const { t } = useI18n();
  const [provider, setProvider] = useState<QuizProvider>('aws');

  const grouped = useMemo(() => {
    const filtered = quizzes.filter(q => q.quizProvider === provider);
    return TIERS.map(tier => ({
      ...tier,
      quizzes: filtered.filter(q => q.quizLevel === tier.level)
    }));
  }, [quizzes, provider]);

  return (
    <div className='mx-auto max-w-5xl'>
      {/* Provider tabs */}
      <div className='flex items-center justify-center gap-2 mb-10'>
        <div className='inline-flex items-center gap-2 rounded-none border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_#000]'>
          {PROVIDERS.map(p => {
            const isActive = provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-none px-4 py-2 text-sm font-bold transition-all border-2',
                  isActive
                    ? 'bg-primary text-white border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'text-black border-transparent hover:bg-background'
                )}
              >
                <span>{p.short}</span>
                {!p.available && (
                  <span className='rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-black bg-secondary text-black'>
                    {t.common.soon}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roadmap body */}
      <div className='relative'>
        <div className='space-y-12 md:space-y-16'>
          {grouped.map((tier, tierIndex) => (
            <TierRow
              key={tier.level}
              tier={tier}
              styles={TIER_STYLES[tier.level]}
              isLast={tierIndex === grouped.length - 1}
              isLoading={isLoading}
              providerAvailable={
                PROVIDERS.find(p => p.id === provider)?.available ?? false
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type TierRowProps = {
  tier: Tier & { quizzes: QuizDto[] };
  styles: TierStyle;
  isLast: boolean;
  isLoading?: boolean;
  providerAvailable: boolean;
};

function TierRow({
  tier,
  styles,
  isLast,
  isLoading,
  providerAvailable
}: TierRowProps) {
  const { t } = useI18n();

  return (
    <div className='relative grid grid-cols-[48px_1fr] gap-4 md:grid-cols-[64px_1fr] md:gap-8'>
      {/* Left rail: number marker + dashed connector */}
      <div className='relative flex flex-col items-center'>
        <div
          className={cn(
            'relative z-10 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-none border-2 font-mono text-sm md:text-base font-black shadow-[4px_4px_0px_0px_#000]',
            styles.marker
          )}
        >
          {tier.number}
        </div>
        {!isLast && (
          <div
            aria-hidden='true'
            className='absolute left-1/2 top-12 md:top-14 h-[calc(100%+3rem)] md:h-[calc(100%+4rem)] w-0 -translate-x-1/2 border-l-2 border-dashed border-black'
          />
        )}
      </div>

      {/* Right content */}
      <div className='pb-2 min-w-0'>
        <h4
          className={cn(
            'mb-4 text-xl md:text-2xl font-black tracking-tight',
            styles.label
          )}
        >
          {t.levels[tier.level]}
        </h4>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {isLoading ? (
            <>
              <NodeSkeleton />
              <NodeSkeleton />
              <NodeSkeleton />
            </>
          ) : tier.quizzes.length > 0 ? (
            tier.quizzes.map(quiz => (
              <CertificationNode
                key={quiz.id}
                quiz={quiz}
                styles={styles}
              />
            ))
          ) : (
            <EmptyTierCard providerAvailable={providerAvailable} />
          )}
        </div>
      </div>
    </div>
  );
}

function CertificationNode({
  quiz,
  styles
}: {
  quiz: QuizDto;
  styles: TierStyle;
}) {
  const { t } = useI18n();
  const soon = t.common.soon;
  const available = quiz.isAvailable ?? false;
  const { code, name } = splitTitle(quiz.title ?? '');

  const content = (
    <>
      {/* Tier color accent stripe */}
      <div
        aria-hidden='true'
        className={cn(
          'absolute left-0 top-0 h-full w-2 rounded-none',
          available ? styles.accent : 'bg-gray-300'
        )}
      />

      <div className='flex items-start gap-3 pl-2'>
        <div
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-2 border-black',
            available ? styles.nodeBg : 'bg-gray-200'
          )}
        >
          {available ? (
            getLucideIcon(quiz.iconName, {
              className: cn('h-5 w-5', styles.nodeIcon)
            })
          ) : (
            <Lock className='h-4 w-4 text-black/50' />
          )}
        </div>

        <div className='min-w-0 flex-1'>
          {code && (
            <div className='font-mono text-[11px] font-bold uppercase tracking-wider text-black/60'>
              {code}
            </div>
          )}
          <h5 className='text-sm font-bold leading-snug text-balance text-black'>
            {name}
          </h5>
        </div>

        {available ? (
          <ArrowRight
            className='h-4 w-4 shrink-0 mt-3 transition-transform group-hover:translate-x-1 text-black'
          />
        ) : (
          <span className='rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-black bg-secondary text-black shrink-0 self-start'>
            {soon}
          </span>
        )}
      </div>
    </>
  );

  const baseClasses = cn(
    'group relative flex overflow-hidden rounded-none border-2 border-black bg-white p-4 transition-all',
    available
      ? 'shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] cursor-pointer'
      : 'border-dashed opacity-70'
  );

  if (available) {
    return (
      <Link href={`/quiz/${quiz.id}`} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

function NodeSkeleton() {
  return (
    <div className='h-24 animate-pulse rounded-none border-2 border-dashed border-black bg-gray-100' />
  );
}

function EmptyTierCard({ providerAvailable }: { providerAvailable: boolean }) {
  const { t } = useI18n();

  return (
    <div className='col-span-full flex items-center gap-3 rounded-none border-2 border-dashed border-black bg-white p-6 text-sm font-medium text-black/70'>
      <Clock className='h-4 w-4 shrink-0 text-black' />
      <span>
        {providerAvailable ? t.roadmap.emptyTier : t.roadmap.providerSoon}
      </span>
    </div>
  );
}

/**
 * Split a quiz title like "AWS Certified Cloud Practitioner (CLF-C02)" into
 * { name: "AWS Certified Cloud Practitioner", code: "CLF-C02" }.
 */
function splitTitle(title: string): { name: string; code: string | null } {
  const match = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), code: match[2].trim() };
  }
  return { name: title, code: null };
}
