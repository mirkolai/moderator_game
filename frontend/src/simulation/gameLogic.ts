import { CATEGORY_ALPHA, CATEGORY_BETA, CATEGORY_GAMMA } from './categories';
import type { Classification, Outcome, SimulationParameters, TimeSeriesPoint } from '../types';

/**
 * Classification percentages, time-series sampling, and win/loss evaluation.
 * Ported from `GameLogic` (backend/app/domain/game_logic.py).
 */
export const GameLogic = {
  classifyState(
    value: number,
    tolerance: number,
    centerTieBreak?: Classification,
  ): Classification {
    if (tolerance >= 0.5 && value === 0.5) {
      return centerTieBreak ?? (Math.random() < 0.5 ? CATEGORY_GAMMA.key : CATEGORY_ALPHA.key);
    }
    if (tolerance >= 0.5) return value < 0.5 ? CATEGORY_GAMMA.key : CATEGORY_ALPHA.key;
    if (value <= 0.5 - tolerance) return CATEGORY_GAMMA.key;
    if (value >= 0.5 + tolerance) return CATEGORY_ALPHA.key;
    return CATEGORY_BETA.key;
  },

  percentages(
    nodeStates: number[],
    tolerance: number,
    centerTieBreaks?: Classification[],
  ): Record<Classification, number> {
    const total = nodeStates.length || 1;
    const counts: Record<Classification, number> = { alpha: 0, beta: 0, gamma: 0 };
    for (const [index, state] of nodeStates.entries()) {
      counts[GameLogic.classifyState(state, tolerance, centerTieBreaks?.[index])] += 1;
    }
    return {
      alpha: counts.alpha / total,
      beta: counts.beta / total,
      gamma: counts.gamma / total,
    };
  },

  timeSeriesPoint(
    step: number,
    nodeStates: number[],
    tolerance: number,
    centerTieBreaks?: Classification[],
  ): TimeSeriesPoint {
    const percentages = GameLogic.percentages(nodeStates, tolerance, centerTieBreaks);
    return { step, alpha: percentages.alpha, beta: percentages.beta, gamma: percentages.gamma };
  },

  evaluate(
    step: number,
    nodeStates: number[],
    params: SimulationParameters,
    centerTieBreaks?: Classification[],
  ): { outcome: Outcome; message: string } {
    const percentages = GameLogic.percentages(nodeStates, params.center_tolerance, centerTieBreaks);
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
