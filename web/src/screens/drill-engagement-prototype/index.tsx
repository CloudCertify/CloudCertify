'use client';

// PROTOTYPE (throwaway). Question: what should an engaging 15-question Drill Mix feel like?
// A is the proposal; B is today's production card on the same sample run, to compare against.
// C carries the same idea into an Exam (deferred correctness, Navigator, Confidence).
// Switch with ?variant=A|B|C on /prototype/drill-engagement, or with the [ and ] keys.
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { PracticeQuestionCard } from '@/components/practice-question-card';
import { useDrillSim, type DrillSim } from './use-drill-sim';
import { Skyline } from './skyline';
import { SkylineExam } from './skyline-exam';

function Current({ sim }: { sim: DrillSim }) {
  return (
    <div className='min-h-dvh bg-background'>
      <AppHeader languageLocked />
      <main id='main-content' tabIndex={-1} className='mx-auto max-w-4xl px-4 py-12'>
        {sim.phase === 'finished' ? (
          <p className='border-4 border-black bg-white p-8 text-2xl font-black'>{sim.score}% ({sim.correctCount} of {sim.total})</p>
        ) : (
          <PracticeQuestionCard
            index={sim.index} total={sim.total} question={sim.question} selectedIds={sim.selectedIds} onSelect={sim.select}
            phase={sim.phase} reveal={sim.reveal} onCheck={sim.check} onContinue={sim.proceed} canCheck={sim.canCheck}
            isChecking={false} isFinishing={false} isLast={sim.isLast}
          />
        )}
      </main>
    </div>
  );
}

const VARIANTS = [
  { key: 'A', name: 'Skyline drill' },
  { key: 'B', name: 'Current drill' },
  { key: 'C', name: 'Skyline exam' }
] as const;

const pill = 'px-2 py-1 hover:bg-white/15 focus-visible:outline-white';

export function DrillEngagementPrototypePage() {
  const router = useRouter();
  const parameters = useSearchParams();
  const found = VARIANTS.findIndex(variant => variant.key === parameters.get('variant')?.toUpperCase());
  const current = found < 0 ? 0 : found;
  const { key, name } = VARIANTS[current];

  function go(step: number) {
    const next = VARIANTS[(current + step + VARIANTS.length) % VARIANTS.length];
    router.replace(`/prototype/drill-engagement?variant=${next.key}`);
  }

  // Brackets, not arrows: an Exam uses Left and Right to move between Questions.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      if (event.key === '[') go(-1);
      if (event.key === ']') go(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const controls = (extra: React.ReactNode) => (
    // Prototype controls, not part of the design. Parked on the right edge, clear of the dock.
    <div className='fixed right-1 top-1/2 z-[100] flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-black/85 px-1 py-2 font-mono text-[11px] text-white opacity-60 shadow-lg hover:opacity-100'>
      <button className={pill} aria-label='Previous variant' onClick={() => go(-1)}><ChevronUp className='size-4' /></button>
      <span className='py-1 [writing-mode:vertical-rl]'>{key} {name}</span>
      <button className={pill} aria-label='Next variant' onClick={() => go(1)}><ChevronDown className='size-4' /></button>
      {extra}
    </div>
  );

  // Keyed so switching variants starts a fresh attempt.
  if (key === 'C') {
    return (
      <SkylineExam
        key={key}
        debug={({ fill, restart }) => controls(
          <>
            <button className={pill} title='Answer every open question' onClick={fill}>fill</button>
            <button className={pill} title='Restart' onClick={restart}>↺</button>
          </>
        )}
      />
    );
  }
  return <DrillHost key={key} Component={key === 'A' ? Skyline : Current} controls={controls} />;
}

function DrillHost({ Component, controls }: { Component: (props: { sim: DrillSim }) => React.ReactNode; controls: (extra: React.ReactNode) => React.ReactNode }) {
  const sim = useDrillSim();
  return (
    <>
      <Component sim={sim} />
      {controls(
        <>
          <button className={pill} title='Pick the right answer' onClick={() => sim.debugAnswer(true)}>✓</button>
          <button className={pill} title='Pick a wrong answer' onClick={() => sim.debugAnswer(false)}>✗</button>
          <button className={pill} title='Jump to results: pass' onClick={() => sim.debugFinish(13)}>87</button>
          <button className={pill} title='Jump to results: fail' onClick={() => sim.debugFinish(8)}>53</button>
          <button className={pill} title='Restart' onClick={sim.restart}>↺</button>
        </>
      )}
    </>
  );
}
