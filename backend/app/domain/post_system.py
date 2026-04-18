from __future__ import annotations

from collections import defaultdict

from app.domain.models import PostRecord, PostStatus, PostType


class PostSystem:
    def __init__(self) -> None:
        self.posts: dict[str, PostRecord] = {}
        self.node_seen_posts: dict[int, set[str]] = defaultdict(set)
        self._next_id = 1

    def create_post(self, post_type: PostType, creator_node: int, creation_step: int) -> PostRecord:
        post = PostRecord(
            id=f"post-{self._next_id}",
            type=post_type,
            creator_node=creator_node,
            creation_step=creation_step,
            seen_by={creator_node},
            active_emitters={creator_node},
        )
        self._next_id += 1
        self.posts[post.id] = post
        self.node_seen_posts[creator_node].add(post.id)
        return post

    def get_post(self, post_id: str) -> PostRecord | None:
        return self.posts.get(post_id)

    def get_feed_for_node(self, node_id: int) -> list[PostRecord]:
        visible_posts = []
        for post in self.posts.values():
            if node_id == post.creator_node or node_id in post.seen_by:
                visible_posts.append(post)
        return sorted(visible_posts, key=lambda post: (post.creation_step, post.id), reverse=True)

    def mark_seen(self, post_id: str, node_id: int) -> bool:
        post = self.posts[post_id]
        if node_id in post.seen_by:
            return False
        post.seen_by.add(node_id)
        self.node_seen_posts[node_id].add(post_id)
        return True

    def schedule_repost(self, post_id: str, node_id: int) -> bool:
        post = self.posts[post_id]
        if post.status == PostStatus.CENSORED or node_id in post.reposted_by:
            return False
        post.reposted_by.add(node_id)
        post.next_emitters.add(node_id)
        return True

    def censor_posts(self, post_ids: list[str], max_actions: int) -> list[str]:
        censored: list[str] = []
        for post_id in post_ids:
            if len(censored) >= max_actions:
                break
            post = self.posts.get(post_id)
            if post is None or post.status == PostStatus.CENSORED:
                continue
            post.status = PostStatus.CENSORED
            post.active_emitters.clear()
            post.next_emitters.clear()
            censored.append(post_id)
        return censored

    def active_posts(self) -> list[PostRecord]:
        return [
            post for post in self.posts.values() if post.status == PostStatus.ACTIVE and post.active_emitters
        ]

    def advance_emitters(self) -> None:
        for post in self.posts.values():
            post.active_emitters = set() if post.status == PostStatus.CENSORED else set(post.next_emitters)
            post.next_emitters.clear()

    def serialize_post(self, post: PostRecord) -> dict:
        return {
            "id": post.id,
            "type": post.type.value,
            "creator_node": post.creator_node,
            "creation_step": post.creation_step,
            "seen_by": sorted(post.seen_by),
            "reposted_by": sorted(post.reposted_by),
            "status": post.status.value,
        }
