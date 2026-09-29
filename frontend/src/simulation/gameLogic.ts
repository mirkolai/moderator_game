import { CATEGORY_ALPHA, CATEGORY_BETA, CATEGORY_GAMMA } from './categories';
import type { Classification, Outcome, SimulationParameters, TimeSeriesPoint } from '../types';

/**
 * Classification percentages, time-series sampling, and win/loss evaluation.
 * Ported from `GameLogic` (backend/app/domain/game_logic.py).
 */
export const GameLogic = {
  classifyState(value: number, tolerance: number): Classification {
    if (value <= 0.5 - tolerance) return CATEGORY_GAMMA.key;
    if (value >= 0.5 + tolerance) return CATEGORY_ALPHA.key;
    return CATEGORY_BETA.key;
  },

  percentages(nodeStates: number[], tolerance: number): Record<Classification, number> {
    const total = nodeStates.length || 1;
    const counts: Record<Classification, number> = { alpha: 0, beta: 0, gamma: 0 };
    for (const state of nodeStates) {
      counts[GameLogic.classifyState(state, tolerance)] += 1;
    }
    return {
      alpha: counts.alpha / total,
      beta: counts.beta / total,
      gamma: counts.gamma / total,
    };
  },

  timeSeriesPoint(step: number, nodeStates: number[], tolerance: number): TimeSeriesPoint {
    const percentages = GameLogic.percentages(nodeStates, tolerance);
    return { step, alpha: percentages.alpha, beta: percentages.beta, gamma: percentages.gamma };
  },

  evaluate(
    step: number,
    nodeStates: number[],
    params: SimulationParameters,
  ): { outcome: Outcome; message: string } {
    const percentages = GameLogic.percentages(nodeStates, params.center_tolerance);
    const alphaValue = percentages.alpha;
    const gammaValue = percentages.gamma;

    // Super-majority can end the game immediately, even before bulldozers arrive.
    if (alphaValue >= params.win_threshold) {
      return { outcome: 'won', message: `${CATEGORY_ALPHA.label} reached the super-majority threshold.` };
    }
    if (gammaValue >= params.win_threshold) {
      return { outcome: 'lost', message: `${CATEGORY_GAMMA.label} reached the super-majority threshold.` };
    }

    if (step >= params.election_step) {
      const alphaSuperMajority = alphaValue >= params.win_threshold;
      const gammaSuperMajority = gammaValue >= params.win_threshold;
      const alphaMajority = alphaValue > gammaValue;

      if (alphaSuperMajority) {
        return { outcome: 'won', message: `Election day: ${CATEGORY_ALPHA.label} reached a super-majority.` };
      }
      if (alphaMajority) {
        return { outcome: 'won', message: `Election day: ${CATEGORY_ALPHA.label} won the majority vote.` };
      }
      if (gammaSuperMajority) {
        return { outcome: 'lost', message: `Election day: ${CATEGORY_GAMMA.label} reached a super-majority.` };
      }
      return { outcome: 'lost', message: `Election day: ${CATEGORY_ALPHA.label} did not secure the majority.` };
    }

    const stepsLeft = Math.max(0, params.election_step - step);
    return { outcome: 'running', message: `Campaign in progress. ${stepsLeft+1} day(s) until bulldozers arrive.` };
  },
};
