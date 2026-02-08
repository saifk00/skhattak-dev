interface FlickrFeedItemRaw {
  title?: string;
  link?: string;
  media?: {
    m?: string;
  };
  description?: string;
  published?: string;
  date_taken?: string;
  tags?: string;
}

interface FlickrFeedRaw {
  title?: string;
  link?: string;
  modified?: string;
  items?: FlickrFeedItemRaw[];
}

interface FlickrItem {
  title: string;
  link: string;
  imageUrl: string;
  publishedAt: string | null;
  dateTaken: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
  orientation: 'portrait' | 'landscape' | 'square';
}

function parseTags(tagsRaw: string | undefined): string[] {
  if (!tagsRaw) return [];
  return tagsRaw
    .split(/\s+/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function parseDimensionsFromDescription(
  description: string | undefined,
): { width: number | null; height: number | null } {
  if (!description) return { width: null, height: null };

  const directMatch = description.match(/<img[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/i);
  if (directMatch) {
    return {
      width: Number.parseInt(directMatch[1], 10),
      height: Number.parseInt(directMatch[2], 10),
    };
  }

  const reverseMatch = description.match(/<img[^>]*\bheight="(\d+)"[^>]*\bwidth="(\d+)"/i);
  if (reverseMatch) {
    return {
      width: Number.parseInt(reverseMatch[2], 10),
      height: Number.parseInt(reverseMatch[1], 10),
    };
  }

  return { width: null, height: null };
}

function classifyOrientation(
  width: number | null,
  height: number | null,
): 'portrait' | 'landscape' | 'square' {
  if (!width || !height) return 'landscape';
  if (width > height * 1.05) return 'landscape';
  if (height > width * 1.05) return 'portrait';
  return 'square';
}

const FEED_URL =
  'https://www.flickr.com/services/feeds/photos_public.gne?id=198040252@N06&lang=en-us&format=json&nojsoncallback=1';

export const onRequestGet: PagesFunction = async ({ request }) => {
  const requestUrl = new URL(request.url);
  const requestedLimit = Number(requestUrl.searchParams.get('limit') ?? '10');
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, 24))
    : 10;

  const feedUrl = `${FEED_URL}&_=${Date.now()}`;

  const feedResponse = await fetch(feedUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'skhattak.dev flickr feed',
    },
  });

  if (!feedResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Flickr feed.' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  let feed: FlickrFeedRaw;
  try {
    feed = (await feedResponse.json()) as FlickrFeedRaw;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid Flickr feed response.' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const items = (feed.items ?? [])
    .map<FlickrItem | null>(item => {
      const mediaUrl = item.media?.m?.trim();
      const link = item.link?.trim();
      if (!mediaUrl || !link) return null;
      const { width, height } = parseDimensionsFromDescription(item.description);
      const orientation = classifyOrientation(width, height);

      return {
        title: item.title?.trim() || 'Untitled',
        link,
        imageUrl: mediaUrl,
        publishedAt: item.published ?? null,
        dateTaken: item.date_taken ?? null,
        tags: parseTags(item.tags),
        width,
        height,
        orientation,
      };
    })
    .filter((item): item is FlickrItem => item !== null)
    .slice(0, limit);

  return new Response(
    JSON.stringify({
      profile: {
        title: feed.title ?? 'Flickr photostream',
        url: feed.link ?? 'https://www.flickr.com/photos/198040252@N06/',
      },
      updatedAt: feed.modified ?? new Date().toISOString(),
      items,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );
};
