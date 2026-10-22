import { renderToString } from 'react-dom/server';
import { HomeSnapshot } from './home-snapshot';
import { getPageMetadata } from './metadata';

export function renderHome() {
  const year = new Date().getFullYear();
  const metadata = getPageMetadata('/', 'en-US');
  return {
    year,
    body: renderToString(<HomeSnapshot year={year} />),
    head: renderToString(
      <>
        <link rel='canonical' href={metadata.canonical} />
        <meta property='og:url' content={metadata.canonical} />
        <script id='page-structured-data' type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(metadata.structuredData).replace(/</g, '\\u003c') }} />
      </>
    )
  };
}
