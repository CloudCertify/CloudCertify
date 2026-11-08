'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * PROTOTYPE: floating bar that cycles `?variant=` on the current route. Dev only.
 * Arrow keys cycle too, except while typing in a field.
 */
export function PrototypeSwitcher({
  variants
}: {
  variants: { key: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('variant') ?? variants[0].key;
  const index = Math.max(0, variants.findIndex(v => v.key === current));

  const go = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams);
    params.set('variant', next.key);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className='fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-2 py-1.5 font-mono text-xs text-white shadow-2xl ring-2 ring-fuchsia-500'>
      <button type='button' onClick={() => go(-1)} className='rounded-full px-2 py-1 hover:bg-white/15' aria-label='Previous variant'>←</button>
      <span className='px-2 whitespace-nowrap'>
        {variants[index].key} ({variants[index].name})
      </span>
      <button type='button' onClick={() => go(1)} className='rounded-full px-2 py-1 hover:bg-white/15' aria-label='Next variant'>→</button>
    </div>
  );
}
