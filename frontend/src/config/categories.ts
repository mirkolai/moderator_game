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
    label: 'Pro Forest',
    cssToken: 'alpha',
    color: '#009e73',
  },
  beta: {
    key: 'beta',
    label: 'Undecided',
    cssToken: 'beta',
    color: '#56b4e9',
  },
  gamma: {
    key: 'gamma',
    label: 'Pro Zoo',
    cssToken: 'gamma',
    color: '#cc79A7',
  },
};

export const CATEGORY_ORDER: CategoryKey[] = ['gamma', 'beta', 'alpha'];
export const POST_HIGHLIGHT_COLORS = {
  seenBy: '#D55E00',
  potentialRecipients: '#D55E00',
  selectedNode: '#f0e442',
};
