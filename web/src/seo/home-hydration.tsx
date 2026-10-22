import { useSyncExternalStore, type ReactNode } from 'react';
import { HomeSnapshot } from './home-snapshot';

const subscribe = () => () => {};

/** Hydrate the exact build snapshot before applying browser preferences. */
export function HomeHydration({ year, children }: { year: number; children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? children : <HomeSnapshot year={year} />;
}
