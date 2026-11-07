import type { SimulationParameters } from '../types';

type NumericParameterKey = {
  [Key in keyof SimulationParameters]: SimulationParameters[Key] extends number ? Key : never;
}[keyof SimulationParameters];

/** Inclusive [min, max] bounds mirroring the original Pydantic field constraints. */
const PARAMETER_RANGES: Record<NumericParameterKey, [number, number]> = {
  number_of_nodes: [5, 200],
  p_generate_base: [0, 1],
  weight_state_influence_on_post_type: [0, 5],
  bias_pro_forest: [0, 5],
  bias_pro_zoo: [0, 5],
  p_repost_base: [0, 5],
  p_repost_pro_forest: [0, 5],
  p_repost_pro_zoo: [0, 5],
  influence_strength: [0, 1],
  debunk_influence_recovery: [0, 1],
  p_add_edge: [0, 1],
  edge_addition_opinion_threshold: [0, 0.5],
  p_remove_edge: [0, 1],
  edge_removal_opinion_threshold: [0, 1],
  max_censorship_actions_per_step: [0, 25],
  election_step: [15, 30],
};

export const DEFAULT_PARAMETERS: SimulationParameters = {
  number_of_nodes: 24,

  p_generate_base: 0.4,
  weight_state_influence_on_post_type: 1.35,
  bias_pro_forest: 1.2,
  bias_pro_zoo: 2.8,

  p_repost_base: 1.8,
  p_repost_pro_forest: 2.8,
  p_repost_pro_zoo: 1,

  influence_strength: 0.06,
  debunk_influence_recovery: 1,

  p_add_edge: 0.3,
  edge_addition_opinion_threshold: 0.35,
  p_remove_edge: 0.3,
  edge_removal_opinion_threshold: 0.3,

  max_censorship_actions_per_step: 5,

  election_step: 20,
};

export function hasEnabledPublishingBias(
  params: Pick<SimulationParameters, 'bias_pro_forest' | 'bias_pro_zoo'>,
): boolean {
  return params.bias_pro_forest > 0 || params.bias_pro_zoo > 0;
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
