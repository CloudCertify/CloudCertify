import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle,
  Cloud,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import RotatingText from '@/components/RotatingText';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/footer';
import { CertificationRoadmap } from '@/components/certification-roadmap';
import { Reveal, CountUp } from '@/components/reveal';
import { Marquee } from '@/components/marquee';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useGetQuiz } from '@/http/generated/api';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n } from '@/i18n/context';
import type { QuestionDifficulty } from '@/http/generated/api.schemas';

const EASE = [0.22, 1, 0.36, 1] as const;

export function HomePage() {
  const { t } = useI18n();
  const { data, isLoading } = useGetQuiz();
  const quizzes = data?.data ?? [];

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='sticky top-0 z-50 w-full border-b-2 border-black bg-white'>
        <div className='container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0'>
          <Link href='/' className='flex gap-2 items-center text-xl font-black'>
            <div className='h-10 w-10 rounded-[5px] border-2 border-black bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_#000]'>
              <Cloud className='h-5 w-5 text-white' />
            </div>
            <span>CloudCertify</span>
          </Link>
          <div className='flex flex-1 items-center justify-end'>
            <nav className='flex items-center space-x-6'>
              <a
                href='#certifications'
                className='hidden text-sm font-bold text-black transition-colors hover:underline sm:inline'
              >
                {t.nav.certifications}
              </a>
              <a
                href='#pricing'
                className='hidden text-sm font-bold text-black transition-colors hover:underline sm:inline'
              >
                {t.nav.pricing}
              </a>
              <LanguageSwitcher />
              <Button asChild size='sm'>
                <a href='/dashboard'>{t.common.dashboard}</a>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className='flex-1'>
        {/* ---------------------------------------------------------------- HERO */}
        <section
          id='hero'
          className='relative w-full overflow-hidden border-b-2 border-black bg-white bg-dotgrid'
        >
          <div
            aria-hidden='true'
            className='pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl'
          />
          <div className='container relative px-4 py-16 md:px-6 md:py-24 lg:py-28'>
            <div className='grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]'>
              {/* copy */}
              <div className='max-w-2xl'>
                <Reveal>
                  <span className='inline-flex items-center gap-2 rounded-[5px] border-2 border-black bg-secondary px-3 py-1 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_#000]'>
                    <Sparkles className='h-3.5 w-3.5' />
                    {t.home.heroBadge}
                  </span>
                </Reveal>

                <Reveal delay={0.08}>
                  <h1 className='mt-6 text-5xl font-black leading-[0.92] tracking-tight text-black sm:text-6xl lg:text-7xl'>
                    {t.home.heroTitleLead}
                    {/* PT reads "certificação [AWS]", EN "[AWS] cert" — the
                        chip swaps sides so both stay grammatical. */}
                    <span className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-2'>
                      {!t.home.heroTitleChipFirst && (
                        <span>{t.home.heroTitleCert}</span>
                      )}
                      <span className='inline-block -rotate-1 rounded-[6px] border-2 border-black bg-primary px-3 py-1 text-white shadow-[5px_5px_0px_0px_#000]'>
                        <RotatingText
                          texts={['AWS', 'GCP', 'Azure']}
                          mainClassName='text-white'
                          splitLevelClassName='overflow-hidden'
                          staggerFrom='last'
                          staggerDuration={0.025}
                          initial={{ y: '100%' }}
                          animate={{ y: 0 }}
                          exit={{ y: '-120%' }}
                          transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 400
                          }}
                          rotationInterval={2000}
                          splitBy='characters'
                          auto
                          loop
                        />
                      </span>
                      {t.home.heroTitleChipFirst && (
                        <span>{t.home.heroTitleCert}</span>
                      )}
                    </span>
                    <span className='mt-3 block'>{t.home.heroTitleTail}</span>
                  </h1>
                </Reveal>

                <Reveal delay={0.16}>
                  <p className='mt-6 max-w-md text-lg font-medium text-black/70'>
                    {t.home.heroSubtitle}
                  </p>
                </Reveal>

                <Reveal delay={0.24}>
                  <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                    <Button asChild size='lg'>
                      <Link href='/dashboard'>
                        {t.home.heroPrimaryCta}
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </Link>
                    </Button>
                    <Button size='lg' variant='outline' asChild>
                      <a href='#certifications'>{t.home.heroSecondaryCta}</a>
                    </Button>
                  </div>
                </Reveal>
              </div>

              {/* animated sticker cluster */}
              <HeroCluster />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- MARQUEE */}
        <Marquee className='bg-secondary py-3 text-black' items={t.home.marquee} />

        {/* --------------------------------------------------------------- STATS */}
        <section className='w-full border-b-2 border-black bg-primary'>
          <div className='container grid grid-cols-2 divide-x-2 divide-y-2 divide-black border-x-0 md:grid-cols-4 md:divide-y-0'>
            <Stat value={500} suffix='+' label={t.home.stats.questions} />
            <Stat value={9} label={t.home.stats.paths} />
            <Stat value={3} label={t.home.stats.providers} />
            <Stat value={0} prefix='$' label={t.home.stats.price} />
          </div>
        </section>

        {/* ------------------------------------------------------ CERTIFICATIONS */}
        <section
          className='w-full py-12 md:py-24 lg:py-28 relative overflow-hidden bg-background'
          id='certifications'
        >
          <div className='container px-4 md:px-6'>
            <Reveal className='mb-10 max-w-xl'>
              <span className='text-xs font-black uppercase tracking-widest text-primary'>
                {t.home.roadmapEyebrow}
              </span>
              <h2 className='mt-2 text-3xl font-black tracking-tight md:text-4xl text-balance text-black'>
                {t.home.roadmapTitle}
              </h2>
              <p className='mt-2 font-medium text-black/60'>
                {t.home.roadmapSubtitle}
              </p>
            </Reveal>
            <CertificationRoadmap quizzes={quizzes} isLoading={isLoading} />
          </div>
        </section>

        {/* --------------------------------------------------------- SAMPLE QUIZ */}
        <section className='w-full border-y-2 border-black bg-white bg-dotgrid py-12 md:py-24 lg:py-28'>
          <div className='container px-4 md:px-6'>
            <Reveal className='mb-8 max-w-xl'>
              <h2 className='text-3xl font-black tracking-tight md:text-4xl text-black'>
                {t.home.sampleTitle}
              </h2>
              <p className='mt-2 font-medium text-black/60'>
                {t.home.sampleSubtitle}
              </p>
            </Reveal>
            <div className='mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2'>
              {t.home.sampleQuestions.map((q, i) => (
                <Reveal key={q.question} delay={i * 0.08} y={36}>
                  <QuizCard {...q} correctAnswer={SAMPLE_CORRECT_ANSWERS[i]} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- PRICING */}
        <section
          className='w-full py-12 md:py-24 lg:py-28 bg-background'
          id='pricing'
        >
          <div className='container px-4 md:px-6'>
            <Reveal className='mb-8 text-center'>
              <h2 className='text-3xl font-black tracking-tight md:text-4xl text-black'>
                {t.home.pricingTitle}
              </h2>
              <p className='mx-auto mt-2 max-w-175 font-medium text-black/60 md:text-lg'>
                {t.home.pricingSubtitle}
              </p>
            </Reveal>
            <Reveal className='mx-auto max-w-md' y={36}>
              <Card className='overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white'>
                <CardHeader className='pb-4 pt-8 text-center'>
                  <div className='flex items-end justify-center gap-1'>
                    <span className='text-7xl font-black leading-none text-black'>
                      $0
                    </span>
                    <span className='mb-2 text-sm font-bold text-black/50'>
                      {t.home.pricingPeriod}
                    </span>
                  </div>
                  <p className='mt-2 font-bold text-black/70'>
                    {t.home.pricingNote}
                  </p>
                </CardHeader>
                <CardContent className='p-6'>
                  <ul className='space-y-3'>
                    {t.home.pricingPerks.map(perk => (
                      <li key={perk} className='flex items-center gap-3'>
                        <div className='h-6 w-6 rounded-[5px] border-2 border-black bg-success flex items-center justify-center shrink-0'>
                          <CheckCircle className='h-4 w-4 text-white' />
                        </div>
                        <span className='font-medium text-black'>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className='p-6 pt-0'>
                  <Button asChild size='lg' className='w-full'>
                    <Link href='/dashboard'>{t.home.pricingCta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ FEATURES */}
        <section
          className='w-full py-12 md:py-24 lg:py-28 bg-white border-t-2 border-black'
          id='features'
        >
          <div className='container px-4 md:px-6'>
            <div className='grid gap-10 lg:grid-cols-2 lg:gap-16 items-center'>
              <div className='space-y-6'>
                <Reveal>
                  <Badge>{t.home.featuresBadge}</Badge>
                  <h2 className='mt-4 text-3xl font-black tracking-tight md:text-4xl text-black'>
                    {t.home.featuresTitle}
                  </h2>
                  <p className='mt-3 font-medium text-black/70 md:text-lg'>
                    {t.home.featuresSubtitle}
                  </p>
                </Reveal>
                <div className='space-y-4'>
                  {t.home.features.map((f, i) => (
                    <Reveal key={f.title} delay={i * 0.08}>
                      <div className='group flex items-start gap-4 rounded-[5px] border-2 border-black bg-background p-4 shadow-[4px_4px_0px_0px_#000] transition-transform duration-200 hover:-translate-y-1'>
                        <div className='h-9 w-9 shrink-0 rounded-[5px] border-2 border-black bg-success flex items-center justify-center transition-transform duration-200 group-hover:-rotate-6'>
                          <CheckCircle className='h-5 w-5 text-white' />
                        </div>
                        <div>
                          <h3 className='font-black text-black'>{f.title}</h3>
                          <p className='font-medium text-black/70'>{f.body}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              <Reveal y={40} rotate={2} className='flex justify-center'>
                <div className='relative w-full max-w-md rounded-[5px] border-4 border-black bg-white p-2 shadow-[8px_8px_0px_0px_#000]'>
                  <div className='flex flex-col items-center justify-center space-y-6 rounded-[5px] border-2 border-black bg-primary p-8'>
                    <motion.div
                      animate={{ rotate: [0, -6, 6, 0] }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className='flex h-20 w-20 items-center justify-center rounded-[5px] border-2 border-black bg-secondary shadow-[4px_4px_0px_0px_#000]'
                    >
                      <Award className='h-10 w-10 text-black' />
                    </motion.div>
                    <div className='space-y-2 text-center'>
                      <h3 className='text-2xl font-black text-white'>
                        {t.home.ctaCardTitle}
                      </h3>
                      <p className='font-medium text-white/80'>
                        {t.home.ctaCardBody}
                      </p>
                    </div>
                    <Button asChild size='lg' variant='outline' className='w-full'>
                      <Link href='/dashboard'>{t.home.pricingCta}</Link>
                    </Button>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ HERO ART */

function HeroCluster() {
  const { t } = useI18n();
  const answers = [
    { text: 'Amazon EC2', ok: false },
    { text: 'AWS Fargate', ok: true },
    { text: 'Amazon EKS', ok: false }
  ];

  return (
    <div className='relative mx-auto h-[400px] w-full max-w-sm lg:h-[440px] lg:max-w-md'>
      {/* back accent card */}
      <motion.div
        aria-hidden='true'
        initial={{ opacity: 0, y: 40, rotate: -10 }}
        whileInView={{ opacity: 1, y: 0, rotate: -6 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
        className='absolute inset-x-8 top-12 h-72 rounded-[8px] border-2 border-black bg-secondary shadow-[8px_8px_0px_0px_#000]'
      />

      {/* main mock quiz card */}
      <motion.div
        initial={{ opacity: 0, y: 56, rotate: 6 }}
        whileInView={{ opacity: 1, y: 0, rotate: -2 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className='absolute inset-x-0 top-2 rounded-[8px] border-2 border-black bg-white p-5 shadow-[12px_12px_0px_0px_#000]'
      >
        <div className='flex items-center justify-between'>
          <span className='rounded-[5px] border-2 border-black bg-primary px-2 py-0.5 text-[11px] font-black uppercase text-white'>
            AWS · SAA
          </span>
          <span className='font-mono text-xs font-bold tabular-nums text-black/50'>
            Q 07 / 65
          </span>
        </div>
        <p className='mt-4 text-sm font-bold leading-snug text-black'>
          {t.home.heroMockQuestion}
        </p>
        <div className='mt-4 space-y-2'>
          {answers.map((a, i) => (
            <motion.div
              key={a.text}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: EASE }}
              className={cn(
                'flex items-center gap-2 rounded-[5px] border-2 border-black px-3 py-2 text-xs font-bold',
                a.ok
                  ? 'bg-primary text-white shadow-none'
                  : 'bg-white text-black shadow-[3px_3px_0px_0px_#000]'
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-[3px] border-2 border-black',
                  a.ok ? 'bg-black text-white' : 'bg-white'
                )}
              >
                {a.ok && <CheckCircle className='h-3 w-3' />}
              </span>
              {a.text}
            </motion.div>
          ))}
        </div>
        <div className='mt-4 h-2.5 w-full overflow-hidden rounded-[4px] border-2 border-black bg-white'>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: '62%' }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
            className='h-full bg-success'
          />
        </div>
      </motion.div>

      {/* floating stickers */}
      <FloatSticker position='-left-3 top-4' className='bg-primary text-white -rotate-12' delay={0}>
        AWS
      </FloatSticker>
      <FloatSticker position='-right-2 top-28' className='bg-white text-black rotate-6' delay={0.6}>
        Azure
      </FloatSticker>
      <FloatSticker position='-left-1 bottom-6' className='bg-success text-white rotate-3' delay={0.3}>
        GCP
      </FloatSticker>
      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 12 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 12 }}
        className='absolute -right-4 -top-3 z-20 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-secondary text-center text-[11px] font-black uppercase leading-tight shadow-[4px_4px_0px_0px_#000]'
      >
        {t.home.heroFreeSticker[0]}
        <br />
        {t.home.heroFreeSticker[1]}
      </motion.div>
    </div>
  );
}

function FloatSticker({
  children,
  position,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  position: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn('absolute z-20', position)}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 + delay, type: 'spring', stiffness: 280, damping: 14 }}
    >
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay
        }}
        className={cn(
          'rounded-[6px] border-2 border-black px-3 py-1.5 text-sm font-black shadow-[4px_4px_0px_0px_#000]',
          className
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Stat({
  value,
  label,
  prefix,
  suffix
}: {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <Reveal className='px-6 py-8 text-center md:py-10'>
      <div className='text-4xl font-black text-white md:text-5xl'>
        <CountUp to={value} prefix={prefix} suffix={suffix} />
      </div>
      <div className='mt-1 text-xs font-bold uppercase tracking-wide text-white/70'>
        {label}
      </div>
    </Reveal>
  );
}

/* -------------------------------------------------------------------- DATA */

// Answer index per sample question — positional, so it stays in step with
// `t.home.sampleQuestions` in every locale (option order never changes).
const SAMPLE_CORRECT_ANSWERS = [2, 2, 2, 1];

type QuizCardProps = {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: QuestionDifficulty;
};

function QuizCard({
  question,
  options,
  correctAnswer,
  category,
  difficulty
}: QuizCardProps) {
  const { t } = useI18n();

  return (
    <Card className='h-full overflow-hidden bg-white transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-0.5deg] hover:shadow-[8px_8px_0px_0px_#000]'>
      <CardHeader className='pb-2'>
        <div className='flex justify-between mb-2'>
          <Badge variant='outline'>{category}</Badge>
          <Badge
            variant={
              difficulty === 'easy'
                ? 'outline'
                : difficulty === 'medium'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {t.difficulty[difficulty]}
          </Badge>
        </div>
        <CardTitle className='text-lg'>{question}</CardTitle>
      </CardHeader>
      <CardContent className='pb-2'>
        <div className='space-y-2'>
          {options.map((option, index) => (
            <div
              key={index}
              className={`p-3 rounded-[5px] border-2 border-black font-medium ${
                index === correctAnswer
                  ? 'bg-success shadow-none translate-x-[2px] translate-y-[2px]'
                  : 'bg-white shadow-[4px_4px_0px_0px_#000]'
              } flex items-start gap-2`}
            >
              <div
                className={`w-6 h-6 rounded-[5px] flex items-center justify-center border-2 border-black mt-0.5 ${
                  index === correctAnswer ? 'bg-black text-white' : 'bg-white'
                }`}
              >
                {index === correctAnswer && <CheckCircle className='h-4 w-4' />}
              </div>
              <span className={index === correctAnswer ? 'text-white' : 'text-black'}>
                {option}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className='flex justify-between'>
        <Button variant='outline'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          {t.common.previous}
        </Button>
        <Button>
          {t.common.next}
          <ArrowRight className='ml-2 h-4 w-4' />
        </Button>
      </CardFooter>
    </Card>
  );
}
