import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  // Dev only: lets a phone on the same network load the dev server by LAN address.
  // Without it Next refuses its dev assets cross-origin and the page never hydrates.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*']
};

export default config;
