import { GameLogic } from './gameLogic';
import { GraphManager } from './graph';
import { PostSystem } from './postSystem';
import { DEFAULT_PARAMETERS, clampParameters } from './parameters';
import { Rng } from './rng';
import type {
  Classification,
  DayPropagationEvent,
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
  private seeded = false;
  private currentStep = 0;
  private nodeStates: number[] = [];
  private lastPropagationEvents: DayPropagationEvent[] = [];
  private graph!: GraphManager;
  private posts!: PostSystem;
  private censorshipActionsRemaining = 0;
  private outcome: Outcome = 'running';
  private message = '';
  private timeline: TimeSeriesPoint[] = [];

  constructor(params: SimulationParameters = DEFAULT_PARAMETERS, seed?: number) {
    this.params = clampParameters(params);
    this.reset(this.params, seed);
  }

  /** When a seed is given the whole run becomes reproducible (used by the tutorial). */
  reset(params: SimulationParameters = this.params, seed?: number): SnapshotResponse {
    if (seed !== undefined) {
      this.rng = new Rng(seed);
      this.seeded = true;
    } else if (this.seeded) {
      this.rng = new Rng();
      this.seeded = false;
    }
    this.params = clampParameters(params);
    this.currentStep = 0;
    this.nodeStates = Array.from({ length: this.params.number_of_nodes }, () => 1);
    this.lastPropagationEvents = [];
    this.graph = GraphManager.modGameNet(this.params.number_of_nodes, 2, 5, 0.4, this.rng);
    this.posts = new PostSystem(this.rng);
    this.censorshipActionsRemaining = this.params.max_censorship_actions_per_step;
    this.outcome = 'running';
    this.message = 'Simulation ready.';
    this.timeline = [
      GameLogic.timeSeriesPoint(
        this.currentStep,
        this.nodeStates,
      ),
    ];
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
    const options: Array<[Classification, number, number]> = [
      ['pro_zoo', this.params.bias_pro_zoo + weight * (1.0 - state), this.params.bias_pro_zoo],
      ['pro_forest', this.params.bias_pro_forest + weight * state, this.params.bias_pro_forest],
    ];
    const enabledOptions = options.filter(([, , bias]) => bias > 0);
    if (enabledOptions.length === 0) {
      throw new Error('At least one publishing bias must be greater than zero.');
    }
    const total = enabledOptions.reduce((sum, [, score]) => sum + score, 0);
    const threshold = this.rng.random() * total;
    let cumulative = 0;
    for (const [postType, score] of enabledOptions) {
      cumulative += score;
      if (threshold <= cumulative) return postType;
    }
    return enabledOptions[enabledOptions.length - 1][0];
  }

  private typeInfluence(postType: Classification): number {
    return postType === 'pro_zoo' ? -this.params.influence_strength : this.params.influence_strength;
  }

  private alignmentFactor(state: number, postType: Classification): number {
    return postType === 'pro_zoo' ? 1.5 - state : 0.5 + state;
  }

  private typeModifier(postType: Classification): number {
    return postType === 'pro_zoo' ? this.params.p_repost_pro_zoo : this.params.p_repost_pro_forest;
  }

  censorPosts(postIds: string[]): { censored_post_ids: string[]; censorship_actions_remaining: number } {
    const allowed = Math.max(0, this.censorshipActionsRemaining);
    const censored = this.posts.censorPosts(postIds, allowed);
    this.censorshipActionsRemaining = Math.max(0, this.censorshipActionsRemaining - censored.length);
    for (const postId of censored) {
      const post = this.posts.getPost(postId);
      if (post === undefined) continue;
      const recovery = this.params.debunk_influence_recovery;
      const restoredInfluence = this.typeInfluence(post.type) * recovery;
      for (const nodeId of post.seenBy) {
        if (nodeId === post.creatorNode) continue;
        this.nodeStates[nodeId] = Math.min(1, Math.max(0, this.nodeStates[nodeId] - restoredInfluence));
      }
    }
    if (censored.length > 0) {
      this.timeline[this.timeline.length - 1] = GameLogic.timeSeriesPoint(this.currentStep, this.nodeStates);
    }
    return { censored_post_ids: censored, censorship_actions_remaining: this.censorshipActionsRemaining };
  }

  getLastPropagationEvents(): DayPropagationEvent[] {
    return this.lastPropagationEvents;
  }

  step(): SnapshotResponse {
    if (this.outcome !== 'running') {
      return this.getSummary();
    }

    this.lastPropagationEvents = [];
    const initialStates = [...this.nodeStates];
    this.nodeStates.forEach((state, nodeId) => {
      if (this.rng.random() <= this.params.p_generate_base) {
        const postType = this.choosePostType(state);
        this.posts.createPost(postType, nodeId, this.currentStep);
      }
    });

    const stateDeltas = this.nodeStates.map(() => 0);
    const propagationEvents: Array<Omit<DayPropagationEvent, 'target_state'> & { influence: number }> = [];
    for (const post of this.posts.activePosts()) {
      const currentEmitters = [...post.activeEmitters];
      post.activeEmitters.clear();
      for (const emitter of currentEmitters) {
        if (emitter !== post.creatorNode) {
          post.repostCount += 1;
        }
        for (const neighbor of this.graph.neighborsForPropagation(emitter)) {
          if (this.posts.markSeen(post.id, neighbor)) {
            const influence = this.typeInfluence(post.type);
            stateDeltas[neighbor] += influence;
            propagationEvents.push({
              post_id: post.id,
              post_type: post.type,
              source_node_id: emitter,
              target_node_id: neighbor,
              influence,
            });
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
    const visualStates = [...initialStates];
    const lastEventByNode = new Map<number, number>();
    const pendingEvents = propagationEvents.map(({ influence, ...event }, index) => {
      const state = Math.min(1, Math.max(0, visualStates[event.target_node_id] + influence));
      visualStates[event.target_node_id] = state;
      lastEventByNode.set(event.target_node_id, index);
      return { ...event, target_state: state };
    });
    this.lastPropagationEvents = pendingEvents;
    for (const [nodeId, eventIndex] of lastEventByNode) {
      this.lastPropagationEvents[eventIndex].target_state = this.nodeStates[nodeId];
    }
    this.posts.advanceEmitters();
    this.currentStep += 1;
    this.censorshipActionsRemaining = this.params.max_censorship_actions_per_step;
    this.timeline.push(
      GameLogic.timeSeriesPoint(
        this.currentStep,
        this.nodeStates,
      ),
    );

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
        classification: GameLogic.classifyState(state),
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
    const percentages = GameLogic.percentages(this.nodeStates);
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
