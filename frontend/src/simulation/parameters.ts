import type { SimulationParameters } from '../types';

type NumericParameterKey = {
  [Key in keyof SimulationParameters]: SimulationParameters[Key] extends number ? Key : never;
}[keyof SimulationParameters];

/** Inclusive [min, max] bounds mirroring the original Pydantic field constraints. */
const PARAMETER_RANGES: Record<NumericParameterKey, [number, number]> = {
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

  p_generate_base: 0.4,
  weight_state_influence_on_post_type: 1.35,
  alignment_constrained_posting: false,
  bias_gamma: 2.8,
  bias_alpha: 1.2,
  bias_beta: 2,

  p_repost_base: 1.8,
  p_repost_gamma: 2.8,
  p_repost_alpha: 1,
  p_repost_beta: 2,

  influence_strength: 0.06,

  p_add_edge: 0.3,
  edge_addition_opinion_threshold: 0.35,
  p_remove_edge: 0.3,
  edge_removal_opinion_threshold: 0.3,

  max_censorship_actions_per_step: 5,

  election_step: 20,
  win_threshold: 0.8,
  center_tolerance: 0.17,
};

export function hasEnabledPublishingBias(
  params: Pick<SimulationParameters, 'bias_gamma' | 'bias_alpha' | 'bias_beta'>,
): boolean {
  return params.bias_gamma > 0 || params.bias_alpha > 0 || params.bias_beta > 0;
}

/** Clamps every field of a partial parameter update to its valid range. */
export function clampParameters(params: SimulationParameters): SimulationParameters {
  const clamped = { ...params };
  for (const key of Object.keys(PARAMETER_RANGES) as NumericParameterKey[]) {
    const [min, max] = PARAMETER_RANGES[key];
    const value = clamped[key];
    clamped[key] = Math.min(max, Math.max(min, value)) as never;
  }
  if (!hasEnabledPublishingBias(clamped)) {
    throw new RangeError('At least one publishing bias must be greater than zero.');
  }
  return clamped;
}
