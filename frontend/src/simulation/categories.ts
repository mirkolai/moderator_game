import proForestPostsCsv from './data/proForestPosts.csv?raw';
import proZooPostsCsv from './data/proZooPosts.csv?raw';
import { extractPostContents } from './csvContent';
import { CATEGORY_CONFIG } from '../config/categories';
import type { Classification } from '../types';

export interface CategoryDefinition {
  key: Classification;
  label: string;
  /** Pool of pre-authored post texts for this narrative category. */
  postContents: string[];
}

// Labels and colors come from the shared category config.
export const CATEGORY_PRO_ZOO: CategoryDefinition = {
  key: 'pro_zoo',
  label: CATEGORY_CONFIG.pro_zoo.label,
  postContents: extractPostContents(proZooPostsCsv),
};

export const CATEGORY_PRO_FOREST: CategoryDefinition = {
  key: 'pro_forest',
  label: CATEGORY_CONFIG.pro_forest.label,
  postContents: extractPostContents(proForestPostsCsv),
};

export const CATEGORY_BY_KEY: Record<Classification, CategoryDefinition> = {
  pro_forest: CATEGORY_PRO_FOREST,
  pro_zoo: CATEGORY_PRO_ZOO,
};
