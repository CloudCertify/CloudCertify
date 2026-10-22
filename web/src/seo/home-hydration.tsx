import { useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { HydratedContentContext } from '@/lib/static-render-context';
import { HomeSnapshot } from './home-snapshot';

const subscribe = () => () => {};

/** Hydrate the exact build snapshot before applying browser preferences. */
export function HomeHydration({ year, children }: { year: number; children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? (
    <HydratedContentContext.Provider value={true}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </HydratedContentContext.Provider>
  ) : <HomeSnapshot year={year} />;
}
