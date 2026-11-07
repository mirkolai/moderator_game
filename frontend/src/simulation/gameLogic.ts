import { CATEGORY_PRO_FOREST, CATEGORY_PRO_ZOO } from './categories';
import type { Classification, Outcome, SimulationParameters, TimeSeriesPoint } from '../types';

/**
 * Classification percentages, time-series sampling, and win/loss evaluation.
 * Ported from `GameLogic` (backend/app/domain/game_logic.py).
 */
export const GameLogic = {
  classifyState(value: number): Classification {
    return value < 0.5 ? CATEGORY_PRO_ZOO.key : CATEGORY_PRO_FOREST.key;
  },

  percentages(nodeStates: number[]): Record<Classification, number> {
    const total = nodeStates.length || 1;
    const counts: Record<Classification, number> = { pro_forest: 0, pro_zoo: 0 };
    for (const state of nodeStates) {
      counts[GameLogic.classifyState(state)] += 1;
    }
    return {
      pro_forest: counts.pro_forest / total,
      pro_zoo: counts.pro_zoo / total,
    };
  },

  timeSeriesPoint(step: number, nodeStates: number[]): TimeSeriesPoint {
    const percentages = GameLogic.percentages(nodeStates);
    return { step, ...percentages };
  },

  evaluate(step: number, nodeStates: number[], params: SimulationParameters): { outcome: Outcome; message: string } {
    if (step >= params.election_step) {
      const percentages = GameLogic.percentages(nodeStates);
      if (percentages.pro_forest > percentages.pro_zoo) {
        return { outcome: 'won', message: `Final day: ${CATEGORY_PRO_FOREST.label} won the majority.` };
      }
      return { outcome: 'lost', message: `Final day: ${CATEGORY_PRO_FOREST.label} did not secure a majority.` };
    }

    const stepsLeft = Math.max(0, params.election_step - step);
    return { outcome: 'running', message: `Campaign in progress. ${stepsLeft} day(s) until bulldozers arrive.` };
  },
};
