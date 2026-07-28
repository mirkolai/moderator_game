from __future__ import annotations

import csv
import random
from collections import defaultdict
from pathlib import Path

from app.domain.category_config import CATEGORY_ALPHA, CATEGORY_BETA, CATEGORY_GAMMA
from app.domain.models import PostRecord, PostStatus, PostType

_CONTENT_CSV_BY_TYPE: dict[PostType, str] = {
    PostType.ALPHA: CATEGORY_ALPHA.posts_csv,
    PostType.BETA: CATEGORY_BETA.posts_csv,
    PostType.GAMMA: CATEGORY_GAMMA.posts_csv,
}
_POSTS_DIR = Path(__file__).resolve().parent.parent / "post"


def _load_contents_from_csv(csv_path: Path) -> list[str]:
    if not csv_path.exists():
        return []

    rows: list[str] = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames and "post_content" in reader.fieldnames:
            for row in reader:
                content = (row.get("post_content") or "").strip()
                if content:
                    rows.append(content)
            return rows

        handle.seek(0)
        fallback_reader = csv.reader(handle)
        first_row = True
        for row in fallback_reader:
            if not row:
                continue
            first_col = row[0].strip()
            if not first_col:
                continue
            if first_row and first_col.lower() == "post_content":
                first_row = False
                continue
            first_row = False
            rows.append(first_col)
    return rows


class PostSystem:
    def __init__(self) -> None:
        self.posts: dict[str, PostRecord] = {}
        self.node_seen_posts: dict[int, set[str]] = defaultdict(set)
        self._next_id = 1
        self._contents_by_type: dict[PostType, list[str]] = {
            post_type: _load_contents_from_csv(_POSTS_DIR / csv_name)
            for post_type, csv_name in _CONTENT_CSV_BY_TYPE.items()
        }
        self._content_bag_by_type: dict[PostType, list[str]] = {post_type: [] for post_type in PostType}
        self._last_content_by_type: dict[PostType, str | None] = {post_type: None for post_type in PostType}

    def _next_content(self, post_type: PostType) -> str:
        content_bag = self._content_bag_by_type[post_type]
        if not content_bag:
            content_bag = list(self._contents_by_type.get(post_type, []))
            random.shuffle(content_bag)
            last_content = self._last_content_by_type[post_type]
            if last_content and len(content_bag) > 1 and content_bag[-1] == last_content:
                content_bag[-1], content_bag[-2] = content_bag[-2], content_bag[-1]
            self._content_bag_by_type[post_type] = content_bag

        if not content_bag:
            return f"{post_type.value.title()} content"

        next_content = content_bag.pop()
        self._last_content_by_type[post_type] = next_content
        return next_content

    def create_post(self, post_type: PostType, creator_node: int, creation_step: int) -> PostRecord:
        content = self._next_content(post_type)
        post = PostRecord(
            id=f"post-{self._next_id}",
            type=post_type,
            content=content,
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
            "category": post.type.value,
            "content": post.content,
            "creator_node": post.creator_node,
            "creation_step": post.creation_step,
            "seen_by": sorted(post.seen_by),
            "reposted_by": sorted(post.reposted_by),
            "repost_count": post.repost_count,
            "status": post.status.value,
        }
