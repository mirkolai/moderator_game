import type { MouseEvent } from 'react';

import type { FeedResponse, PostRecord } from '../types';

interface FeedPanelProps {
  feed: FeedResponse | null;
  selectedNodeId: number | null;
  highlightedPostId: string | null;
  currentStep: number;
  censorshipActionsRemaining: number;
  onHighlightPost: (post: PostRecord) => void;
  onCensorPost: (postId: string) => void;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function integerToSVG(
  n: number,
  {
    size = 9,
    cell = 9,
    minFill = 0.3,
    maxFill = 0.7,
    fg = '#17212b',
    bg = '#f7f7f7',
  }: {
    size?: number;
    cell?: number;
    minFill?: number;
    maxFill?: number;
    fg?: string;
    bg?: string;
  } = {},
) {
  const half = Math.ceil(size / 2);
  const cells = size * half;
  const rng = mulberry32(n);

  let left: number[] = [];
  let fillRatio = 0;
  let attempts = 0;

  do {
    left = [];
    for (let i = 0; i < cells; i += 1) {
      left.push(rng() > 0.5 ? 1 : 0);
    }
    const filled = left.reduce((acc, bit) => acc + bit, 0);
    fillRatio = filled / cells;
    attempts += 1;
  } while ((fillRatio < minFill || fillRatio > maxFill) && attempts < 64);

  const svg: string[] = [];
  let idx = 0;

  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * cell}" height="${size * cell}" viewBox="0 0 ${size * cell} ${size * cell}">`,
  );
  svg.push(`<rect width="100%" height="100%" fill="${bg}"/>`);

  for (let y = 0; y < size; y += 1) {
    const row = left.slice(idx, idx + half);
    idx += half;

    const mirrored = size % 2 ? row.slice(0, -1).reverse() : [...row].reverse();
    const full = row.concat(mirrored);

    for (let x = 0; x < full.length; x += 1) {
      if (full[x]) {
        svg.push(
          `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${fg}"/>`,
        );
      }
    }
  }

  svg.push('</svg>');
  return svg.join('');
}

const avatarDataUriCache = new Map<string, string>();

function getPostAvatarDataUri(postId: string) {
  const cached = avatarDataUriCache.get(postId);
  if (cached) {
    return cached;
  }

  const seed = stringToSeed(postId);
  const svg = integerToSVG(seed);
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  avatarDataUriCache.set(postId, uri);
  return uri;
}

export function FeedPanel({
  feed,
  selectedNodeId,
  highlightedPostId,
  currentStep,
  censorshipActionsRemaining,
  onHighlightPost,
  onCensorPost,
}: FeedPanelProps) {
  const feedOwnerId = selectedNodeId ?? feed?.node_id ?? null;
  const visiblePosts =
    feed === null || feedOwnerId === null
      ? []
      : feed.posts.filter((post) => post.creator_node !== feedOwnerId);

  return (
    <aside className="feed-panel card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Feed</p>
          <h2>Citizen {selectedNodeId ?? '...'}</h2>
        </div>
      </div>

      {feed === null ? (
        <div className="empty-state">Select a node in the graph to inspect its feed.</div>
      ) : visiblePosts.length === 0 ? (
        <div className="empty-state">This node has not seen any posts yet.</div>
      ) : (
        <div className="post-list">
          {visiblePosts.map((post) => {
            const isCensored = post.status === 'censored';
            const isActiveHighlight = highlightedPostId === post.id;
            const elapsedDays = Math.max(0, (currentStep - post.creation_step)-1);
            const postedLabel = elapsedDays === 0 ? 'Posted today' : elapsedDays === 1? 'Posted 1 day ago': `Posted ${elapsedDays} days ago`;
            return (
              <article
                key={post.id}
                className={`post-card ${post.type} ${isCensored ? 'is-censored' : ''} ${isActiveHighlight ? 'is-highlighted' : ''}`}
                onClick={() => onHighlightPost(post)}
              >
                <div className="post-card__header">
                  <span className="type-chip">{post.sub_type}</span>
                  <span className="meta-chip">{postedLabel}</span>
                </div>
                <div className="post-card__body">
                  <div className="post-card__metrics">
                    <p>Origin node: {post.creator_node}</p>
                    <p>Seen by: {post.seen_by.length} {post.seen_by.length === 1 ? 'user' : 'users'}</p>
                    <p>Reposts: {post.repost_count}</p>
                  </div>
                  <img
                    className="post-avatar"
                    src={getPostAvatarDataUri(post.id)}
                    alt={`Avatar for ${post.id}`}
                    loading="lazy"
                    width={72}
                    height={72}
                  />
                </div>
                <div className="post-card__footer">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isCensored || censorshipActionsRemaining <= 0}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation();
                      onCensorPost(post.id);
                    }}
                  >
                    {isCensored ? 'Moderated' : 'Moderate'}
                  </button>
                  <span className="status-label">{isCensored ? 'Propagation halted' : 'Active'}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
