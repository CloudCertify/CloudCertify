import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetQuizQuizId } from '@/http/generated/api';
import { useI18n } from '@/i18n/use-i18n';
import { applyPageMetadata, getPageMetadata, getPublicQuizId } from './metadata';

export function PageMetadata() {
  const [path] = useLocation();
  const { language } = useI18n();
  const quizId = getPublicQuizId(path);
  // Shares the detail page's query key and in-flight request. Other routes
  // never fetch quiz data for metadata.
  const { data, isError, isSuccess } = useGetQuizQuizId(quizId, {
    query: { enabled: quizId > 0 }
  });
  const quiz = data?.data;

  useEffect(() => {
    applyPageMetadata(
      getPageMetadata(path, language, quiz, isError || (isSuccess && !quiz?.title?.trim()))
    );
  }, [path, language, quiz, isError, isSuccess]);

  return null;
}
