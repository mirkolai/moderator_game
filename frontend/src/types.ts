export type Classification = 'alpha' | 'beta' | 'gamma';
export type PostType = Classification;
export type PostStatus = 'active' | 'censored';
export type Outcome = 'running' | 'won' | 'lost';

export interface NodeDatum {
  id: number;
  state: number;
  classification: Classification;
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
  alpha: number;
  beta: number;
  gamma: number;
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
    alpha: number;
    beta: number;
    gamma: number;
  };
  censorship_actions_remaining: number;
}

export interface SimulationParameters {
  number_of_nodes: number;
  p_generate_base: number;
  weight_state_influence_on_post_type: number;
  bias_gamma: number;
  bias_alpha: number;
  bias_beta: number;
  p_repost_base: number;
  p_repost_gamma: number;
  p_repost_alpha: number;
  p_repost_beta: number;
  influence_strength: number;
  p_add_edge: number;
  edge_addition_gamma_threshold: number;
  edge_addition_alpha_threshold: number;
  p_remove_edge: number;
  edge_removal_opinion_threshold: number;
  max_censorship_actions_per_step: number;
  election_step: number;
  win_threshold: number;
  center_tolerance: number;
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
