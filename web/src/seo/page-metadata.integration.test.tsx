import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it } from 'vitest';
import { Route, Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { apiClient } from '@/http/axios-instance';
import { useGetQuizQuizId } from '@/http/generated/api';
import { PageMetadata } from './page-metadata';

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

it('shares the public page request and never fetches quiz metadata on utility routes', async () => {
  document.head.innerHTML = '';
  const sent: string[] = [];
  apiClient.defaults.adapter = async config => {
    sent.push(config.url ?? '');
    return {
      data: { id: 1, title: 'AWS CLF-C02', description: 'Cloud concepts.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  };
  const location = memoryLocation({ path: '/progress' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function QuizContent() {
    const { data } = useGetQuizQuizId(1);
    return <h1>{data?.data.title}</h1>;
  }
  render(
    <QueryClientProvider client={queryClient}>
      <Router hook={location.hook}>
        <PageMetadata />
        <Route path='/quiz/1' component={QuizContent} />
      </Router>
    </QueryClientProvider>
  );
  expect(sent).toEqual([]);
  act(() => location.navigate('/quiz/1'));
  await screen.findByRole('heading', { name: 'AWS CLF-C02' });
  await waitFor(() => { expect(document.title).toBe('AWS CLF-C02 | CloudCertify'); });
  expect(sent).toEqual(['/quiz/1']);

  act(() => location.navigate('/quiz/1/session'));
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(sent).toEqual(['/quiz/1']);
  queryClient.clear();
});
