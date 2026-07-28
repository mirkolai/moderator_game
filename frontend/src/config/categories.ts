export type CategoryKey = 'alpha' | 'beta' | 'gamma';

export interface CategoryConfigEntry {
  key: CategoryKey;
  label: string;
  cssToken: string;
  color: string;
}

// Centralized category mapping. Change labels/colors here to re-theme categories.
export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfigEntry> = {
  alpha: {
    key: 'alpha',
    label: 'Uncaged',
    cssToken: 'alpha',
    color: '#4e79a7',
  },
  beta: {
    key: 'beta',
    label: 'Undecided',
    cssToken: 'beta',
    color: '#76b7b2',
  },
  gamma: {
    key: 'gamma',
    label: 'Tamed',
    cssToken: 'gamma',
    color: '#f28e2b',
  },
};

export const CATEGORY_ORDER: CategoryKey[] = ['gamma', 'beta', 'alpha'];
