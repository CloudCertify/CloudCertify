import axios from 'axios';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Cloud,
  LockKeyhole,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { AuthMenu } from '@/components/auth-menu';
import { Footer } from '@/components/footer';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/context';
import {
  postQuizQuizIdDrillsDrillIdStart,
  postQuizQuizIdStart,
  useGetMeProgress,
  useGetMeProgressQuizId
} from '@/http/generated/api';
import {
  DrawRule,
  type DomainStandingDto,
  type DrillDto,
  type ProgressDto,
  type QuizDto,
  type TrendPointDto
} from '@/http/generated/api.schemas';
import { useI18n } from '@/i18n/context';

type SelectableQuiz = QuizDto & { id: number };
type StartingTarget = 'exam' | number | null;

function hasId(quiz: QuizDto): quiz is SelectableQuiz {
  return quiz.id != null;
}

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function ProgressShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
        <div className='container flex h-16 items-center justify-between'>
          <Link href='/' className='flex items-center gap-2 text-xl font-black'>
            <div className='flex h-10 w-10 items-center justify-center rounded-[5px] border-2 border-black bg-primary shadow-[2px_2px_0px_0px_#000]'>
              <Cloud className='h-5 w-5 text-white' aria-hidden='true' />
            </div>
            <span>CloudCertify</span>
          </Link>
          <div className='flex items-center gap-4'>
            <LanguageSwitcher />
            <AuthMenu />
            <Button variant='outline' size='sm' asChild>
              <Link href='/dashboard'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                {t.common.backToDashboard}
              </Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
      <Footer />
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const value = Math.min(100, Math.max(0, score));

  return (
    <div
      className='h-3 border-2 border-black bg-muted'
      role='meter'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div className='h-full bg-primary' style={{ width: `${value}%` }} />
    </div>
  );
}

function SignInGate() {
  const { login } = useAuth();
  const { t } = useI18n();

  return (
    <main className='container flex-1 py-8'>
      <div className='min-h-[62vh] border-2 border-black bg-dotgrid p-6 md:p-12'>
        <section className='mx-auto mt-12 max-w-3xl border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_#000] md:p-12'>
          <LockKeyhole className='mx-auto mb-3 h-7 w-7' aria-hidden='true' />
          <h1 className='text-4xl font-black tracking-tight'>
            {t.progress.signInTitle}
          </h1>
          <p className='mx-auto mt-2 max-w-xl font-medium text-black/65'>
            {t.progress.signInBody}
          </p>
          <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
            <Button type='button' onClick={() => login('google')}>
              {t.auth.continueWith('Google')}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => login('github')}
            >
              {t.auth.continueWith('GitHub')}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function PageMessage({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <main className='container flex flex-1 items-center justify-center py-12'>
      <section className='w-full max-w-2xl border-2 border-black bg-white p-8 text-center shadow-[6px_6px_0px_0px_#000]'>
        <Target className='mx-auto h-8 w-8' aria-hidden='true' />
        <h1 className='mt-4 text-3xl font-black'>{title}</h1>
        <p className='mx-auto mt-2 max-w-lg font-medium text-black/65'>{body}</p>
        <div className='mt-6 flex justify-center'>{action}</div>
      </section>
    </main>
  );
}

function ProgressLoading() {
  return (
    <main className='container flex-1 py-8' aria-busy='true'>
      <div className='mb-8 h-28 animate-pulse border-2 border-dashed border-black bg-white' />
      <div className='grid animate-pulse border-2 border-black bg-black lg:grid-cols-2'>
        <div className='h-80 bg-secondary/60' />
        <div className='h-80 bg-white' />
      </div>
    </main>
  );
}

function QuizSelector({
  quizzes,
  selectedQuiz,
  onSelect
}: {
  quizzes: SelectableQuiz[];
  selectedQuiz: SelectableQuiz;
  onSelect: (quizId: number) => void;
}) {
  const { t } = useI18n();

  return (
    <label className='block min-w-0 md:min-w-80'>
      <span className='mb-2 block font-mono text-[10px] font-black uppercase tracking-widest'>
        {t.progress.quizSelector}
      </span>
      <select
        value={selectedQuiz.id}
        onChange={event => onSelect(Number(event.target.value))}
        className='h-12 w-full cursor-pointer border-2 border-black bg-white px-4 font-bold text-black shadow-[4px_4px_0px_0px_#000]'
      >
        {quizzes.map(quiz => (
          <option key={quiz.id} value={quiz.id}>
            {quiz.title ?? quiz.slug ?? `Quiz ${quiz.id}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProgressIntro({
  quizzes,
  selectedQuiz,
  progress,
  onSelect
}: {
  quizzes: SelectableQuiz[];
  selectedQuiz: SelectableQuiz;
  progress: ProgressDto;
  onSelect: (quizId: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div className='flex flex-col justify-between gap-6 border-b-4 border-black pb-7 md:flex-row md:items-end'>
      <div>
        <span className='font-mono text-xs font-black uppercase tracking-widest'>
          {t.progress.eyebrow}
        </span>
        <h1 className='mt-2 text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-7xl'>
          {t.progress.title}
        </h1>
        <p className='mt-4 max-w-xl font-bold text-black/65'>
          {t.progress.subtitle}
        </p>
        <div className='mt-4 flex flex-wrap gap-2 font-mono text-[10px] font-black uppercase tracking-wider'>
          <span className='border-2 border-black bg-white px-3 py-1.5'>
            {t.progress.finishedExams(progress.finishedExams)}
          </span>
          <span className='border-2 border-black bg-white px-3 py-1.5'>
            {t.progress.finishedDrills(progress.finishedDrills)}
          </span>
        </div>
      </div>
      <QuizSelector
        quizzes={quizzes}
        selectedQuiz={selectedQuiz}
        onSelect={onSelect}
      />
    </div>
  );
}

function LeadPanel({
  progress,
  leadDrill,
  starting,
  onStartDrill,
  onStartExam
}: {
  progress: ProgressDto;
  leadDrill: DrillDto | undefined;
  starting: StartingTarget;
  onStartDrill: (drill: DrillDto) => void;
  onStartExam: () => void;
}) {
  const { t } = useI18n();
  const actionableLead =
    progress.lead && leadDrill?.isAvailable ? progress.lead : null;
  const leadStanding = progress.domains.find(
    domain => domain.name === actionableLead
  );

  return (
    <div className='flex flex-col justify-between bg-secondary p-6 md:p-8'>
      <div>
        <span className='font-mono text-xs font-black uppercase tracking-widest'>
          {t.progress.nextMove}
        </span>
        <h2 className='mt-5 max-w-xl text-5xl font-black leading-[0.9] tracking-[-0.055em] md:text-7xl'>
          {actionableLead
            ? t.progress.leadTitle(actionableLead)
            : t.progress.buildBaselineTitle}
        </h2>
        <p className='mt-5 max-w-lg font-bold'>
          {actionableLead && leadStanding
            ? t.progress.leadBody(leadStanding.standing, leadStanding.seen)
            : t.progress.buildBaselineBody}
        </p>
      </div>
      {actionableLead && leadDrill ? (
        <Button
          type='button'
          size='lg'
          className='mt-7 w-fit bg-black text-white'
          disabled={starting !== null}
          onClick={() => onStartDrill(leadDrill)}
        >
          {starting === leadDrill.id
            ? t.common.starting
            : t.progress.startDomainDrill(actionableLead)}
          {starting !== leadDrill.id ? (
            <ArrowUpRight aria-hidden='true' />
          ) : null}
        </Button>
      ) : (
        <Button
          type='button'
          size='lg'
          className='mt-7 w-fit bg-black text-white'
          disabled={starting !== null}
          onClick={onStartExam}
        >
          {starting === 'exam' ? t.common.starting : t.progress.startExam}
          {starting !== 'exam' ? <ArrowRight aria-hidden='true' /> : null}
        </Button>
      )}
    </div>
  );
}

function StandingPanel({ domains }: { domains: DomainStandingDto[] }) {
  const { t } = useI18n();

  return (
    <section className='bg-white p-6 md:p-8' aria-labelledby='standing-title'>
      <div className='mb-5 flex items-end justify-between gap-4'>
        <div>
          <span className='font-mono text-xs font-black uppercase tracking-widest'>
            {t.progress.currentStanding}
          </span>
          <h2 id='standing-title' className='mt-1 text-2xl font-black'>
            {t.progress.byDomain}
          </h2>
        </div>
        <span className='font-mono text-[10px] font-black uppercase'>
          {t.progress.latestSnapshot}
        </span>
      </div>
      {domains.length === 0 ? (
        <p className='border-2 border-dashed border-black p-5 font-bold text-black/65'>
          {t.progress.noDomains}
        </p>
      ) : (
        <div className='space-y-5'>
          {domains.map((domain, index) => (
            <div key={domain.name}>
              <div className='mb-1 flex items-end justify-between gap-3'>
                <div className='min-w-0'>
                  <span className='font-mono text-[9px] font-black uppercase tracking-wider text-black/55'>
                    {t.progress.domainMeta(index + 1, domain.seen)}
                  </span>
                  <h3 className='truncate text-sm font-black'>{domain.name}</h3>
                </div>
                <div className='shrink-0 text-right'>
                  <div className='text-xl font-black'>{domain.standing}%</div>
                  {domain.delta != null ? (
                    <div
                      className={`font-mono text-[9px] font-black uppercase ${
                        domain.delta > 0
                          ? 'text-success'
                          : domain.delta < 0
                            ? 'text-destructive'
                            : 'text-black/55'
                      }`}
                    >
                      {t.progress.delta(domain.delta)}
                    </div>
                  ) : null}
                </div>
              </div>
              <ScoreBar
                score={domain.standing}
                label={t.progress.standingLabel(
                  domain.name,
                  domain.standing
                )}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function chartPoint(
  point: TrendPointDto,
  index: number,
  count: number
): TrendPointDto & { x: number; y: number } {
  const x = count === 1 ? 300 : 36 + index * (528 / (count - 1));
  const percent = Math.min(100, Math.max(0, point.percent));
  const y = 164 - percent * 1.28;
  return { ...point, x, y };
}

function TrendChart({ trend }: { trend: TrendPointDto[] }) {
  const { language, t } = useI18n();
  const points = trend.map((point, index) =>
    chartPoint(point, index, trend.length)
  );
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const dateFormatter = new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric'
  });
  const first = points[0]?.percent ?? 0;
  const last = points.at(-1)?.percent ?? 0;

  return (
    <div className='overflow-x-auto'>
      <div className='min-w-[560px]'>
        <svg
          viewBox='0 0 600 180'
          className='h-52 w-full'
          role='img'
          aria-label={t.progress.trendLabel(first, last, points.length)}
        >
          {[0, 50, 100].map(value => {
            const y = 164 - value * 1.28;
            return (
              <g key={value}>
                <line
                  x1='36'
                  y1={y}
                  x2='564'
                  y2={y}
                  stroke='#000'
                  strokeDasharray={value === 50 ? '5 5' : undefined}
                  strokeOpacity={value === 50 ? 0.35 : 0.16}
                />
                <text
                  x='30'
                  y={y + 3}
                  textAnchor='end'
                  className='fill-black text-[8px] font-bold'
                >
                  {value}
                </text>
              </g>
            );
          })}
          <polyline
            points={line}
            fill='none'
            stroke='var(--primary)'
            strokeWidth='5'
            strokeLinejoin='miter'
          />
          {points.map(point => (
            <g key={point.submissionId}>
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
                y={point.y - 11}
                textAnchor='middle'
                className='fill-black text-[8px] font-black'
              >
                {point.percent}%
              </text>
            </g>
          ))}
        </svg>
        <div
          className='grid border-x-2 border-b-2 border-black font-mono text-[9px] font-bold uppercase'
          style={{
            gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`
          }}
        >
          {points.map(point => (
            <span
              key={point.submissionId}
              className='border-r border-black px-1 py-1 text-center last:border-r-0'
            >
              {dateFormatter.format(new Date(point.createdAt))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovementPanel({
  progress,
  starting,
  onStartExam
}: {
  progress: ProgressDto;
  starting: StartingTarget;
  onStartExam: () => void;
}) {
  const { t } = useI18n();
  const baseline = progress.trend.at(-1)?.percent ?? 0;

  return (
    <section
      className='border-2 border-black bg-white p-5'
      aria-labelledby='movement-title'
    >
      <div className='mb-4 flex items-center justify-between gap-4'>
        <h2 id='movement-title' className='text-xl font-black'>
          {t.progress.movement}
        </h2>
        <span className='font-mono text-[10px] font-black uppercase'>
          {t.progress.examScore}
        </span>
      </div>
      {progress.finishedExams === 0 ? (
        <div className='flex min-h-48 flex-col justify-between border-2 border-black bg-secondary/30 p-5 md:flex-row md:items-end'>
          <div>
            <span className='font-mono text-xs font-black uppercase tracking-widest'>
              {t.progress.noExamEyebrow}
            </span>
            <h3 className='mt-2 text-4xl font-black'>
              {t.progress.firstExamTitle}
            </h3>
            <p className='mt-3 max-w-xl font-bold text-black/65'>
              {t.progress.firstExamBody}
            </p>
          </div>
          <Button
            type='button'
            className='mt-6 md:ml-6 md:mt-0'
            disabled={starting !== null}
            onClick={onStartExam}
          >
            {starting === 'exam' ? t.common.starting : t.progress.startExam}
            {starting !== 'exam' ? <ArrowRight aria-hidden='true' /> : null}
          </Button>
        </div>
      ) : progress.finishedExams === 1 ? (
        <div className='flex min-h-48 flex-col justify-between border-2 border-black bg-white p-5 md:flex-row md:items-end'>
          <div>
            <span className='font-mono text-xs font-black uppercase tracking-widest'>
              {t.progress.baselineSet}
            </span>
            <div className='mt-2 text-6xl font-black tracking-[-0.06em]'>
              {baseline}%
            </div>
            <p className='mt-5 max-w-xl text-sm font-bold text-black/65'>
              {t.progress.baselineBody}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            className='mt-6 md:ml-6 md:mt-0'
            disabled={starting !== null}
            onClick={onStartExam}
          >
            {starting === 'exam'
              ? t.common.starting
              : t.progress.nextExam}
            {starting !== 'exam' ? <ArrowRight aria-hidden='true' /> : null}
          </Button>
        </div>
      ) : (
        <TrendChart trend={progress.trend} />
      )}
    </section>
  );
}

export function ProgressPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [starting, setStarting] = useState<StartingTarget>(null);

  const progressList = useGetMeProgress({
    query: {
      enabled: isAuthenticated,
      retry: false
    }
  });
  const quizzes = (progressList.data?.data ?? []).filter(hasId);
  const selectedQuiz =
    quizzes.find(quiz => quiz.id === selectedQuizId) ?? quizzes[0];
  const quizId = selectedQuiz?.id ?? 0;
  const progressDetail = useGetMeProgressQuizId(quizId, {
    query: {
      enabled: isAuthenticated && progressList.isSuccess && quizId > 0,
      retry: false
    }
  });
  const progress = progressDetail.data?.data;
  const unauthorized =
    !isAuthenticated ||
    isUnauthorized(progressList.error) ||
    isUnauthorized(progressDetail.error);

  const leadDrill = selectedQuiz?.drills?.find(
    drill =>
      drill.drawRule === DrawRule.drill_mix &&
      drill.domain === progress?.lead
  );

  const startExam = async () => {
    if (!selectedQuiz) return;
    setStarting('exam');
    try {
      const response = await postQuizQuizIdStart(selectedQuiz.id, {});
      sessionStorage.setItem(
        `quiz-session-${selectedQuiz.id}`,
        JSON.stringify({ quizDetail: response.data, email: null })
      );
      navigate(`/quiz/${selectedQuiz.id}/session`);
    } catch {
      toast.error(t.progress.startExamError);
      setStarting(null);
    }
  };

  const startDrill = async (drill: DrillDto) => {
    if (!selectedQuiz) return;
    setStarting(drill.id);
    try {
      const response = await postQuizQuizIdDrillsDrillIdStart(
        selectedQuiz.id,
        drill.id,
        {}
      );
      sessionStorage.setItem(
        `drill-session-${selectedQuiz.id}-${drill.id}`,
        JSON.stringify({ drillDetail: response.data, email: null })
      );
      navigate(`/quiz/${selectedQuiz.id}/drill/${drill.id}/session`);
    } catch {
      toast.error(t.progress.startDrillError);
      setStarting(null);
    }
  };

  let content: ReactNode;

  if (unauthorized) {
    content = <SignInGate />;
  } else if (progressList.isLoading) {
    content = <ProgressLoading />;
  } else if (progressList.isError) {
    content = (
      <PageMessage
        title={t.progress.loadErrorTitle}
        body={t.progress.loadErrorBody}
        action={
          <Button type='button' onClick={() => progressList.refetch()}>
            {t.common.tryAgain}
          </Button>
        }
      />
    );
  } else if (quizzes.length === 0) {
    content = (
      <PageMessage
        title={t.progress.emptyTitle}
        body={t.progress.emptyBody}
        action={
          <Button asChild>
            <Link href='/dashboard'>{t.progress.browseQuizzes}</Link>
          </Button>
        }
      />
    );
  } else if (!selectedQuiz || progressDetail.isLoading) {
    content = <ProgressLoading />;
  } else if (progressDetail.isError || !progress) {
    content = (
      <PageMessage
        title={t.progress.loadErrorTitle}
        body={t.progress.detailErrorBody}
        action={
          <Button type='button' onClick={() => progressDetail.refetch()}>
            {t.common.tryAgain}
          </Button>
        }
      />
    );
  } else {
    content = (
      <main className='container flex-1 py-8'>
        <div className='space-y-6'>
          <ProgressIntro
            quizzes={quizzes}
            selectedQuiz={selectedQuiz}
            progress={progress}
            onSelect={setSelectedQuizId}
          />
          <section className='grid border-2 border-black bg-black shadow-[6px_6px_0px_0px_#000] lg:grid-cols-[1.05fr_0.95fr]'>
            <LeadPanel
              progress={progress}
              leadDrill={leadDrill}
              starting={starting}
              onStartDrill={startDrill}
              onStartExam={startExam}
            />
            <StandingPanel domains={progress.domains} />
          </section>
          <MovementPanel
            progress={progress}
            starting={starting}
            onStartExam={startExam}
          />
          <div className='flex items-center gap-3 border-t-2 border-dashed border-black pt-5 font-mono text-xs font-black uppercase tracking-widest'>
            <TrendingUp className='h-4 w-4' aria-hidden='true' />
            {t.progress.finishedOnly}
          </div>
        </div>
      </main>
    );
  }

  return <ProgressShell>{content}</ProgressShell>;
}
