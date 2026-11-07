export type Classification = 'pro_forest' | 'pro_zoo';
export type PostType = Classification;
export type PostStatus = 'active' | 'censored';
export type Outcome = 'running' | 'won' | 'lost';

export interface NodeDatum {
  id: number;
  state: number;
  classification: Classification;
  posts_count: number;
}

export interface EdgeDatum {
  source: number;
  target: number;
}

export interface GraphState {
  step: number;
  directed: boolean;
  nodes: NodeDatum[];
  edges: EdgeDatum[];
}

export interface DayPropagationEvent {
  post_id: string;
  post_type: PostType;
  source_node_id: number;
  target_node_id: number;
  target_state: number;
}

export interface DayAnimation {
  id: number;
  initial_states: number[];
  final_states: number[];
  events: DayPropagationEvent[];
}

export interface PostRecord {
  id: string;
  category: PostType;
  content: string;
  creator_node: number;
  creation_step: number;
  seen_by: number[];
  reposted_by: number[];
  repost_count: number;
  status: PostStatus;
}

export interface FeedResponse {
  node_id: number;
  posts: PostRecord[];
}

export interface InfluenceResponse {
  post_id: string;
  influenced_nodes: number[];
  status: PostStatus;
}

export interface TimeSeriesPoint {
  step: number;
  pro_forest: number;
  pro_zoo: number;
}

export interface TimeSeriesResponse {
  series: TimeSeriesPoint[];
}

export interface StatusResponse {
  current_step: number;
  max_steps: number;
  outcome: Outcome;
  message: string;
  percentages: {
    pro_forest: number;
    pro_zoo: number;
  };
  censorship_actions_remaining: number;
}

export interface SimulationParameters {
  number_of_nodes: number;
  p_generate_base: number;
  weight_state_influence_on_post_type: number;
  bias_pro_forest: number;
  bias_pro_zoo: number;
  p_repost_base: number;
  p_repost_pro_forest: number;
  p_repost_pro_zoo: number;
  influence_strength: number;
  debunk_influence_recovery: number;
  p_add_edge: number;
  edge_addition_opinion_threshold: number;
  p_remove_edge: number;
  edge_removal_opinion_threshold: number;
  max_censorship_actions_per_step: number;
  election_step: number;
}

export interface SnapshotResponse {
  graph: GraphState;
  status: StatusResponse;
  time_series: TimeSeriesResponse;
  parameters: SimulationParameters;
}

export interface AppNotification {
  id: string;
  message: string;
  step: number;
  read: boolean;
  timestamp: number;
}
