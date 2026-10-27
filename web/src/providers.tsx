'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/context';
import { LanguageProvider } from './i18n/context';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import type { Language } from './i18n/language';

export const Providers = ({ children, initialLanguage }: {
  children: React.ReactNode;
  initialLanguage: Language;
}) => {
  const [qc] = useState(() => new QueryClient());


  return (
    <QueryClientProvider client={qc}>
      <LanguageProvider initialLanguage={initialLanguage}>
        <AuthProvider>
            <AnimatePresence initial={false}>{children}</AnimatePresence>
        </AuthProvider>
      </LanguageProvider>
      <Toaster
        position='bottom-center'
        toastOptions={{
          classNames: {
            toast:
              'border-2 border-black shadow-[4px_4px_0px_0px_#000] font-bold rounded-none',
            error: 'bg-destructive text-white',
            warning: 'bg-[#ffb020] text-black',
          },
        }}
      />
    </QueryClientProvider>
  );
};
