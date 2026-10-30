import { DashboardPage } from '@/screens/dashboard';
import { getPublicQuizzes } from '@/http/public-api.server';
import { getRequestLanguage } from '@/i18n/server';
import { JsonLd, publicMetadata } from '@/seo/metadata';

export async function generateMetadata() {
  return publicMetadata('/dashboard', await getRequestLanguage());
}

export default async function Page() {
  const language = await getRequestLanguage();
  const quizzes = await getPublicQuizzes(language);
  return <><JsonLd path='/dashboard' language={language} /><DashboardPage quizzes={quizzes} /></>;
}
