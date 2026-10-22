import type { QuizDto } from '@/http/generated/api.schemas';
import { MESSAGES } from '@/i18n/i18n-context';
import type { Language } from '@/i18n/language';

// API/Program.cs identifies this frontend; verified against its live SPA.
export const SITE_ORIGIN = 'https://cloudcertify.snowye.dev';

const COPY = {
  'en-US': {
    title: 'CloudCertify | Cloud certification practice',
    description:
      'Practice cloud certification exams and focused domain drills. Review explanations and your results with CloudCertify.'
  },
  'pt-BR': {
    title: 'CloudCertify | Prática para certificações em nuvem',
    description:
      'Pratique com simulados de certificação em nuvem e treinos por domínio. Revise explicações e seus resultados com o CloudCertify.'
  }
} satisfies Record<Language, { title: string; description: string }>;

export function getPublicQuizId(path: string): number {
  const match = /^\/quiz\/([1-9]\d*)\/?$/.exec(path);
  const id = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : 0;
}

export function getPageMetadata(
  path: string,
  language: Language,
  quiz?: QuizDto,
  quizFailed = false
) {
  const copy = COPY[language];
  const t = MESSAGES[language];
  const isHome = path === '/';
  const isCatalog = /^\/dashboard\/?$/.test(path);
  const quizId = getPublicQuizId(path);
  const hasQuiz = Boolean(quizId && quiz?.title?.trim());
  const isPublic = isHome || isCatalog || Boolean(quizId && !quizFailed);
  const canonical = isHome
    ? `${SITE_ORIGIN}/`
    : isCatalog
      ? `${SITE_ORIGIN}/dashboard`
      : hasQuiz && !quizFailed
        ? `${SITE_ORIGIN}/quiz/${quizId}`
        : undefined;
  const title = isCatalog
    ? `${t.dashboard.title} | CloudCertify`
    : hasQuiz
      ? `${quiz?.title} | CloudCertify`
      : path === '/progress'
        ? `${t.common.progress} | CloudCertify`
        : copy.title;
  const description = isCatalog
    ? t.dashboard.subtitle
    : hasQuiz
      ? quiz?.description?.trim() || t.quizDetail.fullExamBody
      : copy.description;

  return {
    title,
    description,
    canonical,
    // Pending public quizzes must remain renderable. Add noindex on failure,
    // rather than shipping noindex in HTML and hoping a crawler removes it.
    robots: isPublic ? 'index, follow' : 'noindex, follow',
    locale: language.replace('-', '_'),
    structuredData: canonical
      ? {
          '@context': 'https://schema.org',
          '@type': isHome ? 'WebSite' : isCatalog ? 'CollectionPage' : 'WebPage',
          name: isHome ? 'CloudCertify' : isCatalog ? t.dashboard.title : quiz?.title,
          url: canonical,
          description,
          inLanguage: language
        }
      : undefined
  };
}

type PageMetadata = ReturnType<typeof getPageMetadata>;

export function applyPageMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;
  const values = [
    ['name', 'description', metadata.description],
    ['name', 'robots', metadata.robots],
    ['property', 'og:title', metadata.title],
    ['property', 'og:description', metadata.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'CloudCertify'],
    ['property', 'og:locale', metadata.locale],
    ['property', 'og:url', metadata.canonical],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', metadata.title],
    ['name', 'twitter:description', metadata.description]
  ] as const;

  for (const [attribute, key, content] of values) {
    const existing = document.head.querySelector<HTMLMetaElement>(
      `meta[${attribute}="${key}"]`
    );
    if (!content) {
      existing?.remove();
      continue;
    }
    const tag = existing ?? document.createElement('meta');
    tag.setAttribute(attribute, key);
    tag.content = content;
    if (!existing) document.head.appendChild(tag);
  }

  const existingCanonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (metadata.canonical) {
    const link = existingCanonical ?? document.createElement('link');
    link.rel = 'canonical';
    link.href = metadata.canonical;
    if (!existingCanonical) document.head.appendChild(link);
  } else {
    existingCanonical?.remove();
  }

  const existingSchema = document.getElementById('page-structured-data');
  if (metadata.structuredData) {
    const script = existingSchema ?? document.createElement('script');
    script.id = 'page-structured-data';
    script.setAttribute('type', 'application/ld+json');
    // textContent avoids treating API-provided titles/descriptions as HTML.
    script.textContent = JSON.stringify(metadata.structuredData).replace(/</g, '\\u003c');
    if (!existingSchema) document.head.appendChild(script);
  } else {
    existingSchema?.remove();
  }
}
