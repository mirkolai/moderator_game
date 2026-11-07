import { DEFAULT_PARAMETERS } from '../simulation/parameters';
import type { SimulationParameters } from '../types';

/**
 * The tutorial is a fixed, scripted scenario: the same seed and parameters always
 * produce the same network, posts and outcomes. Node and post ids below were
 * verified against this exact seed, so changing the seed or any parameter
 * (or the simulation logic) requires re-checking them.
 */
export const TUTORIAL_SEED = 1829;
export const TUTORIAL_WARM_UP_STEPS = 5;

export const TUTORIAL_PARAMETERS: SimulationParameters = {
  ...DEFAULT_PARAMETERS,
  number_of_nodes: 16,
  p_generate_base: 0.3,
  influence_strength: 0.1,
  max_censorship_actions_per_step: 1,
};

export interface TutorialRound {
  /** Animal whose feed contains the Pro Zoo post for this round. */
  nodeId: number;
  /** The false pro-zoo post that must be debunked. */
  rightPostId: string;
}

export const TUTORIAL_ROUNDS: TutorialRound[] = [
  { nodeId: 2, rightPostId: 'post-17' },
  { nodeId: 15, rightPostId: 'post-23' },
];
