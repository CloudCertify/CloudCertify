import { QuizDetailPage } from '@/screens/quiz-detail';
import { getPublicQuiz } from '@/http/public-api.server';
import { getRequestLanguage } from '@/i18n/server';
import { JsonLd, publicMetadata } from '@/seo/metadata';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ variant?: string }>;
};

async function getPageData({ params }: Props) {
  const [{ id }, language] = await Promise.all([params, getRequestLanguage()]);
  return { id, language, quiz: await getPublicQuiz(id, language) };
}

export async function generateMetadata(props: Props) {
  const { id, language, quiz } = await getPageData(props);
  return publicMetadata(`/quiz/${id}`, language, quiz);
}

export default async function Page(props: Props) {
  const { id, language, quiz } = await getPageData(props);
  // PROTOTYPE: practice-layout variants, dev only (?variant=A..D).
  const variant = process.env.NODE_ENV === 'development' ? (await props.searchParams)?.variant : undefined;
  return <><JsonLd path={`/quiz/${id}`} language={language} quiz={quiz} /><QuizDetailPage quiz={quiz} variant={variant} /></>;
}
