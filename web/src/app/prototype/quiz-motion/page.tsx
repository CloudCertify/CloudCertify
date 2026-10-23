import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { QuizMotionPrototypePage } = await import('@/screens/quiz-motion-prototype');
  return <QuizMotionPrototypePage />;
}
