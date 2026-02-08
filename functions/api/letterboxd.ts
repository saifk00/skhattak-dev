interface LetterboxdItem {
  title: string;
  filmTitle: string;
  filmYear: number | null;
  memberRating: number | null;
  watchedDate: string | null;
  publishedAt: string | null;
  link: string;
  posterUrl: string | null;
  reviewText: string | null;
}

function decodeXml(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1].trim()) : null;
}

function stripHtml(input: string): string {
  return decodeXml(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function extractReviewText(descriptionHtml: string, guid: string | null): string | null {
  if (!guid?.startsWith('letterboxd-review-')) return null;

  const withoutPoster = descriptionHtml
    .replace(/<p>\s*<img[^>]*>\s*<\/p>/i, '')
    .trim();
  const text = stripHtml(withoutPoster);
  return text || null;
}

function parseLetterboxdRss(xml: string): LetterboxdItem[] {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const parsed: LetterboxdItem[] = [];

  for (const item of itemMatches) {
    const filmTitle = extractTag(item, 'letterboxd:filmTitle');
    if (!filmTitle) continue;

    const descriptionMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    const description = descriptionMatch ? descriptionMatch[1] : '';
    const posterMatch = description.match(/<img src="([^"]+)"/);

    const guid = extractTag(item, 'guid');
    const yearRaw = extractTag(item, 'letterboxd:filmYear');
    const ratingRaw = extractTag(item, 'letterboxd:memberRating');

    parsed.push({
      title: extractTag(item, 'title') ?? filmTitle,
      filmTitle,
      filmYear: yearRaw ? Number(yearRaw) : null,
      memberRating: ratingRaw ? Number(ratingRaw) : null,
      watchedDate: extractTag(item, 'letterboxd:watchedDate'),
      publishedAt: extractTag(item, 'pubDate'),
      link: extractTag(item, 'link') ?? 'https://letterboxd.com/xiphosen/',
      posterUrl: posterMatch ? posterMatch[1] : null,
      reviewText: extractReviewText(description, guid),
    });
  }

  return parsed;
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limit') ?? '10');
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, 20))
    : 10;

  const feedResponse = await fetch('https://letterboxd.com/xiphosen/rss/', {
    cf: { cacheEverything: true, cacheTtl: 900 },
    headers: {
      'User-Agent': 'skhattak.dev letterboxd feed',
    },
  });

  if (!feedResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Letterboxd feed.' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const xml = await feedResponse.text();
  const items = parseLetterboxdRss(xml).slice(0, limit);

  return new Response(
    JSON.stringify({
      profile: {
        handle: 'xiphosen',
        url: 'https://letterboxd.com/xiphosen/',
      },
      updatedAt: new Date().toISOString(),
      items,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
      },
    },
  );
};
