import { GameLogic } from './gameLogic';
import { GraphManager } from './graph';
import { PostSystem } from './postSystem';
import { DEFAULT_PARAMETERS, clampParameters } from './parameters';
import { Rng } from './rng';
import type {
  Classification,
  FeedResponse,
  GraphState,
  InfluenceResponse,
  Outcome,
  SimulationParameters,
  SnapshotResponse,
  StatusResponse,
  TimeSeriesPoint,
  TimeSeriesResponse,
} from '../types';

function sigmoid(value: number): number {
  return 1.0 / (1.0 + Math.exp(-value));
}

/**
 * Synchronous, in-memory simulation engine that replaces the FastAPI backend.
 * Runs entirely client-side: generation, propagation, reposting, network
 * evolution, and win/loss evaluation. Ported from `SimulationEngine`
 * (backend/app/domain/simulation_engine.py).
 */
export class SimulationEngine {
  params: SimulationParameters;

  private rng = new Rng();
  private currentStep = 0;
  private nodeStates: number[] = [];
  private graph!: GraphManager;
  private posts!: PostSystem;
  private censorshipActionsRemaining = 0;
  private outcome: Outcome = 'running';
  private message = '';
  private timeline: TimeSeriesPoint[] = [];

  constructor(params: SimulationParameters = DEFAULT_PARAMETERS) {
    this.params = clampParameters(params);
    this.reset(this.params);
  }

  reset(params: SimulationParameters = this.params): SnapshotResponse {
    this.params = clampParameters(params);
    this.currentStep = 0;
    this.nodeStates = Array.from({ length: this.params.number_of_nodes }, () => 0.5);
    this.graph = GraphManager.modGameNet(this.params.number_of_nodes, 2, 5, 0.4, this.rng);
    this.posts = new PostSystem(this.rng);
    this.censorshipActionsRemaining = this.params.max_censorship_actions_per_step;
    this.outcome = 'running';
    this.message = 'Simulation ready.';
    this.timeline = [GameLogic.timeSeriesPoint(this.currentStep, this.nodeStates, this.params.center_tolerance)];
    return this.getSummary();
  }

  updateParameters(updates: Partial<SimulationParameters>): SnapshotResponse {
    return this.reset({ ...this.params, ...updates });
  }

  getParameters(): SimulationParameters {
    return this.params;
  }

  private choosePostType(state: number): Classification {
    const weight = this.params.weight_state_influence_on_post_type;
    const gammaScore = this.params.bias_gamma + weight * (1.0 - state);
    const alphaScore = this.params.bias_alpha + weight * state;
    const betaScore = this.params.bias_beta + weight * Math.max(0, 1.0 - Math.abs(state - 0.5) * 2.0);
    const options: Array<[Classification, number]> = [
      ['gamma', gammaScore],
      ['alpha', alphaScore],
      ['beta', betaScore],
    ];
    const total = options.reduce((sum, [, score]) => sum + score, 0);
    const threshold = this.rng.random() * total;
    let cumulative = 0;
    for (const [postType, score] of options) {
      cumulative += score;
      if (threshold <= cumulative) return postType;
    }
    return 'beta';
  }

  private typeInfluence(nodeId: number, postType: Classification): number {
    if (postType === 'gamma') return -this.params.influence_strength;
    if (postType === 'alpha') return this.params.influence_strength;
    return (0.5 - this.nodeStates[nodeId]) * this.params.influence_strength * 0.45;
  }

  private alignmentFactor(state: number, postType: Classification): number {
    if (postType === 'gamma') return 1.5 - state;
    if (postType === 'alpha') return 0.5 + state;
    return 1.0 - Math.abs(state - 0.5);
  }

  private typeModifier(postType: Classification): number {
    if (postType === 'gamma') return this.params.p_repost_gamma;
    if (postType === 'alpha') return this.params.p_repost_alpha;
    return this.params.p_repost_beta;
  }

  censorPosts(postIds: string[]): { censored_post_ids: string[]; censorship_actions_remaining: number } {
    const allowed = Math.max(0, this.censorshipActionsRemaining);
    const censored = this.posts.censorPosts(postIds, allowed);
    this.censorshipActionsRemaining = Math.max(0, this.censorshipActionsRemaining - censored.length);
    return { censored_post_ids: censored, censorship_actions_remaining: this.censorshipActionsRemaining };
  }

  step(): SnapshotResponse {
    if (this.outcome !== 'running') {
      return this.getSummary();
    }

    this.nodeStates.forEach((state, nodeId) => {
      if (this.rng.random() <= this.params.p_generate_base) {
        const postType = this.choosePostType(state);
        this.posts.createPost(postType, nodeId, this.currentStep);
      }
    });

    const stateDeltas = this.nodeStates.map(() => 0);
    for (const post of this.posts.activePosts()) {
      const currentEmitters = [...post.activeEmitters];
      post.activeEmitters.clear();
      for (const emitter of currentEmitters) {
        if (emitter !== post.creatorNode) {
          post.repostCount += 1;
        }
        for (const neighbor of this.graph.neighborsForPropagation(emitter)) {
          if (this.posts.markSeen(post.id, neighbor)) {
            stateDeltas[neighbor] += this.typeInfluence(neighbor, post.type);
          }
        }
      }
    }

    for (const [nodeId, seenPostIds] of this.posts.nodeSeenPosts) {
      const nodeState = this.nodeStates[nodeId];
      for (const postId of [...seenPostIds]) {
        const post = this.posts.getPost(postId);
        if (post === undefined || post.status !== 'active') continue;
        if (nodeId === post.creatorNode || post.repostedBy.has(nodeId)) continue;
        const repostProbability = sigmoid(
          this.params.p_repost_base * this.typeModifier(post.type) * this.alignmentFactor(nodeState, post.type) -
            1.1,
        );
        if (this.rng.random() <= repostProbability) {
          this.posts.scheduleRepost(postId, nodeId);
        }
      }
    }

    if (this.rng.random() <= this.params.p_add_edge) {
      this.graph.addConvergentEdge(
        this.nodeStates,
        this.params.edge_addition_opinion_threshold,
        this.rng,
      );
    }
    if (this.rng.random() <= this.params.p_remove_edge) {
      this.graph.removeDiscordantEdge(this.nodeStates, this.params.edge_removal_opinion_threshold, this.rng);
    }

    this.nodeStates = this.nodeStates.map((state, index) => Math.min(1, Math.max(0, state + stateDeltas[index])));
    this.posts.advanceEmitters();
    this.currentStep += 1;
    this.censorshipActionsRemaining = this.params.max_censorship_actions_per_step;
    this.timeline.push(GameLogic.timeSeriesPoint(this.currentStep, this.nodeStates, this.params.center_tolerance));

    const evaluation = GameLogic.evaluate(this.currentStep, this.nodeStates, this.params);
    this.outcome = evaluation.outcome;
    this.message = evaluation.message;

    return this.getSummary();
  }

  getGraphState(): GraphState {
    const postsCreatedByNode = this.posts.getCreatedPostCounts(this.nodeStates.length);
    return {
      step: this.currentStep,
      directed: false,
      nodes: this.nodeStates.map((state, nodeId) => ({
        id: nodeId,
        state,
        classification: GameLogic.classifyState(state, this.params.center_tolerance),
        posts_count: postsCreatedByNode[nodeId],
      })),
      edges: this.graph.edges().map(([source, target]) => ({ source, target })),
    };
  }

  getFeed(nodeId: number): FeedResponse {
    const feed = this.posts.getFeedForNode(nodeId).map((post) => this.posts.serializePost(post));
    return { node_id: nodeId, posts: feed };
  }

  getPostInfluence(postId: string): InfluenceResponse {
    const post = this.posts.getPost(postId);
    if (post === undefined) {
      return { post_id: postId, influenced_nodes: [], status: 'active' };
    }
    return {
      post_id: postId,
      influenced_nodes: [...post.seenBy].sort((a, b) => a - b),
      status: post.status,
    };
  }

  getTimeSeries(): TimeSeriesResponse {
    return { series: this.timeline };
  }

  getStatus(): StatusResponse {
    const percentages = GameLogic.percentages(this.nodeStates, this.params.center_tolerance);
    return {
      current_step: this.currentStep,
      max_steps: this.params.election_step,
      outcome: this.outcome,
      message: this.message,
      percentages,
      censorship_actions_remaining: this.censorshipActionsRemaining,
    };
  }

  getSummary(): SnapshotResponse {
    return {
      graph: this.getGraphState(),
      status: this.getStatus(),
      time_series: this.getTimeSeries(),
      parameters: this.getParameters(),
    };
  }
}
