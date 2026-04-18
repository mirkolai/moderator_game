from __future__ import annotations

import math
import random
import threading
from typing import Any

from app.domain.game_logic import GameLogic
from app.domain.graph import GraphManager
from app.domain.models import Outcome, PostType
from app.domain.parameters import SimulationParameters
from app.domain.post_system import PostSystem


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


class SimulationEngine:
    def __init__(self, params: SimulationParameters | None = None) -> None:
        self._lock = threading.RLock()
        self._rng = random.Random()
        self.params = params or SimulationParameters()
        self.reset(self.params)

    def reset(self, params: SimulationParameters | None = None) -> dict[str, Any]:
        with self._lock:
            if params is not None:
                self.params = params
            self.current_step = 0
            self.node_states = [
                min(1.0, max(0.0, 0.5 + self._rng.uniform(-0.16, 0.16)))
                for _ in range(self.params.number_of_nodes)
            ]
            self.graph = GraphManager.random_graph(
                number_of_nodes=self.params.number_of_nodes,
                directed=self.params.directed,
                rng=self._rng,
            )
            self.posts = PostSystem()
            self.censorship_actions_remaining = self.params.max_censorship_actions_per_step
            self.outcome = Outcome.RUNNING
            self.message = "Simulation ready."
            self.timeline = [
                GameLogic.time_series_point(
                    step=self.current_step,
                    node_states=self.node_states,
                    tolerance=self.params.neutrality_tolerance,
                )
            ]
            return self.get_summary()

    def update_parameters(self, updates: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self.params = self.params.model_copy(update=updates)
            return self.reset(self.params)

    def get_parameters(self) -> dict[str, Any]:
        return self.params.model_dump()

    def _choose_post_type(self, state: float) -> PostType:
        weight = self.params.weight_state_influence_on_post_type
        misinformation_score = self.params.bias_misinformation + weight * (1.0 - state)
        fact_checking_score = self.params.bias_factchecking + weight * state
        neutral_score = self.params.bias_neutral + weight * max(0.0, 1.0 - abs(state - 0.5) * 2.0)
        options = [
            (PostType.MISINFORMATION, misinformation_score),
            (PostType.FACT_CHECKING, fact_checking_score),
            (PostType.NEUTRAL, neutral_score),
        ]
        total = sum(score for _, score in options)
        threshold = self._rng.random() * total
        cumulative = 0.0
        for post_type, score in options:
            cumulative += score
            if threshold <= cumulative:
                return post_type
        return PostType.NEUTRAL

    def _type_influence(self, node_id: int, post_type: PostType) -> float:
        if post_type == PostType.MISINFORMATION:
            return -self.params.influence_strength
        if post_type == PostType.FACT_CHECKING:
            return self.params.influence_strength
        return (0.5 - self.node_states[node_id]) * self.params.influence_strength * 0.45

    def _alignment_factor(self, state: float, post_type: PostType) -> float:
        if post_type == PostType.MISINFORMATION:
            return 1.5 - state
        if post_type == PostType.FACT_CHECKING:
            return 0.5 + state
        return 1.0 - abs(state - 0.5)

    def _type_modifier(self, post_type: PostType) -> float:
        if post_type == PostType.MISINFORMATION:
            return self.params.p_repost_misinformation
        if post_type == PostType.FACT_CHECKING:
            return self.params.p_repost_factchecking
        return self.params.p_repost_neutral

    def censor_posts(self, post_ids: list[str]) -> dict[str, Any]:
        with self._lock:
            allowed = max(0, self.censorship_actions_remaining)
            censored = self.posts.censor_posts(post_ids, allowed)
            self.censorship_actions_remaining = max(0, self.censorship_actions_remaining - len(censored))
            return {
                "censored_post_ids": censored,
                "censorship_actions_remaining": self.censorship_actions_remaining,
            }

    def step(self) -> dict[str, Any]:
        with self._lock:
            if self.outcome != Outcome.RUNNING:
                return self.get_summary()

            for node_id, state in enumerate(self.node_states):
                if self._rng.random() <= self.params.p_generate_base:
                    post_type = self._choose_post_type(state)
                    self.posts.create_post(post_type=post_type, creator_node=node_id, creation_step=self.current_step)

            state_deltas = [0.0 for _ in self.node_states]
            for post in self.posts.active_posts():
                current_emitters = list(post.active_emitters)
                post.active_emitters.clear()
                for emitter in current_emitters:
                    for neighbor in self.graph.neighbors_for_propagation(emitter):
                        if self.posts.mark_seen(post.id, neighbor):
                            state_deltas[neighbor] += self._type_influence(neighbor, post.type)

            for node_id, seen_post_ids in self.posts.node_seen_posts.items():
                node_state = self.node_states[node_id]
                for post_id in tuple(seen_post_ids):
                    post = self.posts.get_post(post_id)
                    if post is None or post.status.value != "active":
                        continue
                    if node_id == post.creator_node or node_id in post.reposted_by:
                        continue
                    repost_probability = sigmoid(
                        self.params.p_repost_base
                        * self._type_modifier(post.type)
                        * self._alignment_factor(node_state, post.type)
                        - 1.1
                    )
                    if self._rng.random() <= repost_probability:
                        self.posts.schedule_repost(post_id, node_id)

            if self._rng.random() <= self.params.p_add_edge:
                self.graph.add_random_edge(self._rng)
            if self._rng.random() <= self.params.p_remove_edge:
                self.graph.remove_random_edge(self._rng)

            self.node_states = [
                min(1.0, max(0.0, state + delta))
                for state, delta in zip(self.node_states, state_deltas, strict=True)
            ]
            self.posts.advance_emitters()
            self.current_step += 1
            self.censorship_actions_remaining = self.params.max_censorship_actions_per_step
            self.timeline.append(
                GameLogic.time_series_point(
                    step=self.current_step,
                    node_states=self.node_states,
                    tolerance=self.params.neutrality_tolerance,
                )
            )
            self.outcome, self.message = GameLogic.evaluate(
                step=self.current_step,
                node_states=self.node_states,
                params=self.params,
            )
            return self.get_summary()

    def get_graph_state(self) -> dict[str, Any]:
        with self._lock:
            return {
                "step": self.current_step,
                "directed": self.params.directed,
                "nodes": [
                    {
                        "id": node_id,
                        "state": state,
                        "classification": GameLogic.classify_state(
                            state,
                            self.params.neutrality_tolerance,
                        ),
                    }
                    for node_id, state in enumerate(self.node_states)
                ],
                "edges": [
                    {"source": source, "target": target}
                    for source, target in self.graph.edges()
                ],
            }

    def get_feed(self, node_id: int) -> dict[str, Any]:
        with self._lock:
            feed = [self.posts.serialize_post(post) for post in self.posts.get_feed_for_node(node_id)]
            return {"node_id": node_id, "posts": feed}

    def get_post_influence(self, post_id: str) -> dict[str, Any]:
        with self._lock:
            post = self.posts.get_post(post_id)
            if post is None:
                return {"post_id": post_id, "influenced_nodes": []}
            return {
                "post_id": post_id,
                "influenced_nodes": sorted(post.seen_by),
                "status": post.status.value,
            }

    def get_time_series(self) -> dict[str, Any]:
        with self._lock:
            return {
                "series": [
                    {
                        "step": point.step,
                        "misinformation": point.misinformation,
                        "fact_checking": point.fact_checking,
                        "neutral": point.neutral,
                    }
                    for point in self.timeline
                ]
            }

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            percentages = GameLogic.percentages(self.node_states, self.params.neutrality_tolerance)
            return {
                "current_step": self.current_step,
                "max_steps": self.params.N_steps,
                "outcome": self.outcome.value,
                "message": self.message,
                "percentages": percentages,
                "censorship_actions_remaining": self.censorship_actions_remaining,
            }

    def get_summary(self) -> dict[str, Any]:
        return {
            "graph": self.get_graph_state(),
            "status": self.get_status(),
            "time_series": self.get_time_series(),
            "parameters": self.get_parameters(),
        }
