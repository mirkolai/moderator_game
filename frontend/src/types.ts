export type Classification = 'misinformation' | 'fact-checking' | 'neutral';
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
  type: PostType;
  creator_node: number;
  creation_step: number;
  seen_by: number[];
  reposted_by: number[];
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
  misinformation: number;
  fact_checking: number;
  neutral: number;
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
    misinformation: number;
    'fact-checking': number;
    neutral: number;
  };
  censorship_actions_remaining: number;
}

export interface SimulationParameters {
  number_of_nodes: number;
  graph_type: 'random';
  directed: boolean;
  p_generate_base: number;
  weight_state_influence_on_post_type: number;
  bias_misinformation: number;
  bias_factchecking: number;
  bias_neutral: number;
  p_repost_base: number;
  p_repost_misinformation: number;
  p_repost_factchecking: number;
  p_repost_neutral: number;
  influence_strength: number;
  p_add_edge: number;
  p_remove_edge: number;
  max_censorship_actions_per_step: number;
  N_steps: number;
  win_threshold: number;
  neutrality_tolerance: number;
}

export interface SnapshotResponse {
  graph: GraphState;
  status: StatusResponse;
  time_series: TimeSeriesResponse;
  parameters: SimulationParameters;
}
