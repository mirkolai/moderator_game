import type { MouseEvent } from 'react';

import type { FeedResponse, PostRecord } from '../types';

interface FeedPanelProps {
  feed: FeedResponse | null;
  selectedNodeId: number | null;
  highlightedPostId: string | null;
  censorshipActionsRemaining: number;
  onHighlightPost: (post: PostRecord) => void;
  onCensorPost: (postId: string) => void;
}

const typeLabel = {
  misinformation: 'Misinformation',
  'fact-checking': 'Fact-checking',
  neutral: 'Neutral',
};

export function FeedPanel({
  feed,
  selectedNodeId,
  highlightedPostId,
  censorshipActionsRemaining,
  onHighlightPost,
  onCensorPost,
}: FeedPanelProps) {
  return (
    <aside className="feed-panel card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Feed</p>
          <h2>Node {selectedNodeId ?? '...'}</h2>
        </div>
        <div className="counter-pill">Censors left: {censorshipActionsRemaining}</div>
      </div>

      {feed === null ? (
        <div className="empty-state">Select a node in the graph to inspect its feed.</div>
      ) : feed.posts.length === 0 ? (
        <div className="empty-state">This node has not seen any posts yet.</div>
      ) : (
        <div className="post-list">
          {feed.posts.map((post) => {
            const isCensored = post.status === 'censored';
            const isActiveHighlight = highlightedPostId === post.id;
            return (
              <article
                key={post.id}
                className={`post-card ${post.type} ${isCensored ? 'is-censored' : ''} ${isActiveHighlight ? 'is-highlighted' : ''}`}
                onClick={() => onHighlightPost(post)}
              >
                <div className="post-card__header">
                  <span className="type-chip">{typeLabel[post.type]}</span>
                  <span className="meta-chip">Step {post.creation_step}</span>
                </div>
                <div className="post-card__body">
                  <p>Origin node: {post.creator_node}</p>
                  <p>Seen by: {post.seen_by.length}</p>
                  <p>Reposted by: {post.reposted_by.length}</p>
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
                    {isCensored ? 'Censored' : 'Censor'}
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
