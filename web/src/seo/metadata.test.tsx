import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd, publicMetadata, rootMetadata, SITE_ORIGIN } from './metadata';

describe('server discovery metadata', () => {
  it('uses localized public copy and a single canonical per route', () => {
    const en = publicMetadata('/dashboard', 'en-US');
    const pt = publicMetadata('/dashboard', 'pt-BR');
    expect(en.title).not.toBe(pt.title);
    expect(pt.alternates).toEqual({ canonical: '/dashboard' });
    expect(pt.openGraph).toMatchObject({ locale: 'pt_BR', url: '/dashboard' });
    expect(rootMetadata.metadataBase?.toString()).toBe(`${SITE_ORIGIN}/`);
  });

  it('uses the actual public quiz and escapes embedded HTML in structured data', () => {
    const quiz = { id: 1, title: 'A </script><script>attack</script>', description: 'Visible description' };
    expect(publicMetadata('/quiz/1', 'en-US', quiz).description).toBe(quiz.description);
    const html = renderToStaticMarkup(<JsonLd path='/quiz/1' language='en-US' quiz={quiz} />);
    expect(html.match(/<script/g)).toHaveLength(1);
    const data = JSON.parse(html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>')));
    expect(data.name).toBe(quiz.title);
    expect(data.url).toBe(`${SITE_ORIGIN}/quiz/1`);
    expect(data['@type']).toBe('WebPage');
    expect(data).not.toHaveProperty('aggregateRating');
  });
});
