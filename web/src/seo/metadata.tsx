import type { Metadata } from 'next';
import type { QuizDto } from '@/http/generated/api.schemas';
import type { Language } from '@/i18n/language';
import { MESSAGES } from '@/i18n/messages';

export const SITE_ORIGIN = 'https://cloudcertify.snowye.dev';

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: 'CloudCertify',
  icons: {
    icon: [
      { url: '/icon-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.svg', media: '(prefers-color-scheme: dark)' }
    ]
  }
};

const COPY = {
  'en-US': {
    title: 'CloudCertify | Cloud certification practice',
    description: 'Practice cloud certification exams and focused domain drills. Review explanations and your results with CloudCertify.'
  },
  'pt-BR': {
    title: 'CloudCertify | Prática para certificações em nuvem',
    description: 'Pratique com simulados de certificação em nuvem e treinos por domínio. Revise explicações e seus resultados com o CloudCertify.'
  }
} satisfies Record<Language, { title: string; description: string }>;

function pageCopy(path: string, language: Language, quiz?: QuizDto) {
  const t = MESSAGES[language];
  if (path === '/dashboard') return {
    title: `${t.dashboard.title} | CloudCertify`, description: t.dashboard.subtitle
  };
  if (quiz) return {
    title: `${quiz.title} | CloudCertify`,
    description: quiz.description?.trim() || t.quizDetail.fullExamBody
  };
  return COPY[language];
}

export function publicMetadata(path: string, language: Language, quiz?: QuizDto): Metadata {
  const { title, description } = pageCopy(path, language, quiz);
  return {
    title, description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title, description, url: path, type: 'website',
      siteName: 'CloudCertify', locale: language.replace('-', '_')
    },
    twitter: { card: 'summary', title, description }
  };
}

export function JsonLd({ path, language, quiz }: {
  path: string; language: Language; quiz?: QuizDto;
}) {
  const { description } = pageCopy(path, language, quiz);
  const data = {
    '@context': 'https://schema.org',
    '@type': path === '/' ? 'WebSite' : path === '/dashboard' ? 'CollectionPage' : 'WebPage',
    name: path === '/' ? 'CloudCertify' : quiz?.title ?? MESSAGES[language].dashboard.title,
    url: new URL(path, SITE_ORIGIN).href,
    description,
    inLanguage: language
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{
    __html: JSON.stringify(data).replace(/</g, '\\u003c')
  }} />;
}
