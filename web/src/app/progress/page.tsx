import { getRequestLanguage } from '@/i18n/server';
import { MESSAGES } from '@/i18n/messages';
import { ProgressPage } from '@/screens/progress';

export async function generateMetadata() {
  const t = MESSAGES[await getRequestLanguage()];
  return { title: `${t.common.progress} | CloudCertify`, robots: { index: false, follow: true } };
}

export default function Page() {
  return <ProgressPage />;
}
