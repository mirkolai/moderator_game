import { Rng } from './rng';

/**
 * Undirected/directed dynamic graph over `numberOfNodes` integer node ids,
 * backed by an adjacency-set representation. Ported from the Python
 * `GraphManager` (backend/app/domain/graph.py) with the community/clustering
 * network generator (`modGameNet`) reimplemented without a graph library
 * dependency, since the browser bundle has no equivalent to networkx.
 */
export class GraphManager {
  readonly numberOfNodes: number;
  readonly directed: boolean;
  readonly adjacency: Map<number, Set<number>>;

  constructor(numberOfNodes: number, directed: boolean, adjacency?: Map<number, Set<number>>) {
    this.numberOfNodes = numberOfNodes;
    this.directed = directed;
    this.adjacency = adjacency ?? new Map();
    if (this.adjacency.size === 0) {
      for (let node = 0; node < numberOfNodes; node += 1) {
        this.adjacency.set(node, new Set());
      }
    }
  }

  static randomGraph(numberOfNodes: number, directed: boolean, rng: Rng, edgeProbability = 0.18): GraphManager {
    const graph = new GraphManager(numberOfNodes, directed);
    for (let source = 0; source < numberOfNodes; source += 1) {
      for (let target = 0; target < numberOfNodes; target += 1) {
        if (source === target) continue;
        if (!directed && target <= source) continue;
        if (rng.random() < edgeProbability) {
          graph.addEdge(source, target);
        }
      }
    }
    return graph;
  }

  /**
   * Builds the moderation-game social network: start with `communities`
   * balanced clusters (no hubs), guarantee connectivity, then increase
   * clustering (triangles) by growing hubs through friend-of-friend links
   * until the average clustering coefficient reaches `minClusteringCoefficient`.
   */
  static modGameNet(
    numberOfNodes = 50,
    communities = 2,
    averageDegree = 5,
    minClusteringCoefficient = 0.4,
    rng?: Rng,
  ): GraphManager {
    const random = rng ?? new Rng();
    const graph = new GraphManager(numberOfNodes, false);

    const averageProbability = averageDegree / Math.max(1, numberOfNodes - 1);
    const pIn = averageProbability * 1.9;
    const pOut = averageProbability * 0.1;

    const communityOf = new Int32Array(numberOfNodes);
    for (let node = 0; node < numberOfNodes; node += 1) {
      communityOf[node] = node % communities;
    }

    for (let source = 0; source < numberOfNodes; source += 1) {
      for (let target = source + 1; target < numberOfNodes; target += 1) {
        const probability = communityOf[source] === communityOf[target] ? pIn : pOut;
        if (random.random() < probability) {
          graph.addEdge(source, target);
        }
      }
    }

    ensureConnected(graph, random);
    growClustering(graph, random, minClusteringCoefficient);

    return graph;
  }

  addEdge(source: number, target: number): boolean {
    if (source === target || this.adjacency.get(source)?.has(target)) {
      return false;
    }
    this.adjacency.get(source)!.add(target);
    if (!this.directed) {
      this.adjacency.get(target)!.add(source);
    }
    return true;
  }

  removeEdge(source: number, target: number): boolean {
    if (!this.adjacency.get(source)?.has(target)) {
      return false;
    }
    this.adjacency.get(source)!.delete(target);
    if (!this.directed) {
      this.adjacency.get(target)!.delete(source);
    }
    return true;
  }

  neighborsForPropagation(nodeId: number): Set<number> {
    return new Set(this.adjacency.get(nodeId));
  }

  addRandomEdge(rng: Rng): [number, number] | null {
    const candidates: Array<[number, number]> = [];
    for (let source = 0; source < this.numberOfNodes; source += 1) {
      for (let target = 0; target < this.numberOfNodes; target += 1) {
        if (source === target) continue;
        if (!this.directed && target <= source) continue;
        if (!this.adjacency.get(source)?.has(target)) {
          candidates.push([source, target]);
        }
      }
    }
    if (candidates.length === 0) return null;
    const [source, target] = rng.choice(candidates);
    this.addEdge(source, target);
    return [source, target];
  }

  /**
   * Adds a random edge between two unconnected nodes that share the same
  * opinion cluster. A pair qualifies when both nodes are low-cluster
  * (state <= opinionThreshold) or both are high-cluster
  * (state >= 1 - opinionThreshold).
   * Returns null if no qualifying pair exists.
   */
  addConvergentEdge(
    nodeStates: number[],
    opinionThreshold: number,
    rng: Rng,
  ): [number, number] | null {
    const candidates: Array<[number, number]> = [];
    for (let source = 0; source < this.numberOfNodes; source += 1) {
      for (let target = 0; target < this.numberOfNodes; target += 1) {
        if (source === target) continue;
        if (!this.directed && target <= source) continue;
        if (this.adjacency.get(source)?.has(target)) continue;
        const sourceState = nodeStates[source];
        const targetState = nodeStates[target];
        const bothGamma = sourceState <= opinionThreshold && targetState <= opinionThreshold;
        const bothAlpha = sourceState >= 1 - opinionThreshold && targetState >= 1 - opinionThreshold;
        if (bothGamma || bothAlpha) {
          candidates.push([source, target]);
        }
      }
    }
    if (candidates.length === 0) return null;
    const [source, target] = rng.choice(candidates);
    this.addEdge(source, target);
    return [source, target];
  }

  removeRandomEdge(rng: Rng): [number, number] | null {
    const candidates = this.edges();
    if (candidates.length === 0) return null;
    const [source, target] = rng.choice(candidates);
    this.removeEdge(source, target);
    return [source, target];
  }

  /**
   * Removes a random edge whose endpoints differ in opinion by at least
   * `threshold`. Leaves the graph unchanged if no such edge exists.
   */
  removeDiscordantEdge(nodeStates: number[], threshold: number, rng: Rng): [number, number] | null {
    const candidates = this.edges().filter(
      ([source, target]) => Math.abs(nodeStates[source] - nodeStates[target]) >= threshold,
    );
    if (candidates.length === 0) return null;
    const [source, target] = rng.choice(candidates);
    this.removeEdge(source, target);
    return [source, target];
  }

  edges(): Array<[number, number]> {
    const edgeList: Array<[number, number]> = [];
    for (const [source, targets] of this.adjacency) {
      for (const target of targets) {
        if (this.directed || source < target) {
          edgeList.push([source, target]);
        }
      }
    }
    return edgeList;
  }

  degree(nodeId: number): number {
    return this.adjacency.get(nodeId)?.size ?? 0;
  }
}

function connectedComponents(graph: GraphManager): number[][] {
  const visited = new Set<number>();
  const components: number[][] = [];
  for (let start = 0; start < graph.numberOfNodes; start += 1) {
    if (visited.has(start)) continue;
    const component: number[] = [];
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const node = stack.pop()!;
      component.push(node);
      for (const neighbor of graph.adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function ensureConnected(graph: GraphManager, rng: Rng): void {
  let guard = graph.numberOfNodes * 4;
  let components = connectedComponents(graph);
  while (components.length > 1 && guard > 0) {
    const [componentA, componentB] = rng.sample(components, 2);
    graph.addEdge(rng.choice(componentA), rng.choice(componentB));
    components = connectedComponents(graph);
    guard -= 1;
  }
}

function averageClusteringCoefficient(graph: GraphManager): number {
  let total = 0;
  for (let node = 0; node < graph.numberOfNodes; node += 1) {
    const neighbors = [...(graph.adjacency.get(node) ?? [])];
    const degree = neighbors.length;
    if (degree < 2) continue;
    let links = 0;
    for (let i = 0; i < neighbors.length; i += 1) {
      for (let j = i + 1; j < neighbors.length; j += 1) {
        if (graph.adjacency.get(neighbors[i])?.has(neighbors[j])) {
          links += 1;
        }
      }
    }
    total += (2 * links) / (degree * (degree - 1));
  }
  return total / graph.numberOfNodes;
}

function growClustering(graph: GraphManager, rng: Rng, minClusteringCoefficient: number): void {
  const maxAttempts = graph.numberOfNodes * 200;
  let attempts = 0;
  while (averageClusteringCoefficient(graph) < minClusteringCoefficient && attempts < maxAttempts) {
    attempts += 1;

    const degreeWeights = Array.from({ length: graph.numberOfNodes }, (_, node) => graph.degree(node));
    const totalWeight = degreeWeights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) break;

    let threshold = rng.random() * totalWeight;
    let hub = 0;
    for (let node = 0; node < graph.numberOfNodes; node += 1) {
      threshold -= degreeWeights[node];
      if (threshold <= 0) {
        hub = node;
        break;
      }
    }

    if (graph.degree(hub) < 1) continue;
    const friend = rng.choice([...graph.adjacency.get(hub)!]);
    if (graph.degree(friend) < 2) continue;

    const neighbors = new Set(graph.adjacency.get(friend));
    neighbors.delete(hub);
    if (neighbors.size === 0) continue;

    const friendOfFriend = rng.choice([...neighbors]);
    if (!graph.adjacency.get(hub)?.has(friendOfFriend)) {
      graph.addEdge(hub, friendOfFriend);
    }
  }
}
