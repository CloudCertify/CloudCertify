import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { Router } from 'wouter';
import { AuthContext, type AuthContextValue } from '@/auth/auth-context';
import { FALLBACK_I18N, I18nContext } from '@/i18n/i18n-context';
import { StaticRenderContext } from '@/lib/static-render-context';
import { HomePage } from '@/pages/home';

const anonymous: AuthContextValue = {
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  completeLogin: () => {}
};

/** Same public components and copy, with no auth/storage/API reads. */
export function HomeSnapshot({ year }: { year: number }) {
  const [queryClient] = useState(() => new QueryClient());
  const t = FALLBACK_I18N.t;
  const language = {
    ...FALLBACK_I18N,
    t: { ...t, footer: { ...t.footer, rights: () => t.footer.rights(year) } }
  };
  return (
    <QueryClientProvider client={queryClient}>
      <I18nContext.Provider value={language}>
        <AuthContext.Provider value={anonymous}>
          <Router ssrPath='/'>
            <StaticRenderContext.Provider value={true}>
              <MotionConfig isStatic>
                <AnimatePresence initial={false}>
                  <HomePage key='home' />
                </AnimatePresence>
              </MotionConfig>
            </StaticRenderContext.Provider>
          </Router>
        </AuthContext.Provider>
      </I18nContext.Provider>
    </QueryClientProvider>
  );
}
