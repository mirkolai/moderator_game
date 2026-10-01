import type { SimulationParameters } from '../types';

/** Inclusive [min, max] bounds mirroring the original Pydantic field constraints. */
const PARAMETER_RANGES: Record<keyof SimulationParameters, [number, number]> = {
  number_of_nodes: [5, 200],
  p_generate_base: [0, 1],
  weight_state_influence_on_post_type: [0, 5],
  bias_gamma: [0, 5],
  bias_alpha: [0, 5],
  bias_beta: [0, 5],
  p_repost_base: [0, 5],
  p_repost_gamma: [0, 5],
  p_repost_alpha: [0, 5],
  p_repost_beta: [0, 5],
  influence_strength: [0, 1],
  p_add_edge: [0, 1],
  edge_addition_opinion_threshold: [0, 0.5],
  p_remove_edge: [0, 1],
  edge_removal_opinion_threshold: [0, 1],
  max_censorship_actions_per_step: [0, 25],
  election_step: [15, 30],
  win_threshold: [0.5, 1],
  center_tolerance: [0, 0.5],
};

export const DEFAULT_PARAMETERS: SimulationParameters = {
  number_of_nodes: 24,

  p_generate_base: 0.45,
  weight_state_influence_on_post_type: 1.35,
  bias_gamma: 3,
  bias_alpha: 1,
  bias_beta: 2,

  p_repost_base: 1.8,
  p_repost_gamma: 3,
  p_repost_alpha: 1,
  p_repost_beta: 2,

  influence_strength: 0.08,

  p_add_edge: 0.3,
  edge_addition_opinion_threshold: 0.35,
  p_remove_edge: 0.3,
  edge_removal_opinion_threshold: 0.3,

  max_censorship_actions_per_step: 1,

  election_step: 20,
  win_threshold: 0.8,
  center_tolerance: 0.17,
};

/** Clamps every field of a partial parameter update to its valid range. */
export function clampParameters(params: SimulationParameters): SimulationParameters {
  const clamped = { ...params };
  for (const key of Object.keys(PARAMETER_RANGES) as Array<keyof SimulationParameters>) {
    const [min, max] = PARAMETER_RANGES[key];
    const value = clamped[key];
    clamped[key] = Math.min(max, Math.max(min, value)) as never;
  }
  return clamped;
}
