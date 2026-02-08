import { useEffect, useMemo, useRef, useState } from 'react';

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

interface LetterboxdResponse {
  profile: {
    handle: string;
    url: string;
  };
  updatedAt: string;
  items: LetterboxdItem[];
}

const GRID_GAP_PX = 14;
const MIN_CARD_WIDTH_PX = 130;
const MAX_ROWS = 2;
const MAX_ITEMS = 20;

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

function formatRating(rating: number | null): string {
  if (rating == null) return 'No rating';
  return `${rating.toFixed(1)}★`;
}

export default function LetterboxdRecent() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<LetterboxdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReviewLink, setActiveReviewLink] = useState<string | null>(null);
  const [columns, setColumns] = useState(5);

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

  const requestedLimit = Math.min(MAX_ITEMS, Math.max(1, columns * MAX_ROWS));

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const load = () =>
      fetch(`/api/letterboxd?limit=${requestedLimit}`)
        .then(async response => {
          if (!response.ok) throw new Error(`Request failed (${response.status})`);
          return (await response.json()) as LetterboxdResponse;
        })
        .then(data => {
          if (!mounted) return;
          setItems(data.items ?? []);
          setError(null);
        })
        .catch(err => {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : 'Failed to load Letterboxd feed.');
        })
        .finally(() => {
          if (!mounted) return;
          setIsLoading(false);
        });

    load();
    const intervalId = window.setInterval(load, 5 * 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [requestedLimit]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <p style={{ color: 'var(--text-muted)' }}>
          Loading recent watches...
        </p>
      );
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
            href="https://letterboxd.com/xiphosen/"
            target="_blank"
            rel="noopener noreferrer"
          >
            View profile
          </a>.
        </p>
      );
    }

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${GRID_GAP_PX}px`,
        }}
      >
        {items.map(item => {
          const isReviewActive = activeReviewLink === item.link;
          return (
            <a
              key={item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setActiveReviewLink(item.link)}
              onMouseLeave={() =>
                setActiveReviewLink(current => (current === item.link ? null : current))
              }
              onFocus={() => setActiveReviewLink(item.link)}
              onBlur={() =>
                setActiveReviewLink(current => (current === item.link ? null : current))
              }
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'var(--text)',
                background: 'var(--surface)',
                display: 'block',
              }}
            >
              <div style={{ position: 'relative' }}>
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.filmTitle}
                    loading="lazy"
                    style={{
                      width: '100%',
                      aspectRatio: '2 / 3',
                      objectFit: 'cover',
                      display: 'block',
                      border: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '2 / 3',
                      background: '#0f1724',
                    }}
                  />
                )}
                {item.reviewText ? (
                  <div
                    onClick={event => event.preventDefault()}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(3, 10, 20, 0.92)',
                      color: '#d9e4f7',
                      padding: '10px',
                      fontSize: '0.76em',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      touchAction: 'pan-y',
                      opacity: isReviewActive ? 1 : 0,
                      transition: 'opacity 160ms ease',
                      pointerEvents: isReviewActive ? 'auto' : 'none',
                    }}
                  >
                    {item.reviewText}
                  </div>
                ) : null}
              </div>
              <div style={{ padding: '10px' }}>
                <p
                  style={{
                    fontSize: '0.85em',
                    lineHeight: 1.35,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {item.filmTitle}
                </p>
                <p
                  style={{
                    fontSize: '0.76em',
                    color: 'var(--text-muted)',
                    margin: '4px 0 0',
                  }}
                >
                  {item.filmYear ? `${item.filmYear} · ` : ''}
                  {formatRating(item.memberRating)}
                </p>
                <p
                  style={{
                    fontSize: '0.74em',
                    color: 'var(--text-muted)',
                    margin: '4px 0 0',
                  }}
                >
                  {formatDate(item.watchedDate ?? item.publishedAt)}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    );
  }, [items, isLoading, error, activeReviewLink, columns]);

  return (
    <section ref={sectionRef} style={{ marginTop: '36px', paddingBottom: '70px' }}>
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
            fontSize: '1em',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          recent watches
        </h2>
        <a
          href="https://letterboxd.com/xiphosen/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.88em', color: 'var(--accent)' }}
        >
          letterboxd.com/xiphosen
        </a>
      </div>
      {content}
    </section>
  );
}
