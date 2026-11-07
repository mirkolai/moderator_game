import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CATEGORY_CONFIG } from '../config/categories';
import { hasEnabledPublishingBias } from '../simulation/parameters';
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
  { title: 'Core', keys: ['number_of_nodes', 'election_step'] },
  {
    title: 'Posting',
    keys: [
      'p_generate_base',
      'weight_state_influence_on_post_type',
      'bias_pro_zoo',
      'bias_pro_forest',
    ],
  },
  {
    title: 'Reposting',
    keys: ['p_repost_base', 'p_repost_pro_zoo', 'p_repost_pro_forest'],
  },
  { title: 'Influence + Network', keys: ['influence_strength', 'debunk_influence_recovery', 'p_add_edge', 'edge_addition_opinion_threshold', 'p_remove_edge', 'edge_removal_opinion_threshold'] },
  { title: 'Moderation', keys: ['max_censorship_actions_per_step'] },
];

const labels: Record<ParameterKey, string> = {
  number_of_nodes: 'Number of nodes',
  p_generate_base: 'Base generation probability',
  weight_state_influence_on_post_type: 'Post Impact on Alignment',
  bias_pro_zoo: `Publishing bias (${CATEGORY_CONFIG.pro_zoo.label})`,
  bias_pro_forest: `Publishing bias (${CATEGORY_CONFIG.pro_forest.label})`,
  p_repost_base: 'Base repost pressure',
  p_repost_pro_zoo: `Repost modifier (${CATEGORY_CONFIG.pro_zoo.label})`,
  p_repost_pro_forest: `Repost modifier (${CATEGORY_CONFIG.pro_forest.label})`,
  influence_strength: 'Influence strength',
  debunk_influence_recovery: 'Debunk influence recovery',
  p_add_edge: 'Add-edge probability',
  edge_addition_opinion_threshold: 'Convergence threshold (add edge)',
  p_remove_edge: 'Remove-edge probability',
  edge_removal_opinion_threshold: 'Divergence threshold (remove edge)',
  max_censorship_actions_per_step: 'Moderation actions per step',
  election_step: 'Game duration in days (T)',
};

const descriptions: Record<ParameterKey, string> = {
  number_of_nodes: 'Total number of citizens in the network. Range: 5–200. Low: fast, sparse simulation. High: richer dynamics but slower.',
  p_generate_base: 'Base probability that a citizen creates a post each day. Range: 0–1. Low: few posts, slow spread. High: dense information flow.',
  weight_state_influence_on_post_type: 'How strongly a citizen\'s opinion drives the content they publish. Range: 0–5. Low (≈0): bias values dominate. High (≈5): opinion-aligned users almost always publish matching content.',
  bias_pro_zoo: `Baseline score for publishing Pro Zoo posts. Range: 0–5. Set to 0 to disable this post type; at least one publishing bias must be above 0.`,
  bias_pro_forest: `Baseline score for publishing Pro Forest posts. Range: 0–5. Set to 0 to disable this post type; at least one publishing bias must be above 0.`,
  p_repost_base: 'Base pressure to repost content seen in the feed (sigmoid input). Range: 0–5. Low: content stays local. High: viral spread.',
  p_repost_pro_zoo: 'Multiplier applied on top of base repost pressure for Pro Zoo content. Range: 0–5.',
  p_repost_pro_forest: 'Multiplier applied on top of base repost pressure for Pro Forest content. Range: 0–5.',
  influence_strength: 'Opinion shift caused per post exposure. Range: 0–1. Low (≈0.01): opinions change slowly. High (≈0.5): rapid radicalisation.',
  debunk_influence_recovery: 'Share of the opinion shift reversed immediately for animals that already saw a debunked post. Range: 0–1. Easy: 1 (all); Normal: 0.5 (half); Advanced: 0 (none).',
  p_add_edge: 'Probability of adding a new social connection each day. Range: 0–1. Low: stable network. High: fast echo-chamber formation.',
  edge_addition_opinion_threshold: 'Maximum distance from an opinion extreme for two users to connect. Range: 0–0.5. Lower = stricter, fewer convergent links.',
  p_remove_edge: 'Probability of removing a discordant connection each day. Range: 0–1. Low: cross-opinion ties persist. High: rapid echo-chamber isolation.',
  edge_removal_opinion_threshold: 'Minimum opinion gap required for a link to be at risk of removal. Range: 0–1. Low: even mild disagreement can break ties. High: only extreme polarisation breaks ties.',
  max_censorship_actions_per_step: 'Moderation actions available per day. Range: 0–25. Low: targeted but limited control. High: strong moderator power.',
  election_step: 'Number of days in the game. The winner is decided only when the final day ends. Range: 15–30.',
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

  const hasPublishingBias = hasEnabledPublishingBias(draft);

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
          disabled={disabled || saving || !hasPublishingBias}
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
      {!hasPublishingBias ? (
        <p className="text-danger mb-2" role="alert">
          At least one publishing bias must be greater than zero.
        </p>
      ) : null}

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
