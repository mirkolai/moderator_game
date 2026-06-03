from __future__ import annotations

import random
from dataclasses import dataclass, field
import networkx as nx
import random


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
    

    # moderation game network with (default two) communities:

    # start with communities (no hubs or clustering),
    # make sure it's connected,
    # then increase clustering (triangles) and grow hubs
    # by connecting hubs with their friends of friends
    @classmethod
    def mod_game_net(cls,number_of_nodes=50,communities=2, avg_k=5,min_cc=0.4,rng=None,) -> "GraphManager":
        if rng is None:
            rng = random.Random()

        avg_p = avg_k / (number_of_nodes - 1)
        p_in = avg_p * 1.9
        p_out = avg_p * 0.1

        G = nx.gaussian_random_partition_graph(
            number_of_nodes,
            number_of_nodes // communities,
            number_of_nodes * 10,
            p_in,
            p_out
        )

        # garantisci connettività
        while not nx.is_connected(G):
            components = list(nx.connected_components(G))
            c1, c2 = rng.sample(components, 2)
            G.add_edge(rng.choice(list(c1)), rng.choice(list(c2)))

        # aumenta clustering
        while nx.average_clustering(G) < min_cc:
            hub = rng.choices(
                list(G.nodes()),
                weights=[G.degree(n) for n in G]
            )[0]

            if G.degree(hub) < 1:
                continue

            friend = rng.choice(list(G.neighbors(hub)))

            if G.degree(friend) < 2:
                continue

            neighbors = set(G.neighbors(friend))
            neighbors.discard(hub)

            if not neighbors:
                continue

            fof = rng.choice(list(neighbors))

            if not G.has_edge(hub, fof):
                G.add_edge(hub, fof)

        # ---- conversione finale a GraphManager ----
        graph = cls(number_of_nodes=number_of_nodes, directed=False)

        for u, v in G.edges():
            graph.add_edge(u, v)

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
