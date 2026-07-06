import type { QuizProvider } from '@/http/generated/api.schemas';

export type ProviderInfo = {
  id: QuizProvider;
  label: string;
  short: string;
  available: boolean;
};

export const PROVIDERS: ProviderInfo[] = [
  { id: 'aws', label: 'Amazon Web Services', short: 'AWS', available: true },
  { id: 'azure', label: 'Microsoft Azure', short: 'Azure', available: false },
  { id: 'gcp', label: 'Google Cloud', short: 'GCP', available: false }
];
