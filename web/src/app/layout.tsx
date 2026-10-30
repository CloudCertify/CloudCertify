import type { Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/providers';
import { ServiceWorkerRegistration } from '@/pwa/service-worker-registration';
import { getRequestLanguage } from '@/i18n/server';
import { publicMetadata, rootMetadata } from '@/seo/metadata';
import '@/index.css';

export async function generateMetadata() {
  const { title, description } = publicMetadata('/', await getRequestLanguage());
  return { ...rootMetadata, title, description };
}
export const viewport: Viewport = { themeColor: '#f0f9ff', colorScheme: 'light' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const language = await getRequestLanguage();
  return (
    <html lang={language}>
      <body>
        <Providers initialLanguage={language}>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
