import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DrillEngagementPrototypePage } from '@/screens/drill-engagement-prototype';

export const metadata = { robots: { index: false, follow: false } };

// PROTOTYPE (throwaway): three takes on an engaging 15-question Drill Mix,
// switchable via ?variant=A|B|C. Sample questions, in-memory state, no API.
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <Suspense fallback={null}>
      <DrillEngagementPrototypePage />
    </Suspense>
  );
}
