import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { QuizMotionPrototypePage } from '@/screens/quiz-motion-prototype';

export const metadata = { robots: { index: false, follow: false } };

// Dev-only preview of the quiz components with sample questions.
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <Suspense fallback={null}>
      <QuizMotionPrototypePage />
    </Suspense>
  );
}
