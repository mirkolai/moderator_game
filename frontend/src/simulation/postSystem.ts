import { CATEGORY_BY_KEY } from './categories';
import { Rng } from './rng';
import type { Classification, PostRecord, PostStatus } from '../types';

/** Internal, mutable representation of a post while the simulation is running. */
interface InternalPost {
  id: string;
  type: Classification;
  content: string;
  creatorNode: number;
  creationStep: number;
  seenBy: Set<number>;
  repostedBy: Set<number>;
  repostCount: number;
  status: PostStatus;
  activeEmitters: Set<number>;
  nextEmitters: Set<number>;
}

/**
 * Manages the post lifecycle: creation, seen/reposted tracking, censorship,
 * and per-node feed assembly. Ported from `PostSystem` (backend/app/domain/post_system.py).
 */
export class PostSystem {
  readonly posts = new Map<string, InternalPost>();
  readonly nodeSeenPosts = new Map<number, Set<string>>();

  private nextId = 1;
  private readonly rng: Rng;
  private readonly contentBagByType: Record<Classification, string[]> = { alpha: [], beta: [], gamma: [] };
  private readonly lastContentByType: Record<Classification, string | null> = {
    alpha: null,
    beta: null,
    gamma: null,
  };

  constructor(rng: Rng) {
    this.rng = rng;
  }

  private nextContent(postType: Classification): string {
    let bag = this.contentBagByType[postType];
    if (bag.length === 0) {
      bag = [...CATEGORY_BY_KEY[postType].postContents];
      this.rng.shuffle(bag);
      const lastContent = this.lastContentByType[postType];
      if (lastContent && bag.length > 1 && bag[bag.length - 1] === lastContent) {
        [bag[bag.length - 1], bag[bag.length - 2]] = [bag[bag.length - 2], bag[bag.length - 1]];
      }
      this.contentBagByType[postType] = bag;
    }

    if (bag.length === 0) {
      return `${postType[0].toUpperCase()}${postType.slice(1)} content`;
    }

    const nextContentValue = bag.pop()!;
    this.lastContentByType[postType] = nextContentValue;
    return nextContentValue;
  }

  createPost(postType: Classification, creatorNode: number, creationStep: number): InternalPost {
    const post: InternalPost = {
      id: `post-${this.nextId}`,
      type: postType,
      content: this.nextContent(postType),
      creatorNode,
      creationStep,
      seenBy: new Set([creatorNode]),
      repostedBy: new Set(),
      repostCount: 0,
      status: 'active',
      activeEmitters: new Set([creatorNode]),
      nextEmitters: new Set(),
    };
    this.nextId += 1;
    this.posts.set(post.id, post);
    if (!this.nodeSeenPosts.has(creatorNode)) {
      this.nodeSeenPosts.set(creatorNode, new Set());
    }
    this.nodeSeenPosts.get(creatorNode)!.add(post.id);
    return post;
  }

  getPost(postId: string): InternalPost | undefined {
    return this.posts.get(postId);
  }

  getFeedForNode(nodeId: number): InternalPost[] {
    const visiblePosts = [...this.posts.values()].filter(
      (post) => nodeId === post.creatorNode || post.seenBy.has(nodeId),
    );
    return visiblePosts.sort((a, b) => {
      if (a.creationStep !== b.creationStep) return b.creationStep - a.creationStep;
      return b.id.localeCompare(a.id);
    });
  }

  markSeen(postId: string, nodeId: number): boolean {
    const post = this.posts.get(postId)!;
    if (post.seenBy.has(nodeId)) return false;
    post.seenBy.add(nodeId);
    if (!this.nodeSeenPosts.has(nodeId)) {
      this.nodeSeenPosts.set(nodeId, new Set());
    }
    this.nodeSeenPosts.get(nodeId)!.add(postId);
    return true;
  }

  scheduleRepost(postId: string, nodeId: number): boolean {
    const post = this.posts.get(postId)!;
    if (post.status === 'censored' || post.repostedBy.has(nodeId)) return false;
    post.repostedBy.add(nodeId);
    post.nextEmitters.add(nodeId);
    return true;
  }

  censorPosts(postIds: string[], maxActions: number): string[] {
    const censored: string[] = [];
    for (const postId of postIds) {
      if (censored.length >= maxActions) break;
      const post = this.posts.get(postId);
      if (post === undefined || post.status === 'censored') continue;
      post.status = 'censored';
      post.activeEmitters.clear();
      post.nextEmitters.clear();
      censored.push(postId);
    }
    return censored;
  }

  activePosts(): InternalPost[] {
    return [...this.posts.values()].filter((post) => post.status === 'active' && post.activeEmitters.size > 0);
  }

  advanceEmitters(): void {
    for (const post of this.posts.values()) {
      post.activeEmitters = post.status === 'censored' ? new Set() : new Set(post.nextEmitters);
      post.nextEmitters.clear();
    }
  }

  serializePost(post: InternalPost): PostRecord {
    return {
      id: post.id,
      category: post.type,
      content: post.content,
      creator_node: post.creatorNode,
      creation_step: post.creationStep,
      seen_by: [...post.seenBy].sort((a, b) => a - b),
      reposted_by: [...post.repostedBy].sort((a, b) => a - b),
      repost_count: post.repostCount,
      status: post.status,
    };
  }
}
