import { useEffect, useState } from 'react';

import type { SimulationParameters } from '../types';

interface ParameterPanelProps {
  parameters: SimulationParameters | null;
  disabled: boolean;
  onApply: (next: SimulationParameters) => Promise<void>;
}

type ParameterKey = keyof SimulationParameters;

const groups: Array<{ title: string; keys: ParameterKey[] }> = [
  { title: 'Core', keys: ['number_of_nodes', 'directed', 'N_steps', 'win_threshold', 'neutrality_tolerance'] },
  {
    title: 'Posting',
    keys: ['p_generate_base', 'weight_state_influence_on_post_type', 'bias_misinformation', 'bias_factchecking', 'bias_neutral'],
  },
  {
    title: 'Reposting',
    keys: ['p_repost_base', 'p_repost_misinformation', 'p_repost_factchecking', 'p_repost_neutral'],
  },
  { title: 'Influence + Network', keys: ['influence_strength', 'p_add_edge', 'p_remove_edge'] },
  { title: 'Moderation', keys: ['max_censorship_actions_per_step'] },
];

const labels: Record<ParameterKey, string> = {
  number_of_nodes: 'Number of nodes',
  graph_type: 'Graph type',
  directed: 'Directed graph',
  p_generate_base: 'Base generation probability',
  weight_state_influence_on_post_type: 'State influence on post type',
  bias_misinformation: 'Misinformation bias',
  bias_factchecking: 'Fact-checking bias',
  bias_neutral: 'Neutral bias',
  p_repost_base: 'Base repost pressure',
  p_repost_misinformation: 'Misinformation repost modifier',
  p_repost_factchecking: 'Fact-checking repost modifier',
  p_repost_neutral: 'Neutral repost modifier',
  influence_strength: 'Influence strength',
  p_add_edge: 'Add-edge probability',
  p_remove_edge: 'Remove-edge probability',
  max_censorship_actions_per_step: 'Censorship actions per step',
  N_steps: 'Maximum steps',
  win_threshold: 'Win/loss threshold',
  neutrality_tolerance: 'Neutrality tolerance',
};

export function ParameterPanel({ parameters, disabled, onApply }: ParameterPanelProps) {
  const [draft, setDraft] = useState<SimulationParameters | null>(parameters);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(parameters);
  }, [parameters]);

  if (draft === null) {
    return <section className="card parameter-panel" />;
  }

  const updateValue = (key: ParameterKey, rawValue: string | boolean) => {
    setDraft((current: SimulationParameters | null) => {
      if (current === null) {
        return current;
      }
      if (typeof rawValue === 'boolean') {
        return { ...current, [key]: rawValue };
      }
      const currentValue = current[key];
      const nextValue = typeof currentValue === 'number' ? Number(rawValue) : rawValue;
      return { ...current, [key]: nextValue as never };
    });
  };

  return (
    <section className="card parameter-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Parameters</p>
          <h2>Simulation Controls</h2>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={disabled || saving || draft === null}
          onClick={async () => {
            if (draft === null) {
              return;
            }
            setSaving(true);
            try {
              await onApply(draft);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Applying...' : 'Apply + Reset'}
        </button>
      </div>

      <div className="parameter-groups">
        {groups.map((group) => (
          <div key={group.title} className="parameter-group">
            <h3>{group.title}</h3>
            {group.keys.map((key) => {
              const value = draft[key];
              return (
                <label key={key} className="parameter-field">
                  <span>{labels[key]}</span>
                  {typeof value === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => updateValue(key, event.target.checked)}
                    />
                  ) : (
                    <input
                      type="number"
                      step={Number.isInteger(value) ? 1 : 0.01}
                      value={value}
                      onChange={(event) => updateValue(key, event.target.value)}
                    />
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
