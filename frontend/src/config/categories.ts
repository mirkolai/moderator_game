export type CategoryKey = 'pro_forest' | 'pro_zoo';

export interface CategoryConfigEntry {
  key: CategoryKey;
  label: string;
  cssToken: string;
  color: string;
}

// Centralized category mapping. Change labels/colors here to re-theme categories.
export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfigEntry> = {
  pro_forest: {
    key: 'pro_forest',
    label: 'Pro Forest',
    cssToken: 'pro-forest',
    color: '#7fc97f',
  },
  pro_zoo: {
    key: 'pro_zoo',
    label: 'Pro Zoo',
    cssToken: 'pro-zoo',
    color: '#beaed4',
  },
};

export const CATEGORY_ORDER: CategoryKey[] = ['pro_zoo', 'pro_forest'];
export const POST_HIGHLIGHT_COLORS = {
  seenBy: '#fdc086',
  potentialRecipients: '#fdc086',
  selectedNode: '#f0e442',
};
