import { Card } from '@/components/ui/card';
import { Footer } from '@/components/footer';
import { CertificationCard } from '@/components/certification-card';
import { useGetQuiz } from '@/http/generated/api';
import { getLucideIcon } from '@/lib/quiz-icon';
import { AppHeader } from '@/components/app-header';
import { AuthMenu } from '@/components/auth-menu';
import { useI18n } from '@/i18n/context';
import { getLevelStyle, LEVEL_ORDER } from '@/lib/quiz-level';
import { cn } from '@/lib/utils';
import { PROVIDERS } from '@/lib/quiz-provider';
import type {
  QuizDto,
  QuizLevel,
  QuizProvider
} from '@/http/generated/api.schemas';
import { useState } from 'react';

function SkeletonCard() {
  return (
    <Card className='flex flex-col overflow-hidden h-56 animate-pulse'>
      <div className='flex-1 p-6 flex flex-col gap-4'>
        <div className='w-12 h-12 rounded-none bg-muted mx-auto' />
        <div className='h-4 bg-muted rounded-none w-3/4 mx-auto' />
        <div className='h-3 bg-muted rounded-none w-full' />
        <div className='h-3 bg-muted rounded-none w-5/6' />
      </div>
    </Card>
  );
}

type LevelTierProps = {
  level: QuizLevel;
  index: number;
  quizzes: QuizDto[];
  isLast: boolean;
};

function LevelTier({ level, index, quizzes, isLast }: LevelTierProps) {
  const { t } = useI18n();
  const style = getLevelStyle(level);

  return (
    <div className='relative grid grid-cols-[48px_1fr] gap-4 md:grid-cols-[64px_1fr] md:gap-8'>
      {/* Left rail: step marker + dashed connector to the next tier */}
      <div className='relative flex flex-col items-center'>
        <div
          className={cn(
            'relative z-10 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-none border-2 border-black font-mono text-sm md:text-base font-black shadow-[4px_4px_0px_0px_#000]',
            style.bg,
            style.ink
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        {!isLast && (
          <div
            aria-hidden='true'
            className='absolute left-1/2 top-12 md:top-14 h-[calc(100%+3rem)] md:h-[calc(100%+4rem)] w-0 -translate-x-1/2 border-l-2 border-dashed border-black'
          />
        )}
      </div>

      {/* Tier content */}
      <div className='pb-2 min-w-0'>
        <h2 className='mb-4 text-xl md:text-2xl font-black tracking-tight text-black'>
          {t.levels[level]}
        </h2>

        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {quizzes.map(quiz => (
            <CertificationCard
              key={quiz.id}
              title={quiz.title ?? ''}
              description={quiz.description}
              icon={getLucideIcon(quiz.iconName, {
                className: 'h-6 w-6 text-current'
              })}
              difficulty={quiz.quizLevel ?? ''}
              questions={quiz.questionCount ?? 0}
              available={quiz.isAvailable}
              href={`/quiz/${quiz.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProviderTabs({
  provider,
  onSelect
}: {
  provider: QuizProvider;
  onSelect: (provider: QuizProvider) => void;
}) {
  const { t } = useI18n();

  return (
    <div className='inline-flex items-center gap-2 rounded-none border-2 border-black bg-white p-2 shadow-[4px_4px_0px_0px_#000] w-fit'>
      {PROVIDERS.map(p => {
        const isActive = provider === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
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
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const { data, isLoading, isError } = useGetQuiz();
  const [provider, setProvider] = useState<QuizProvider>('aws');
  const quizzes = (data?.data ?? []).filter(q => q.quizProvider === provider);

  const tiers = LEVEL_ORDER.map(level => ({
    level,
    quizzes: quizzes.filter(q => q.quizLevel === level)
  })).filter(tier => tier.quizzes.length > 0);

  // Safety net: quizzes without a known level still need to render somewhere.
  const unleveled = quizzes.filter(
    q => !LEVEL_ORDER.includes(q.quizLevel as QuizLevel)
  );

  const providerLabel = t.providers[provider] ?? provider;

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <AppHeader anonymousActions={<AuthMenu />} />

      <main className='flex-1 container py-8'>
        <div className='flex flex-col gap-8'>
          <div>
            <h1 className='text-3xl font-black tracking-tight text-black'>
              {t.dashboard.title}
            </h1>
            <p className='text-black/70 font-medium mt-1'>
              {t.dashboard.subtitle}
            </p>
          </div>

          <ProviderTabs provider={provider} onSelect={setProvider} />

          {isError && (
            <Card className='p-8 text-center'>
              <p className='text-muted-foreground'>{t.dashboard.loadError}</p>
            </Card>
          )}

          {!isError &&
            (isLoading ? (
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : tiers.length === 0 && unleveled.length === 0 ? (
              <Card className='p-8 text-center'>
                <p className='text-muted-foreground'>
                  {t.dashboard.empty(providerLabel)}
                </p>
              </Card>
            ) : (
              <div className='space-y-12 md:space-y-16'>
                {tiers.map((tier, index) => (
                  <LevelTier
                    key={tier.level}
                    level={tier.level}
                    index={index}
                    quizzes={tier.quizzes}
                    isLast={index === tiers.length - 1}
                  />
                ))}
                {unleveled.length > 0 && (
                  <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {unleveled.map(quiz => (
                      <CertificationCard
                        key={quiz.id}
                        title={quiz.title ?? ''}
                        description={quiz.description}
                        icon={getLucideIcon(quiz.iconName, {
                          className: 'h-6 w-6 text-current'
                        })}
                        difficulty={quiz.quizLevel ?? ''}
                        questions={quiz.questionCount ?? 0}
                        available={quiz.isAvailable}
                        href={`/quiz/${quiz.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
