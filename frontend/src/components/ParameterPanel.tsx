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
    const updatePosition = () => {
      const el = anchorRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const margin = 8;
      const width = Math.min(300, viewportWidth - margin * 2);
      const narrowViewport = viewportWidth < 900;

      if (narrowViewport) {
        const centeredLeft = rect.left + rect.width / 2 - width / 2 + window.scrollX;
        const maxLeft = window.scrollX + viewportWidth - width - margin;
        setStyle({
          position: 'absolute',
          top: rect.bottom + margin + window.scrollY,
          left: Math.min(Math.max(window.scrollX + margin, centeredLeft), maxLeft),
          width,
          transform: 'none',
          opacity: 1,
          pointerEvents: 'none',
        });
        return;
      }

      const left = rect.left - width - margin + window.scrollX;
      setStyle({
        position: 'absolute',
        top: rect.top + rect.height / 2 + window.scrollY,
        left: Math.max(window.scrollX + margin, left),
        width,
        transform: 'translateY(-50%)',
        opacity: 1,
        pointerEvents: 'none',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
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
  { title: 'Core', keys: ['number_of_nodes', 'election_step', 'win_threshold', 'center_tolerance'] },
  {
    title: 'Posting',
    keys: ['p_generate_base', 'weight_state_influence_on_post_type', 'bias_gamma', 'bias_alpha', 'bias_beta'],
  },
  {
    title: 'Reposting',
    keys: ['p_repost_base', 'p_repost_gamma', 'p_repost_alpha', 'p_repost_beta'],
  },
  { title: 'Influence + Network', keys: ['influence_strength', 'p_add_edge', 'edge_addition_gamma_threshold', 'edge_addition_alpha_threshold', 'p_remove_edge', 'edge_removal_opinion_threshold'] },
  { title: 'Moderation', keys: ['max_censorship_actions_per_step'] },
];

const labels: Record<ParameterKey, string> = {
  number_of_nodes: 'Number of nodes',
  p_generate_base: 'Base generation probability',
  weight_state_influence_on_post_type: 'State influence on post type',
  bias_gamma: 'Gamma bias (Tamed)',
  bias_alpha: 'Alpha bias (Uncaged)',
  bias_beta: 'Beta bias (Undecided)',
  p_repost_base: 'Base repost pressure',
  p_repost_gamma: 'Gamma repost modifier (Tamed)',
  p_repost_alpha: 'Alpha repost modifier (Uncaged)',
  p_repost_beta: 'Beta repost modifier (Undecided)',
  influence_strength: 'Influence strength',
  p_add_edge: 'Add-edge probability',
  edge_addition_gamma_threshold: 'Gamma convergence threshold (add edge)',
  edge_addition_alpha_threshold: 'Alpha convergence threshold (add edge)',
  p_remove_edge: 'Remove-edge probability',
  edge_removal_opinion_threshold: 'Opinion divergence threshold for removal',
  max_censorship_actions_per_step: 'Moderation actions per step',
  election_step: 'Days bulldozers arrive (T)',
  win_threshold: 'Super-majority threshold',
  center_tolerance: 'Center-band tolerance (beta)',
};

const descriptions: Record<ParameterKey, string> = {
  number_of_nodes: 'Total number of citizens in the network. Range: 8–200. Low: fast, sparse simulation. High: richer dynamics but slower.',
  p_generate_base: 'Base probability that a citizen creates a post each day. Range: 0–1. Low: few posts, slow spread. High: dense information flow.',
  weight_state_influence_on_post_type: 'How strongly a citizen\'s opinion drives the content they publish. Range: 0–5. Low (≈0): bias values dominate. High (≈5): opinion-aligned users almost always publish matching content.',
  bias_gamma: 'Baseline score for publishing gamma content (mapped to Tamed). Range: 0–5. Higher boosts low-end narrative production.',
  bias_alpha: 'Baseline score for publishing alpha content (mapped to Uncaged). Range: 0–5. Higher boosts high-end narrative production.',
  bias_beta: 'Baseline score for publishing beta content (mapped to Undecided). Range: 0–5. Higher increases center-band narrative share.',
  p_repost_base: 'Base pressure to repost content seen in the feed (sigmoid input). Range: 0–5. Low: content stays local. High: viral spread.',
  p_repost_gamma: 'Multiplier applied on top of base repost pressure for gamma content. Range: 0–5. Higher values amplify low-end narrative virality.',
  p_repost_alpha: 'Multiplier applied on top of base repost pressure for alpha content. Range: 0–5. Higher values amplify high-end narrative virality.',
  p_repost_beta: 'Multiplier applied on top of base repost pressure for beta content. Range: 0–5. Higher values increase center-band narrative visibility.',
  influence_strength: 'Opinion shift caused per post exposure. Range: 0–1. Low (≈0.01): opinions change slowly. High (≈0.5): rapid radicalisation.',
  p_add_edge: 'Probability of adding a new social connection each day. Range: 0–1. Low: stable network. High: fast echo-chamber formation.',
  edge_addition_gamma_threshold: 'Opinion ceiling below which two users are in the gamma cluster and may connect. Range: 0–1. Lower = stricter, fewer low-end links.',
  edge_addition_alpha_threshold: 'Opinion floor above which two users are in the alpha cluster and may connect. Range: 0–1. Higher = stricter, fewer high-end links.',
  p_remove_edge: 'Probability of removing a discordant connection each day. Range: 0–1. Low: cross-opinion ties persist. High: rapid echo-chamber isolation.',
  edge_removal_opinion_threshold: 'Minimum opinion gap required for a link to be at risk of removal. Range: 0–1. Low: even mild disagreement can break ties. High: only extreme polarisation breaks ties.',
  max_censorship_actions_per_step: 'Moderation actions available per day. Range: 0–25. Low: targeted but limited control. High: strong moderator power.',
  election_step: 'Day the bulldozers arrive is held. Range: 15–30. The majority or super-majority at this step decides the outcome.',
  win_threshold: 'Share required for an immediate decisive result before bulldozers arrive. Range: 0.5–1. Low (≈0.5): easy early win/loss. High (≈1): only a near-unanimous result ends the game early.',
  center_tolerance: 'Half-width of the opinion band classified as beta (centred on 0.5). Range: 0–0.5. Low: almost everyone is in edge clusters. High: many citizens stay in the center band.',
};

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
          {saving ? 'Applying...' : 'Apply + Restart'}
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
