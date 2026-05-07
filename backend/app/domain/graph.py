from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass(slots=True)
class GraphManager:
    number_of_nodes: int
    directed: bool
    adjacency: dict[int, set[int]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.adjacency:
            self.adjacency = {node_id: set() for node_id in range(self.number_of_nodes)}

    @classmethod
    def random_graph(
        cls,
        number_of_nodes: int,
        directed: bool,
        rng: random.Random,
        edge_probability: float = 0.18,
    ) -> "GraphManager":
        graph = cls(number_of_nodes=number_of_nodes, directed=directed)
        for source in range(number_of_nodes):
            for target in range(number_of_nodes):
                if source == target:
                    continue
                if not directed and target <= source:
                    continue
                if rng.random() < edge_probability:
                    graph.add_edge(source, target)
        return graph

    def add_edge(self, source: int, target: int) -> bool:
        if source == target or target in self.adjacency[source]:
            return False
        self.adjacency[source].add(target)
        if not self.directed:
            self.adjacency[target].add(source)
        return True

    def remove_edge(self, source: int, target: int) -> bool:
        if target not in self.adjacency[source]:
            return False
        self.adjacency[source].remove(target)
        if not self.directed:
            self.adjacency[target].remove(source)
        return True

    def neighbors_for_propagation(self, node_id: int) -> set[int]:
        return set(self.adjacency[node_id])

    def add_random_edge(self, rng: random.Random) -> tuple[int, int] | None:
        candidates: list[tuple[int, int]] = []
        for source in range(self.number_of_nodes):
            for target in range(self.number_of_nodes):
                if source == target:
                    continue
                if not self.directed and target <= source:
                    continue
                if target not in self.adjacency[source]:
                    candidates.append((source, target))
        if not candidates:
            return None
        source, target = rng.choice(candidates)
        self.add_edge(source, target)
        return source, target

    def add_convergent_edge(
        self,
        node_states: list[float],
        dictatorship_threshold: float,
        democracy_threshold: float,
        rng: random.Random,
    ) -> tuple[int, int] | None:
        """Add a random edge between two unconnected nodes that share the same opinion cluster.

        A pair qualifies when both nodes are dictatorship-leaning
        (state <= dictatorship_threshold) or both are democracy-leaning
        (state >= democracy_threshold).  Returns None if no qualifying pair exists.
        """
        candidates: list[tuple[int, int]] = []
        for source in range(self.number_of_nodes):
            for target in range(self.number_of_nodes):
                if source == target:
                    continue
                if not self.directed and target <= source:
                    continue
                if target in self.adjacency[source]:
                    continue
                s_state = node_states[source]
                t_state = node_states[target]
                both_dictatorship = s_state <= dictatorship_threshold and t_state <= dictatorship_threshold
                both_democracy = s_state >= democracy_threshold and t_state >= democracy_threshold
                if both_dictatorship or both_democracy:
                    candidates.append((source, target))
        if not candidates:
            return None
        source, target = rng.choice(candidates)
        self.add_edge(source, target)
        return source, target

    def remove_random_edge(self, rng: random.Random) -> tuple[int, int] | None:
        candidates = self.edges()
        if not candidates:
            return None
        source, target = rng.choice(candidates)
        self.remove_edge(source, target)
        return source, target

    def remove_discordant_edge(
        self,
        node_states: list[float],
        threshold: float,
        rng: random.Random,
    ) -> tuple[int, int] | None:
        """Remove a random edge whose endpoints differ in opinion by at least *threshold*.

        Returns None (and leaves the graph unchanged) if no such edge exists.
        """
        candidates = [
            (source, target)
            for source, target in self.edges()
            if abs(node_states[source] - node_states[target]) >= threshold
        ]
        if not candidates:
            return None
        source, target = rng.choice(candidates)
        self.remove_edge(source, target)
        return source, target

    def edges(self) -> list[tuple[int, int]]:
        edge_list: list[tuple[int, int]] = []
        for source, targets in self.adjacency.items():
            for target in targets:
                if self.directed or source < target:
                    edge_list.append((source, target))
        return edge_list
