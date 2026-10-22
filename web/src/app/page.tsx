import { HomePage } from '@/screens/home';
import { getPublicQuizzes } from '@/http/public-api.server';
import { getRequestLanguage } from '@/i18n/server';
import { JsonLd, publicMetadata } from '@/seo/metadata';

export async function generateMetadata() {
  return publicMetadata('/', await getRequestLanguage());
}

export default async function Page() {
  const language = await getRequestLanguage();
  const quizzes = await getPublicQuizzes(language);
  return <><JsonLd path='/' language={language} /><HomePage quizzes={quizzes} /></>;
}
