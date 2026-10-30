import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', SITE_ORIGIN).href
  };
}
