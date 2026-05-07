import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { SimulationParameters } from '../types';

interface TooltipPortalProps {
  text: string;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
}

function TooltipPortal({ text, anchorRef }: TooltipPortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const TOOLTIP_WIDTH = 300;
    const MARGIN = 8;
    const left = rect.left - TOOLTIP_WIDTH - MARGIN;
    const top = rect.top + rect.height / 2 + window.scrollY;
    setStyle({
      position: 'absolute',
      top,
      left: Math.max(8, left),
      width: TOOLTIP_WIDTH,
      transform: 'translateY(-50%)',
      opacity: 1,
      pointerEvents: 'none',
    });
  }, [anchorRef]);

  return createPortal(
    <div className="tooltip-portal" style={style}>{text}</div>,
    document.body,
  );
}

interface ParameterPanelProps {
  parameters: SimulationParameters | null;
  disabled: boolean;
  onApply: (next: SimulationParameters) => Promise<void>;
}

type ParameterKey = keyof SimulationParameters;

const groups: Array<{ title: string; keys: ParameterKey[] }> = [
  { title: 'Core', keys: ['mission_role', 'number_of_nodes', 'directed', 'election_step', 'win_threshold', 'neutrality_tolerance'] },
  {
    title: 'Posting',
    keys: ['p_generate_base', 'weight_state_influence_on_post_type', 'bias_dictatorship', 'bias_democracy', 'bias_neutral'],
  },
  {
    title: 'Reposting',
    keys: ['p_repost_base', 'p_repost_dictatorship', 'p_repost_democracy', 'p_repost_neutral'],
  },
  { title: 'Influence + Network', keys: ['influence_strength', 'p_add_edge', 'edge_addition_dictatorship_threshold', 'edge_addition_democracy_threshold', 'p_remove_edge', 'edge_removal_opinion_threshold'] },
  { title: 'Moderation', keys: ['max_censorship_actions_per_step'] },
];

const labels: Record<ParameterKey, string> = {
  mission_role: 'Player role',
  number_of_nodes: 'Number of nodes',
  graph_type: 'Graph type',
  directed: 'Directed graph',
  p_generate_base: 'Base generation probability',
  weight_state_influence_on_post_type: 'State influence on post type',
  bias_dictatorship: 'dictatorship bias',
  bias_democracy: 'democracy bias',
  bias_neutral: 'Neutral bias',
  p_repost_base: 'Base repost pressure',
  p_repost_dictatorship: 'dictatorship repost modifier',
  p_repost_democracy: 'democracy repost modifier',
  p_repost_neutral: 'Neutral repost modifier',
  influence_strength: 'Influence strength',
  p_add_edge: 'Add-edge probability',
  edge_addition_dictatorship_threshold: 'dictatorship convergence threshold (add edge)',
  edge_addition_democracy_threshold: 'democracy convergence threshold (add edge)',
  p_remove_edge: 'Remove-edge probability',
  edge_removal_opinion_threshold: 'Opinion divergence threshold for removal',
  max_censorship_actions_per_step: 'Moderation actions per step',
  election_step: 'Election day (T)',
  win_threshold: 'Super-majority threshold',
  neutrality_tolerance: 'Neutrality tolerance',
};

const descriptions: Record<ParameterKey, string> = {
  mission_role: 'Choose your mission. Well-informed citizen: moderate the network to defend democracy. Bad actor: spread propaganda to push dictatorship.',
  number_of_nodes: 'Total number of citizens in the network. Range: 8–200. Low: fast, sparse simulation. High: richer dynamics but slower.',
  graph_type: 'Network generation strategy. Fixed to "random" in this version.',
  directed: 'If enabled, follow links have direction (A can follow B without B following A). Off: symmetric connections.',
  p_generate_base: 'Base probability that a citizen creates a post each day. Range: 0–1. Low: few posts, slow spread. High: dense information flow.',
  weight_state_influence_on_post_type: 'How strongly a citizen\'s opinion drives the content they publish. Range: 0–5. Low (≈0): bias values dominate. High (≈5): opinion-aligned users almost always publish matching content.',
  bias_dictatorship: 'Baseline score for publishing dictatorship-leaning content, independent of opinion. Range: 0–5. Higher means more propaganda produced overall.',
  bias_democracy: 'Baseline score for publishing democracy-supporting content, independent of opinion. Range: 0–5. Higher means more pro-democracy content produced overall.',
  bias_neutral: 'Baseline score for publishing neutral content. Range: 0–5. Higher increases neutral content share, softening polarisation.',
  p_repost_base: 'Base pressure to repost content seen in the feed (sigmoid input). Range: 0–5. Low: content stays local. High: viral spread.',
  p_repost_dictatorship: 'Multiplier applied on top of base repost pressure for dictatorship content. Range: 0–5. High amplifies propaganda virality.',
  p_repost_democracy: 'Multiplier applied on top of base repost pressure for democracy content. Range: 0–5. High amplifies pro-democracy virality.',
  p_repost_neutral: 'Multiplier applied on top of base repost pressure for neutral content. Range: 0–5. High floods the network with neutral noise.',
  influence_strength: 'Opinion shift caused per post exposure. Range: 0–1. Low (≈0.01): opinions change slowly. High (≈0.5): rapid radicalisation.',
  p_add_edge: 'Probability of adding a new social connection each day. Range: 0–1. Low: stable network. High: fast echo-chamber formation.',
  edge_addition_dictatorship_threshold: 'Opinion ceiling below which two users are seen as aligned on dictatorship and may connect. Range: 0–1. Lower = stricter, fewer new propaganda links.',
  edge_addition_democracy_threshold: 'Opinion floor above which two users are seen as aligned on democracy and may connect. Range: 0–1. Higher = stricter, fewer new democracy links.',
  p_remove_edge: 'Probability of removing a discordant connection each day. Range: 0–1. Low: cross-opinion ties persist. High: rapid echo-chamber isolation.',
  edge_removal_opinion_threshold: 'Minimum opinion gap required for a link to be at risk of removal. Range: 0–1. Low: even mild disagreement can break ties. High: only extreme polarisation breaks ties.',
  max_censorship_actions_per_step: 'Moderation actions available per day. Range: 0–25. Low: targeted but limited control. High: strong moderator power.',
  election_step: 'Day the election is held. Range: 15–30. The majority or super-majority at this step decides the outcome.',
  win_threshold: 'Share required for an immediate decisive result before election day. Range: 0.5–1. Low (≈0.5): easy early win/loss. High (≈1): only a near-unanimous result ends the game early.',
  neutrality_tolerance: 'Half-width of the opinion band classified as neutral (centred on 0.5). Range: 0–0.3. Low: almost everyone is polarised. High: many citizens count as neutral.',
};

const roleOptions: Array<{ value: SimulationParameters['mission_role']; label: string }> = [
  { value: 'well_informed_citizen', label: 'Well-informed citizen' },
  { value: 'bad_actor', label: 'Bad actor' },
];

function InfoIcon({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  return (
    <>
      <span
        ref={ref}
        className="info-tooltip"
        role="img"
        aria-label={text}
        tabIndex={0}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        i
      </span>
      {visible && <TooltipPortal text={text} anchorRef={ref} />}
    </>
  );
}

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
                  <div className="parameter-label-row">
                    <span>{labels[key]}</span>
                    <InfoIcon text={descriptions[key]} />
                  </div>
                  {typeof value === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => updateValue(key, event.target.checked)}
                    />
                  ) : key === 'mission_role' ? (
                    <select value={value} onChange={(event) => updateValue(key, event.target.value)}>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
