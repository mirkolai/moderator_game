import { FeedPanel } from './components/FeedPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { NotificationBell } from './components/NotificationBell';
import { ParameterPanel } from './components/ParameterPanel';
import { useSimulation } from './hooks/useSimulation';
import { useEffect, useRef, useState } from 'react';

function toPercent(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export default function App() {
  const [isParameterPanelOpen, setIsParameterPanelOpen] = useState(false);
  const prevModerationActionsRef = useRef<number | null>(null);

  const {
    graph,
    status,
    parameters,
    selectedNodeId,
    feed,
    highlightedNodeIds,
    highlightedPostId,
    loading,
    error,
    notifications,
    markAllRead,
    selectNode,
    highlightInfluence,
    censorPost,
    stepSimulation,
    resetSimulation,
    updateParameters,
  } = useSimulation();

  const missionDescription = 'Mission: moderate the community to defend democracy before election day.';
  const currentStep = status?.current_step ?? 0;
  const maxSteps = status?.max_steps ?? parameters?.election_step ?? 0;
  const daysToElection = Math.max(0, maxSteps - currentStep);
  const moderationActionsRemaining = status?.censorship_actions_remaining ?? 0;
  const isGameRunning = status?.outcome === 'running';
  const hasGameStarted = currentStep > 0;
  const isGameFinished = !isGameRunning && hasGameStarted;

  // Auto-step when moderation actions run out during gameplay
  useEffect(() => {
    if (!hasGameStarted || !isGameRunning || loading) {
      prevModerationActionsRef.current = moderationActionsRemaining;
      return;
    }

    // If moderation actions just hit zero, auto-advance to next step
    if (
      moderationActionsRemaining === 0 &&
      prevModerationActionsRef.current !== null &&
      prevModerationActionsRef.current > 0
    ) {
      void stepSimulation();
    }

    prevModerationActionsRef.current = moderationActionsRemaining;
  }, [moderationActionsRemaining, hasGameStarted, isGameRunning, loading, stepSimulation]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Moderator Simulation</p>
          <h1>Election Integrity Mission</h1>
          <p className="subtitle">
            {missionDescription}
          </p>
        </div>
        <div className="toolbar-actions">
          <NotificationBell notifications={notifications} onMarkAllRead={markAllRead} />
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="status-strip">
        <div className="status-card card">
          <span>Countdown</span>
          <strong>{daysToElection} days to election</strong>
        </div>
        <div className="status-card card">
          <span>Distribution</span>
          <div className="status-stack">
            <div className="status-bar-row dictatorship-row">
              <strong>{toPercent(status?.percentages.dictatorship)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill dictatorship-fill" style={{ width: toPercent(status?.percentages.dictatorship) }} />
              </div>
            </div>
            <div className="status-bar-row neutral-row">
              <strong>{toPercent(status?.percentages.neutral)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill neutral-fill" style={{ width: toPercent(status?.percentages.neutral) }} />
              </div>
            </div>
            <div className="status-bar-row democracy-row">
              <strong>{toPercent(status?.percentages.democracy)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill democracy-fill" style={{ width: toPercent(status?.percentages.democracy) }} />
              </div>
            </div>
          </div>
        </div>
        <div className="status-card card">
          <span>Legend</span>
          <div className="status-legend">
            <div className="status-legend-item">
              <i className="legend-dot dictatorship" />
              <span>Dictatorship</span>
            </div>
            <div className="status-legend-item">
              <i className="legend-dot neutral" />
              <span>Neutral</span>
            </div>
            <div className="status-legend-item">
              <i className="legend-dot democracy" />
              <span>Democracy</span>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className={`panel-toggle ${isParameterPanelOpen ? 'is-open' : ''}`}
        onClick={() => setIsParameterPanelOpen((current) => !current)}
        aria-label={isParameterPanelOpen ? 'Hide parameters panel' : 'Show parameters panel'}
        aria-expanded={isParameterPanelOpen}
        aria-controls="parameter-panel"
      >
        <span className="panel-toggle-indicator" aria-hidden="true">
          {isParameterPanelOpen ? '◀' : '▶'}
        </span>
        <span className="panel-toggle-label">Parameters</span>
      </button>

      <main className={`layout-grid ${isParameterPanelOpen ? 'parameters-open' : 'parameters-closed'}`}>
        <aside
          id="parameter-panel"
          className={`parameter-dock ${isParameterPanelOpen ? 'is-open' : 'is-closed'}`}
          aria-hidden={!isParameterPanelOpen}
        >
          <ParameterPanel parameters={parameters} disabled={loading} onApply={updateParameters} />
        </aside>

        <section className="main-stage">
          <div className="visual-row">
            <NetworkGraph
              graph={graph}
              selectedNodeId={selectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              onSelectNode={(nodeId) => void selectNode(nodeId)}
            />
            <FeedPanel
              feed={feed}
              selectedNodeId={selectedNodeId}
              highlightedPostId={highlightedPostId}
              currentStep={currentStep}
              censorshipActionsRemaining={status?.censorship_actions_remaining ?? 0}
              onHighlightPost={(post) => void highlightInfluence(post)}
              onCensorPost={(postId) => void censorPost(postId)}
            />
          </div>

        </section>
      </main>

      <footer className="footer-note">{status?.message ?? 'Loading simulation state...'}</footer>

      {isGameFinished ? (
        <div className="endgame-overlay" role="dialog" aria-modal="true" aria-live="polite">
          <div className="endgame-card card">
            <p className="eyebrow">Match Result</p>
            <h2 className={`endgame-title ${status?.outcome === 'won' ? 'is-win' : 'is-loss'}`}>
              {status?.outcome === 'won' ? 'Hai vinto' : 'Hai perso'}
            </h2>
            <p className="endgame-message">{status?.message ?? 'La simulazione e terminata.'}</p>
            <button
              type="button"
              className="primary-button"
              disabled={loading}
              onClick={() => {
                void (async () => {
                  await resetSimulation();
                  prevModerationActionsRef.current = null;
                  await stepSimulation();
                })();
              }}
            >
              Restart
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
