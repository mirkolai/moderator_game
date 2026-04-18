import { FeedPanel } from './components/FeedPanel';
import { NetworkGraph } from './components/NetworkGraph';
import { ParameterPanel } from './components/ParameterPanel';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { useSimulation } from './hooks/useSimulation';

function toPercent(value: number | undefined) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

export default function App() {
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
    selectNode,
    highlightInfluence,
    censorPost,
    stepSimulation,
    resetSimulation,
    updateParameters,
  } = useSimulation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Moderator Simulation</p>
          <h1>Misinformation Containment</h1>
          <p className="subtitle">
            Moderate a live social graph, suppress harmful posts, and push the network toward fact-checking before misinformation captures the majority.
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="secondary-button" onClick={() => void resetSimulation()} disabled={loading}>
            Reset
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void stepSimulation()}
            disabled={loading || status?.outcome !== 'running'}
          >
            Advance Step
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="status-strip">
        <div className="status-card card">
          <span>Step</span>
          <strong>
            {status?.current_step ?? 0} / {status?.max_steps ?? parameters?.N_steps ?? 0}
          </strong>
        </div>
        <div className="status-card card">
          <span>Outcome</span>
          <strong className={`outcome outcome-${status?.outcome ?? 'running'}`}>{status?.outcome ?? 'running'}</strong>
        </div>
        <div className="status-card card">
          <span>Misinformation</span>
          <strong>{toPercent(status?.percentages.misinformation)}</strong>
        </div>
        <div className="status-card card">
          <span>Neutral</span>
          <strong>{toPercent(status?.percentages.neutral)}</strong>
        </div>
        <div className="status-card card">
          <span>Fact-checking</span>
          <strong>{toPercent(status?.percentages['fact-checking'])}</strong>
        </div>
      </section>

      <main className="layout-grid">
        <FeedPanel
          feed={feed}
          selectedNodeId={selectedNodeId}
          highlightedPostId={highlightedPostId}
          censorshipActionsRemaining={status?.censorship_actions_remaining ?? 0}
          onHighlightPost={(post) => void highlightInfluence(post)}
          onCensorPost={(postId) => void censorPost(postId)}
        />

        <section className="main-stage">
          <div className="visual-row">
            <NetworkGraph
              graph={graph}
              selectedNodeId={selectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              onSelectNode={(nodeId) => void selectNode(nodeId)}
            />
            <ParameterPanel parameters={parameters} disabled={loading} onApply={updateParameters} />
          </div>

          <TimeSeriesChart data={timeSeries} />
        </section>
      </main>

      <footer className="footer-note">{status?.message ?? 'Loading simulation state...'}</footer>
    </div>
  );
}
