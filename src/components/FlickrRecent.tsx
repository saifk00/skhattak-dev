import { useEffect, useMemo, useRef, useState } from 'react';

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

interface FlickrResponse {
  profile: {
    title: string;
    url: string;
  };
  updatedAt: string;
  items: FlickrItem[];
}

const GRID_GAP_PX = 14;
const MIN_CARD_WIDTH_PX = 112;
const MAX_ROWS = 3;
const MAX_ITEMS = 36;

function formatDate(input: string | null): string {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.valueOf())) return input;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toFlickrSizedUrl(url: string, size: string): string {
  return url.replace(/_([a-z0-9]{1,2})(\.[a-z0-9]+)$/i, `_${size}$2`);
}

function featuredAspectRatioFor(orientation: FlickrItem['orientation']): string {
  if (orientation === 'portrait') return '3 / 4';
  if (orientation === 'square') return '1 / 1';
  return '16 / 9';
}

function thumbAspectRatioForSection(section: 'portrait' | 'wide', orientation: FlickrItem['orientation']): string {
  if (section === 'portrait') {
    return orientation === 'portrait' ? '3 / 4' : '1 / 1';
  }
  if (orientation === 'portrait') return '3 / 4';
  return '16 / 9';
}

export default function FlickrRecent() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<FlickrItem[]>([]);
  const [profileUrl, setProfileUrl] = useState('https://flickr.com/photos/198040252@N06/');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState(5);
  const [featuredLink, setFeaturedLink] = useState<string | null>(null);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return;

    const updateColumns = (width: number) => {
      if (width <= 0) return;
      const nextColumns = Math.max(
        1,
        Math.floor((width + GRID_GAP_PX) / (MIN_CARD_WIDTH_PX + GRID_GAP_PX)),
      );
      setColumns(current => (current === nextColumns ? current : nextColumns));
    };

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        updateColumns(entry.contentRect.width);
      }
    });

    observer.observe(target);
    updateColumns(target.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const wideColumns = Math.max(1, Math.ceil(columns / 2));
  const portraitTarget = columns * MAX_ROWS;
  const wideTarget = wideColumns * MAX_ROWS;
  const requestedLimit = Math.min(
    MAX_ITEMS,
    Math.max(portraitTarget + wideTarget, 20),
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const load = () => {
      const qs = new URLSearchParams({
        limit: String(requestedLimit),
        _: String(Date.now()),
      });

      return fetch(`/api/flickr?${qs.toString()}`, { cache: 'no-store' })
        .then(async response => {
          if (!response.ok) throw new Error(`Request failed (${response.status})`);
          return (await response.json()) as FlickrResponse;
        })
        .then(data => {
          if (!mounted) return;
          setItems(data.items ?? []);
          setProfileUrl(data.profile?.url || 'https://flickr.com/photos/198040252@N06/');
          setError(null);
        })
        .catch(err => {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : 'Failed to load Flickr feed.');
        })
        .finally(() => {
          if (!mounted) return;
          setIsLoading(false);
        });
    };

    load();
    const intervalId = window.setInterval(load, 5 * 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [requestedLimit]);

  useEffect(() => {
    if (!featuredLink) return;
    if (items.some(item => item.link === featuredLink)) return;
    setFeaturedLink(null);
  }, [items, featuredLink]);

  const featuredItem = useMemo(
    () => (featuredLink ? items.find(item => item.link === featuredLink) ?? null : null),
    [items, featuredLink],
  );

  const featuredImageCandidates = useMemo(() => {
    if (!featuredItem) return [];
    const source = featuredItem.imageUrl;
    const candidates = [
      toFlickrSizedUrl(source, 'b'),
      toFlickrSizedUrl(source, 'c'),
      toFlickrSizedUrl(source, 'z'),
      source,
    ];
    return candidates.filter((url, index) => candidates.indexOf(url) === index);
  }, [featuredItem]);

  useEffect(() => {
    setFeaturedImageIndex(0);
  }, [featuredItem?.link]);

  const openFlickr = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const content = useMemo(() => {
    if (isLoading) {
      return <p style={{ color: 'var(--text-muted)' }}>Loading recent photos...</p>;
    }

    if (error) {
      const isLocalhost =
        typeof window !== 'undefined' &&
        ['localhost', '127.0.0.1'].includes(window.location.hostname);
      return (
        <p style={{ color: 'var(--text-muted)' }}>
          Couldn&apos;t load the feed right now.{' '}
          {isLocalhost ? (
            <>
              Run <code>npm run dev:cf</code> to enable Cloudflare Pages Functions locally.{' '}
            </>
          ) : null}
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View photostream
          </a>.
        </p>
      );
    }

    if (items.length === 0) {
      return (
        <p style={{ color: 'var(--text-muted)' }}>
          No photos yet.{' '}
          <a href={profileUrl} target="_blank" rel="noopener noreferrer">
            View photostream
          </a>.
        </p>
      );
    }

    const portraitItems = items
      .filter(item => item.orientation === 'portrait')
      .slice(0, portraitTarget);
    const wideItems = items
      .filter(item => item.orientation !== 'portrait')
      .slice(0, wideTarget);

    const renderCard = (item: FlickrItem, section: 'portrait' | 'wide') => {
      const isFeatured = featuredLink === item.link;

      return (
        <article
          key={item.link}
          style={{
            border: isFeatured
              ? '1px solid color-mix(in srgb, var(--accent) 66%, var(--border))'
              : '1px solid var(--border-soft)',
            borderRadius: '10px',
            overflow: 'hidden',
            background:
              'linear-gradient(180deg, rgba(15, 22, 35, 0.95), rgba(11, 17, 29, 0.95))',
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (featuredLink === item.link) {
                openFlickr(item.link);
                return;
              }
              setFeaturedLink(item.link);
            }}
            style={{
              width: '100%',
              border: 0,
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'pointer',
              display: 'block',
            }}
            title={
              featuredLink === item.link
                ? 'Open this photo on Flickr'
                : 'Preview this photo in panel'
            }
          >
            <img
              src={item.imageUrl}
              alt={item.title || 'Flickr photo'}
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: thumbAspectRatioForSection(section, item.orientation),
                objectFit: 'cover',
                display: 'block',
                border: 0,
              }}
            />
          </button>
          <div style={{ padding: '10px' }}>
            <p
              style={{
                fontSize: '0.8em',
                lineHeight: 1.35,
                margin: 0,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={item.title}
            >
              {item.title || 'Untitled'}
            </p>
            <p
              style={{
                fontSize: '0.72em',
                color: 'var(--text-faint)',
                margin: '4px 0 0',
              }}
            >
              {formatDate(item.dateTaken ?? item.publishedAt)}
            </p>
          </div>
        </article>
      );
    };

    return (
      <>
        {featuredItem ? (
          <article
            style={{
              border: '1px solid var(--border-soft)',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '14px',
              background:
                'linear-gradient(180deg, rgba(15, 22, 35, 0.96), rgba(11, 17, 29, 0.96))',
            }}
          >
            <button
              type="button"
              onClick={() => openFlickr(featuredItem.link)}
              style={{
                display: 'block',
                width: featuredItem.orientation === 'portrait' ? 'min(100%, 460px)' : '100%',
                border: 0,
                padding: 0,
                margin: 0,
                background: 'transparent',
                cursor: 'pointer',
                marginInline: featuredItem.orientation === 'portrait' ? 'auto' : undefined,
              }}
              title="Open this photo on Flickr"
            >
              <img
                src={featuredImageCandidates[featuredImageIndex] ?? featuredItem.imageUrl}
                alt={featuredItem.title || 'Selected Flickr photo'}
                onError={() => {
                  setFeaturedImageIndex(current =>
                    Math.min(current + 1, Math.max(0, featuredImageCandidates.length - 1)),
                  );
                }}
                style={{
                  width: '100%',
                  aspectRatio: featuredAspectRatioFor(featuredItem.orientation),
                  objectFit: featuredItem.orientation === 'portrait' ? 'contain' : 'cover',
                  display: 'block',
                  border: 0,
                  background: '#050913',
                }}
              />
            </button>
            <div style={{ padding: '10px 12px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86em',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {featuredItem.title || 'Untitled'}
              </p>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '0.74em',
                  color: 'var(--text-faint)',
                }}
              >
                {formatDate(featuredItem.dateTaken ?? featuredItem.publishedAt)} · click again to open Flickr
              </p>
            </div>
          </article>
        ) : null}

        {portraitItems.length > 0 ? (
          <>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '0.7em',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Portrait
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${GRID_GAP_PX}px`,
              }}
            >
              {portraitItems.map(item => renderCard(item, 'portrait'))}
            </div>
          </>
        ) : null}

        {wideItems.length > 0 ? (
          <>
            <p
              style={{
                margin: portraitItems.length > 0 ? '16px 0 8px' : '0 0 8px',
                fontSize: '0.7em',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Landscape
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${wideColumns}, minmax(0, 1fr))`,
                gap: `${GRID_GAP_PX}px`,
              }}
            >
              {wideItems.map(item => renderCard(item, 'wide'))}
            </div>
          </>
        ) : null}
      </>
    );
  }, [
    items,
    isLoading,
    error,
    profileUrl,
    columns,
    wideColumns,
    portraitTarget,
    wideTarget,
    featuredItem,
    featuredLink,
  ]);

  return (
    <section ref={sectionRef} style={{ marginTop: '8px', paddingBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '14px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontSize: '0.78em',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--gold)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: 0,
          }}
        >
          recent photos
        </h2>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.75em',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
          }}
        >
          flickr.com/photos/198040252@N06
        </a>
      </div>
      {content}
    </section>
  );
}
