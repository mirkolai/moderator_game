import { useEffect, useMemo, useRef, type MouseEvent } from 'react';

import { getAnimalImageForNode } from '../config/animals';
import { CATEGORY_CONFIG } from '../config/categories';
import type { FeedResponse, GraphState, PostRecord } from '../types';

interface FeedPanelProps {
  feed: FeedResponse | null;
  graph?: GraphState | null; // Prop per calcolare il grado dei nodi
  selectedNodeId: number | null;
  selectedNodeState: number | null;
  highlightedPostId: string | null;
  currentStep: number;
  censorshipActionsRemaining: number;
  onHighlightPost: (post: PostRecord) => void;
  onCensorPost: (postId: string) => void;
}

export function FeedPanel({
  feed,
  graph = null,
  selectedNodeId,
  selectedNodeState,
  highlightedPostId,
  currentStep,
  censorshipActionsRemaining,
  onHighlightPost,
  onCensorPost,
}: FeedPanelProps) {
  const postListRef = useRef<HTMLDivElement | null>(null);
  const feedOwnerId = selectedNodeId ?? feed?.node_id ?? null;

  // Calcola il grado (numero di connessioni/friends) di ciascun nodo
  const degreeMap = useMemo(() => {
    if (!graph) return new Map<number, number>();

    const map = new Map<number, number>();
    for (const node of graph.nodes) {
      map.set(node.id, 0);
    }
    for (const edge of graph.edges) {
      map.set(edge.source, (map.get(edge.source) ?? 0) + 1);
      map.set(edge.target, (map.get(edge.target) ?? 0) + 1);
    }
    return map;
  }, [graph]);

  // Ordina i post dallo step di creazione più recente al più vecchio e prende solo i primi 10
  const visiblePosts = useMemo(() => {
    if (feed === null || feedOwnerId === null) {
      return [];
    }

    return [...feed.posts]
      .filter((post) => post.creator_node !== feedOwnerId)
      .sort((a, b) => b.creation_step - a.creation_step)
      .slice(0, 10);
  }, [feed, feedOwnerId]);

  // Riporta lo scroll in cima ad ogni nuovo step o cambio di nodo
  useEffect(() => {
    if (postListRef.current) {
      postListRef.current.scrollTop = 0;
    }
  }, [currentStep, selectedNodeId]);

  return (
    <aside className="feed-panel card">
      <div className="panel-heading">
        <div className="feed-panel__identity">
          <p className="eyebrow">Feed</p>
          <h2 className="feed-panel__citizen">
            {selectedNodeId !== null ? (
              <>
                <img
                  className="feed-panel__citizen-avatar"
                  src={getAnimalImageForNode(selectedNodeId)}
                  alt={`Animal avatar for node ${selectedNodeId}`}
                />
                <div className="feed-panel__alignment">
                  <div
                    className="feed-panel__alignment-track"
                    role="slider"
                    aria-label="Node alignment"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={selectedNodeState ?? 0.5}
                    aria-readonly="true"
                  >
                    <div
                      className="feed-panel__alignment-thumb"
                      style={{ left: `${(selectedNodeState ?? 0.5) * 100}%` }}
                    />
                  </div>
                  <div className="feed-panel__alignment-labels">
                    <span style={{ color: CATEGORY_CONFIG.gamma.color }}>{CATEGORY_CONFIG.gamma.label}</span>
                    <span style={{ color: CATEGORY_CONFIG.beta.color }}>{CATEGORY_CONFIG.beta.label}</span>
                    <span style={{ color: CATEGORY_CONFIG.alpha.color }}>{CATEGORY_CONFIG.alpha.label}</span>
                  </div>
                </div>
              </>
            ) : (
              '...'
            )}
          </h2>
        </div>
      </div>

      {feed === null ? (
        <div className="empty-state">Select a node in the graph to inspect its feed.</div>
      ) : visiblePosts.length === 0 ? (
        <div className="empty-state">This node has not seen any posts yet.</div>
      ) : (
        <div className="post-list" ref={postListRef}>
          {visiblePosts.map((post) => {
            const isCensored = post.status === 'censored';
            const isActiveHighlight = highlightedPostId === post.id;
            const elapsedDays = Math.max(0, (currentStep - post.creation_step) - 1);
            const postedLabel =
              elapsedDays === 0
                ? 'Posted today'
                : elapsedDays === 1
                ? 'Posted 1 day ago'
                : `Posted ${elapsedDays} days ago`;

            // Recupera il numero di connessioni (friends) del creatore del post
            const creatorFriends =
              degreeMap.get(post.creator_node) ??
              (post as unknown as { creator_degree?: number; creator_friends?: number }).creator_degree ??
              (post as unknown as { creator_degree?: number; creator_friends?: number }).creator_friends ??
              0;

            return (
              <article
                key={post.id}
                className={`post-card ${post.category} ${isCensored ? 'is-censored' : ''} ${isActiveHighlight ? 'is-highlighted' : ''}`}
                onClick={() => onHighlightPost(post)}
              >
                <div className="post-card__top">
                  <img
                    className="post-avatar"
                    src={getAnimalImageForNode(post.creator_node)}
                    alt={`Animal avatar for node ${post.creator_node}`}
                    loading="lazy"
                    width={44}
                    height={44}
                  />
                  <span className="post-card__timestamp">{postedLabel}</span>
                </div>
                <p className="post-card__content">"{post.content}"</p>
                <div className="post-card__stats">
                  <span>
                    Seen by {post.seen_by.length} {post.seen_by.length === 1 ? 'user' : 'users'}
                  </span>
                  <span>{post.repost_count} reposts</span>
                  <span>
                    {creatorFriends} {creatorFriends === 1 ? 'friend' : 'friends'}
                  </span>
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}