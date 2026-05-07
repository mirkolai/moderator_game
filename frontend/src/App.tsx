import { FeedPanel } from './components/FeedPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { NotificationBell } from './components/NotificationBell';
import { ParameterPanel } from './components/ParameterPanel';
import { TimeSeriesChart } from './components/TimeSeriesChart';
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
    timeSeries,
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

  const isWellInformed = parameters?.mission_role !== 'bad_actor';
  const missionLabel = isWellInformed ? 'Well-informed citizen' : 'Bad actor';
  const missionDescription = isWellInformed
    ? 'Mission: moderate the community to defend democracy before election day.'
    : 'Mission: manipulate the information space to push the community toward dictatorship before election day.';
  const currentStep = status?.current_step ?? 0;
  const maxSteps = status?.max_steps ?? parameters?.election_step ?? 0;
  const daysToElection = Math.max(0, maxSteps - currentStep);
  const moderationActionsRemaining = status?.censorship_actions_remaining ?? 0;
  const isGameRunning = status?.outcome === 'running';
  const hasGameStarted = currentStep > 0;
  const isGameFinished = !isGameRunning && hasGameStarted;
  const actionButtonLabel = isGameFinished ? 'Restart' : hasGameStarted ? 'Reset' : 'Start';

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
          <div className="counter-pill">Role: {missionLabel}</div>
          <NotificationBell notifications={notifications} onMarkAllRead={markAllRead} />
          <button
            type="button"
            className={`primary-button ${actionButtonLabel === 'Reset' ? 'is-reset-state' : ''}`}
            onClick={() => {
              void (async () => {
                if (isGameFinished) {
                  // Restart: reset to step 0, then immediately move to first playable step.
                  await resetSimulation();
                  prevModerationActionsRef.current = null;
                  await stepSimulation();
                  return;
                }

                if (!hasGameStarted) {
                  await stepSimulation();
                  return;
                }

                await resetSimulation();
                prevModerationActionsRef.current = null;
              })();
            }}
            disabled={loading}
          >
            {actionButtonLabel}
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="status-strip">
        <div className="status-card card">
          <span>Countdown</span>
          <strong>{daysToElection} days to election</strong>
        </div>
        <div className="status-card card">
          <span>Outcome</span>
          <strong className={`outcome outcome-${status?.outcome ?? 'running'}`}>{status?.outcome ?? 'running'}</strong>
        </div>
        <div className="status-card card">
          <span>Dictatorship</span>
          <strong>{toPercent(status?.percentages.dictatorship)}</strong>
        </div>
        <div className="status-card card">
          <span>Neutral</span>
          <strong>{toPercent(status?.percentages.neutral)}</strong>
        </div>
        <div className="status-card card">
          <span>Democracy</span>
          <strong>{toPercent(status?.percentages.democracy)}</strong>
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
        {isParameterPanelOpen ? '◀' : '▶'}
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
              parameters={parameters}
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

          <TimeSeriesChart data={timeSeries} />
        </section>
      </main>

      <footer className="footer-note">{status?.message ?? 'Loading simulation state...'}</footer>
    </div>
  );
}
