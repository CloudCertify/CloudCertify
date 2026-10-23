import type { Metadata } from 'next';
import { QuizSessionPage } from '@/screens/quiz-session';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Page() {
  return <QuizSessionPage />;
}
