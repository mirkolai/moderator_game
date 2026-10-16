import { DEFAULT_PARAMETERS } from '../simulation/parameters';
import type { SimulationParameters } from '../types';

export type LevelId = 'easy' | 'normal' | 'advanced' | 'custom';

export interface LevelConfig {
  id: LevelId;
  label: string;
  description: string;
  /** When true the parameter panel is shown and the player can edit the parameters. */
  customizable: boolean;
  parameters: SimulationParameters;
}

/**
 * Parameters of the predefined levels. Edit this file to tune the difficulty.
 * Easy (and the starting point of Customizable) use the original game parameters.
 */
export const LEVELS: Record<LevelId, LevelConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy level',
    description: 'Small forest, generous debunking budget, slow propaganda.',
    customizable: false,
    parameters: { ...DEFAULT_PARAMETERS },
  },
  normal: {
    id: 'normal',
    label: 'Normal level',
    description: 'Larger community, stronger propaganda, fewer debunking attempts.',
    customizable: false,
    parameters: {
      ...DEFAULT_PARAMETERS,
      number_of_nodes: 30,
      p_generate_base: 0.45,
      weight_state_influence_on_post_type: 1.5,
      bias_gamma: 3.2,
      bias_alpha: 1.1,
      p_repost_gamma: 3.2,
      influence_strength: 0.07,
      p_remove_edge: 0.35,
      max_censorship_actions_per_step: 4,
      election_step: 20,
      win_threshold: 0.8,
    },
  },
  advanced: {
    id: 'advanced',
    label: 'Advanced level',
    description: 'Big, polarised forest, aggressive propaganda, few attempts and less time.',
    customizable: false,
    parameters: {
      ...DEFAULT_PARAMETERS,
      number_of_nodes: 40,
      p_generate_base: 0.5,
      weight_state_influence_on_post_type: 1.8,
      alignment_constrained_posting: true,
      bias_gamma: 3.8,
      bias_alpha: 1.0,
      p_repost_gamma: 3.6,
      p_repost_alpha: 0.9,
      influence_strength: 0.08,
      p_remove_edge: 0.4,
      edge_removal_opinion_threshold: 0.25,
      max_censorship_actions_per_step: 3,
      election_step: 18,
      win_threshold: 0.85,
    },
  },
  custom: {
    id: 'custom',
    label: 'Customizable level',
    description: 'Choose every game parameter yourself.',
    customizable: true,
    parameters: { ...DEFAULT_PARAMETERS },
  },
};

export const LEVEL_ORDER: LevelId[] = ['easy', 'normal', 'advanced', 'custom'];
export const DEFAULT_LEVEL: LevelId = 'easy';
