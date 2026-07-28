import { FeedPanel } from './components/FeedPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { NotificationBell } from './components/NotificationBell';
import { ParameterPanel } from './components/ParameterPanel';
import { CATEGORY_CONFIG } from './config/categories';
import { useSimulation } from './hooks/useSimulation';
import { useEffect, useRef, useState } from 'react';
import youWinImage from './img/youwin.png';
import youLoseImage from './img/youlose.png';

function toPercent(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}


export default function App() {
  const [isParameterPanelOpen, setIsParameterPanelOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);
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

  const missionDescription = `Mission: keep ${CATEGORY_CONFIG.alpha.label} ahead before bulldozers arrive.`;
  const currentStep = status?.current_step ?? 0;
  const maxSteps = status?.max_steps ?? parameters?.election_step ?? 0;
  const daysToElection = Math.max(0, maxSteps - currentStep);
  const moderationActionsRemaining = status?.censorship_actions_remaining ?? 0;
  const isGameRunning = status?.outcome === 'running';
  const hasGameStarted = currentStep > 0;
  const isGameFinished = !isGameRunning && hasGameStarted;
  const endgameImage = status?.outcome === 'won' ? youWinImage : youLoseImage;
  const endgameImageAlt = status?.outcome === 'won' ? 'You win illustration' : 'You lose illustration';

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

      {isWelcomeOpen ? (
        <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="welcome-card card">
            <p className="eyebrow">Welcome</p>
            <h2 id="welcome-title" className="welcome-title">Before You Begin</h2>
            <div className="welcome-content" aria-label="Welcome text">
              



<h1>Defend the Forest: Freedom Is Not for Sale</h1>

<p>
  Welcome to <strong>Moderator</strong>, where you are responsible for monitoring
  the official social network of the forest animals!
</p>

<p>
  Humans are preparing an invasion. Their goal is to cut down the forest and
  build a zoo. To achieve this, they are flooding the social network with
  misleading posts, false promises, and manipulative messages, trying to convince
  the animals that life in cages is safer and more comfortable than living free
  in nature.
</p>

<p>
  As the <strong>Chief Moderator</strong>, your mission is to protect the animal
  community from this digital propaganda. You must:
</p>

<ul>
  <li>Identify posts that spread false information about the forest or the zoo.</li>
  <li>Moderate messages that use deceptive language to manipulate or frighten the animals.</li>
  <li>Reduce the visibility of content that creates unnecessary panic within the community.</li>
</ul>

<p>
  You only have a few days before the bulldozers arrive. If public opinion among
  the animals remains in favor of protecting the forest, the humans will face a
  united community and will be forced to abandon their plans forever.
</p>

<p>
  However, if human propaganda prevails, the animals will fall for the deception,
  the forest will be destroyed, and they will all end up living behind bars in
  cages.
</p>

<p>
  <strong>Stay alert.</strong> Carefully analyze every post, protect the truth,
  and preserve the freedom of the forest.
</p>

<h2>The fate of the forest is in your hands.</h2>







            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsWelcomeOpen(false)}
            >
              Enter Simulation
            </button>
          </div>
        </div>
      ) : null}

      <section className="status-strip">
        <div className="status-card card">
          <span>Countdown</span>
          <strong>{daysToElection} days to bulldozers arrive</strong>
        </div>
        <div className="status-card card">
          <span>Distribution</span>
          <div className="status-stack">
            <div className="status-bar-row gamma-row">
              <strong>{toPercent(status?.percentages.gamma)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill gamma-fill" style={{ width: toPercent(status?.percentages.gamma) }} />
              </div>
            </div>
            <div className="status-bar-row beta-row">
              <strong>{toPercent(status?.percentages.beta)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill beta-fill" style={{ width: toPercent(status?.percentages.beta) }} />
              </div>
            </div>
            <div className="status-bar-row alpha-row">
              <strong>{toPercent(status?.percentages.alpha)}</strong>
              <div className="status-bar-track">
                <div className="status-bar-fill alpha-fill" style={{ width: toPercent(status?.percentages.alpha) }} />
              </div>
            </div>
          </div>
        </div>
        <div className="status-card card">
          <span>Legend</span>
          <div className="status-legend">
            <div className="status-legend-item">
              <i className="legend-dot gamma" />
              <span>{CATEGORY_CONFIG.gamma.label}</span>
            </div>
            <div className="status-legend-item">
              <i className="legend-dot beta" />
              <span>{CATEGORY_CONFIG.beta.label}</span>
            </div>
            <div className="status-legend-item">
              <i className="legend-dot alpha" />
              <span>{CATEGORY_CONFIG.alpha.label}</span>
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
              {status?.outcome === 'won' ? 'You Win' : 'You Lose'}
            </h2>
            <img className="endgame-image" src={endgameImage} alt={endgameImageAlt} />
            <p className="endgame-message">{status?.message ?? 'The simulation has ended.'}</p>
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
