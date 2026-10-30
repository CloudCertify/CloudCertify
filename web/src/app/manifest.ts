import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'CloudCertify',
    short_name: 'CloudCertify',
    description: 'Practice exams and domain drills for cloud certifications.',
    lang: 'en-US',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f3ec',
    theme_color: '#2347d9',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
