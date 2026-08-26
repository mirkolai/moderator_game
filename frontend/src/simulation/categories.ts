import alphaPostsCsv from './data/alphaPosts.csv?raw';
import betaPostsCsv from './data/betaPosts.csv?raw';
import gammaPostsCsv from './data/gammaPosts.csv?raw';
import { extractPostContents } from './csvContent';
import type { Classification } from '../types';

export interface CategoryDefinition {
  key: Classification;
  label: string;
  /** Pool of pre-authored post texts for this narrative category. */
  postContents: string[];
}

// Ordered by opinion space: low -> center -> high.
export const CATEGORY_GAMMA: CategoryDefinition = {
  key: 'gamma',
  label: 'Tamed',
  postContents: extractPostContents(gammaPostsCsv),
};

export const CATEGORY_BETA: CategoryDefinition = {
  key: 'beta',
  label: 'Undecided',
  postContents: extractPostContents(betaPostsCsv),
};

export const CATEGORY_ALPHA: CategoryDefinition = {
  key: 'alpha',
  label: 'Uncaged',
  postContents: extractPostContents(alphaPostsCsv),
};

export const CATEGORY_BY_KEY: Record<Classification, CategoryDefinition> = {
  alpha: CATEGORY_ALPHA,
  beta: CATEGORY_BETA,
  gamma: CATEGORY_GAMMA,
};
