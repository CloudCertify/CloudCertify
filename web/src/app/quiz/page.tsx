import type { Metadata } from 'next';
import { QuizPage } from '@/screens/quiz';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Page() {
  return <QuizPage />;
}
