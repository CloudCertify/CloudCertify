import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [
      ...[
        '/progress/:path*', '/auth/:path*', '/quiz', '/quiz/:id/session',
        '/quiz/:id/drill/:drillId/session', '/prototype/:path*'
      ].map(source => ({
        source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }]
      })),
      ...['/service-worker.js', '/offline.html', '/manifest.webmanifest'].map(source => ({
        source, headers: [{ key: 'Cache-Control', value: 'no-cache' }]
      }))
    ];
  }
};

export default config;
