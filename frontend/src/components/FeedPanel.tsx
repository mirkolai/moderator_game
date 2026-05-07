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

const typeLabel = {
  dictatorship: 'Dictatorship propaganda',
  'democracy': 'Democracy support',
  neutral: 'Neutral',
};

export function FeedPanel({
  feed,
  selectedNodeId,
  highlightedPostId,
  currentStep,
  censorshipActionsRemaining,
  onHighlightPost,
  onCensorPost,
}: FeedPanelProps) {
  return (
    <aside className="feed-panel card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Feed</p>
          <h2>Citizen {selectedNodeId ?? '...'}</h2>
        </div>
        <div className="counter-pill">Moderations left: {censorshipActionsRemaining}</div>
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
            const elapsedDays = Math.max(0, (currentStep - post.creation_step)-1);
            const postedLabel = elapsedDays === 0 ? 'Posted today' : elapsedDays === 1? 'Posted 1 day ago': `Posted ${elapsedDays} days ago`;
            return (
              <article
                key={post.id}
                className={`post-card ${post.type} ${isCensored ? 'is-censored' : ''} ${isActiveHighlight ? 'is-highlighted' : ''}`}
                onClick={() => onHighlightPost(post)}
              >
                <div className="post-card__header">
                  <span className="type-chip">{typeLabel[post.type]}</span>
                  <span className="meta-chip">{postedLabel}</span>
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
