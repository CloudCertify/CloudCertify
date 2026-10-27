import type { Metadata } from 'next';
import { AuthCallbackPage } from '@/screens/auth-callback';

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Page() {
  return <AuthCallbackPage />;
}
