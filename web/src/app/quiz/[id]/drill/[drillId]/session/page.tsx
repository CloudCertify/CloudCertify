import type { Metadata } from 'next';
import { DrillSessionPage } from '@/screens/drill-session';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Page() {
  return <DrillSessionPage />;
}
