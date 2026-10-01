import { useState } from 'react';

import { getAnimalImageForNode } from '../config/animals';
import { CATEGORY_CONFIG } from '../config/categories';

interface TutorialOverlayProps {
  winImage: string;
  loseImage: string;
  onClose: () => void;
}

interface TutorialNode {
  id: number;
  state: number;
  posts: number;
  x: number;
  y: number;
}

interface TutorialStep {
  eyebrow: string;
  title: string;
  explanation: string;
  action: string;
}

const INITIAL_NODES: TutorialNode[] = [
  { id: 1, state: 0.78, posts: 2, x: 12, y: 22 },
  { id: 2, state: 0.52, posts: 1, x: 35, y: 44 },
  { id: 3, state: 0.24, posts: 3, x: 78, y: 20 },
  { id: 4, state: 0.48, posts: 1, x: 54, y: 76 },
  { id: 5, state: 0.72, posts: 2, x: 86, y: 72 },
  { id: 6, state: 0.68, posts: 1, x: 18, y: 78 },
  { id: 7, state: 0.35, posts: 2, x: 52, y: 20 },
];

const TUTORIAL_EDGES: Array<[number, number]> = [
  [1, 2], [2, 3], [2, 4], [4, 5], [1, 4], [3, 5], [1, 6], [6, 4], [2, 7], [7, 4],
];

const TUTORIAL_EDGE_CHANGES = new Map<string, 'new' | 'removed'>([
  ['7-4', 'new'],
  ['1-4', 'removed'],
]);

const TUTORIAL_POSTS = [
  {
    id: 'forest-update',
    creatorNode: 1,
    category: 'alpha',
    seenBy: 2,
    reposts: 1,
    author: 'Node 1',
    text: 'The forest council is meeting tonight to discuss safer paths for everyone.',
    misleading: false,
  },
  {
    id: 'zoo-promise',
    creatorNode: 3,
    category: 'gamma',
    seenBy: 3,
    reposts: 2,
    author: 'Node 3',
    text: 'FACT: the zoo guarantees a perfect life for every animal. Leave the forest now or your family will be in danger!',
    misleading: true,
  },
];

const STEPS: TutorialStep[] = [
  {
    eyebrow: 'Step 1 of 7',
    title: 'Read the network before acting',
    explanation: 'This fixed tutorial has 7 animals and visible connections. Blue nodes protect the forest, orange nodes support the zoo, and teal nodes are undecided. The dark border is the normal state; a selected node gets a light border, while nodes outside its friend network fade.',
    action: 'Continue to node inspection',
  },
  {
    eyebrow: 'Step 2 of 7',
    title: 'Watch connections change',
    explanation: 'A new arc can form when two unconnected animals converge on the same opinion cluster. An arc can be removed when connected animals diverge enough. The yellow arc from node 7 to node 4 is new; the red dashed arc from node 1 to node 4 was removed.',
    action: 'Continue to node inspection',
  },
  {
    eyebrow: 'Step 3 of 7',
    title: 'Select the node carrying the risk',
    explanation: 'Click node 3, the orange Pro Zoo node. Its alignment is 0.24 and it has already published 3 posts, so it is the best place to inspect first.',
    action: 'Continue with node 3',
  },
  {
    eyebrow: 'Step 4 of 7',
    title: 'Open the node feed and inspect it',
    explanation: 'The feed shows what this animal can spread to its friends. Read both posts before acting, then identify the one that uses false certainty and fear to push the zoo narrative.',
    action: 'Open node 3 feed',
  },
  {
    eyebrow: 'Step 5 of 7',
    title: 'Moderate the misleading post',
    explanation: 'This post is misleading because it presents an impossible guarantee, gives no evidence, and uses fear to force a decision. Its author has 2 friends, so stopping it prevents a wider spread in this small network. The author alignment itself stays at 0.24: moderation blocks propagation, it does not rewrite the author.',
    action: 'Moderate the recommended post',
  },
  {
    eyebrow: 'Step 6 of 7',
    title: 'See what happens without moderation',
    explanation: 'This is the fixed counterfactual: if node 3\'s misleading post had continued spreading, node 2 would have moved from 0.52 Undecided to 0.22 Pro Zoo on the next step. Moderation prevents that transfer of influence.',
    action: 'Continue to the final rules',
  },
  {
    eyebrow: 'Step 7 of 7',
    title: 'Know how to avoid losing',
    explanation: 'In a real match, inspect the feed every day, moderate the most harmful misleading post, and advance only after using your available action. At the final day, Pro Forest must remain ahead of Pro Zoo.',
    action: 'See both possible outcomes',
  },
];

function getNodeCategory(state: number) {
  if (state >= 0.65) return CATEGORY_CONFIG.alpha;
  if (state <= 0.35) return CATEGORY_CONFIG.gamma;
  return CATEGORY_CONFIG.beta;
}

export function TutorialOverlay({ winImage, loseImage, onClose }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [moderated, setModerated] = useState(false);
  const [completed, setCompleted] = useState(false);
  const step = STEPS[stepIndex];
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const canAdvance = stepIndex === 0 || stepIndex === 1 || (stepIndex === 2 && selectedNodeId === 3) || (stepIndex === 3 && selectedNodeId === 3) || (stepIndex === 4 && selectedNodeId === 3 && feedVisible && !moderated) || stepIndex === 5 || stepIndex === 6;

  const completeStep = () => {
    if (!canAdvance) return;
    if (stepIndex === 3 && !feedVisible) {
      setFeedVisible(true);
      return;
    }
    if (stepIndex === 4 && !moderated) {
      setModerated(true);
      setStepIndex(5);
      return;
    }
    if (stepIndex === STEPS.length - 1) {
      setCompleted(true);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const restart = () => {
    setStepIndex(0);
    setNodes(INITIAL_NODES);
    setSelectedNodeId(null);
    setFeedVisible(false);
    setModerated(false);
    setCompleted(false);
  };

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <section className="tutorial-card card">
        <div className="tutorial-card__header">
          <div>
            <p className="eyebrow">Guided tutorial</p>
            <h2 id="tutorial-title">Protect the forest in 7 nodes</h2>
          </div>
          <button type="button" className="tutorial-close" onClick={onClose} aria-label="Close tutorial">×</button>
        </div>

        {completed ? (
          <div className="tutorial-result">
            <p className="tutorial-result__kicker">Deterministic walkthrough complete</p>
            <h3>These are the two possible conclusions</h3>
            <p>The guided sequence always ends at the same checkpoint. In the real game, repeat the rules: inspect, moderate the most harmful post, then advance the day. Keep Pro Forest ahead when the bulldozers arrive.</p>
            <div className="tutorial-outcomes">
              <article className="tutorial-outcome tutorial-outcome--win">
                <h4>You Win</h4>
                <img src={winImage} alt="You win illustration" />
                <p>Pro Forest remains ahead at the final evaluation, so the community protects the forest.</p>
              </article>
              <article className="tutorial-outcome tutorial-outcome--lose">
                <h4>You Lose</h4>
                <img src={loseImage} alt="You lose illustration" />
                <p>Pro Zoo leads at the final evaluation, so the bulldozers arrive and the forest is lost.</p>
              </article>
            </div>
            <div className="tutorial-card__footer">
              <button type="button" className="secondary-button" onClick={restart}>Restart tutorial</button>
              <button type="button" className="primary-button" onClick={onClose}>Enter simulation</button>
            </div>
          </div>
        ) : (
          <>
            <div className="tutorial-layout">
              <div className="tutorial-network" aria-label="Interactive fixed tutorial network with 7 nodes">
                <div className="tutorial-network__meta">
                  <span>Interactive fixed setup</span>
                  <strong>7 nodes</strong>
                </div>
                <div className="tutorial-network__canvas">
                  <svg className="tutorial-network__edges" viewBox="0 0 100 100" aria-hidden="true">
                    {TUTORIAL_EDGES.map(([sourceId, targetId]) => {
                      const source = INITIAL_NODES.find((node) => node.id === sourceId)!;
                      const target = INITIAL_NODES.find((node) => node.id === targetId)!;
                      const change = stepIndex >= 1 ? TUTORIAL_EDGE_CHANGES.get(`${sourceId}-${targetId}`) : undefined;
                      return <line key={`${sourceId}-${targetId}`} className={change ? `is-${change}` : undefined} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
                    })}
                  </svg>
                  {nodes.map((node) => {
                    const category = getNodeCategory(node.state);
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`tutorial-network__node tutorial-network__node--${category.cssToken} ${selectedNodeId === node.id ? 'is-selected' : ''} ${selectedNodeId !== null && selectedNodeId !== node.id && !TUTORIAL_EDGES.some(([source, target]) => (source === selectedNodeId && target === node.id) || (source === node.id && target === selectedNodeId)) ? 'is-faded' : ''}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={() => setSelectedNodeId(node.id)}
                        aria-label={`Select node ${node.id}`}
                      >
                        <img src={getAnimalImageForNode(node.id)} alt="" />
                        <span>{node.id}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="tutorial-network__legend">Click a node to inspect it · lines are social connections</div>
                {stepIndex >= 1 ? (
                  <div className="tutorial-graph-notes">
                    <span><i className="tutorial-edge-swatch" /> Existing connection</span>
                    <span><i className="tutorial-edge-swatch is-new" /> New connection</span>
                    <span><i className="tutorial-edge-swatch is-removed" /> Removed connection</span>
                  </div>
                ) : null}
                {selectedNode ? (
                  <div className="tutorial-node-inspector">
                    <div className="tutorial-node-inspector__heading">
                      <strong>Node {selectedNode.id}</strong>
                      <span style={{ color: getNodeCategory(selectedNode.state).color }}>{getNodeCategory(selectedNode.state).label}</span>
                    </div>
                    <div className="tutorial-alignment-track" aria-label={`Alignment ${selectedNode.state.toFixed(2)}`}>
                      <span style={{ left: `${selectedNode.state * 100}%` }} />
                    </div>
                    <div className="tutorial-alignment-values"><span>0.00 Pro Zoo</span><b>{selectedNode.state.toFixed(2)}</b><span>1.00 Pro Forest</span></div>
                    <div className="tutorial-node-inspector__stats">{selectedNode.posts} posts · {TUTORIAL_EDGES.filter(([source, target]) => source === selectedNode.id || target === selectedNode.id).length} friends</div>
                    {selectedNode.id === 3 && moderated ? <p className="tutorial-change-note">Alignment stays at 0.24. The misleading post was blocked before reaching this node's 2 friends.</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="tutorial-step">
                <p className="eyebrow">{step.eyebrow}</p>
                <h3>{step.title}</h3>
                <p>{step.explanation}</p>
                {stepIndex === 2 && selectedNodeId !== 3 ? <p className="tutorial-hint">Select the orange node 3 to continue.</p> : null}
                {stepIndex >= 3 && feedVisible ? (
                  <div className="tutorial-feed">
                    <div className="tutorial-feed__header">
                      <strong>Feed · Node 3</strong>
                      <span>2 posts visible</span>
                    </div>
                    {TUTORIAL_POSTS.map((post) => (
                      <article key={post.id} className={`post-card tutorial-post ${post.category} ${post.misleading ? 'is-misleading' : ''}`}>
                        <div className="post-card__top">
                          <img className="post-avatar" src={getAnimalImageForNode(post.creatorNode)} alt={`Animal avatar for ${post.author}`} width={44} height={44} />
                          <span className="post-card__timestamp">{post.misleading ? 'Posted today' : 'Posted 1 day ago'}</span>
                        </div>
                        <p className="post-card__content">&quot;{post.text}&quot;</p>
                        <div className="post-card__stats">
                          <span>Seen by {post.seenBy} users</span>
                          <span>{post.reposts} reposts</span>
                          <span>{post.creatorNode === 3 ? '2 friends' : '3 friends'}</span>
                        </div>
                        {post.misleading ? (
                          <>
                            <div className="tutorial-post__reason"><strong>Why misleading?</strong> It promises a guarantee without evidence and uses fear to pressure the reader.</div>
                            <div className="tutorial-post__reach"><strong>High-impact target:</strong> author has 2 friends, so moderation stops this message from reaching both connections.</div>
                          </>
                        ) : null}
                        <div className="post-card__footer">
                          {stepIndex === 4 && post.misleading ? <button type="button" className="ghost-button" disabled={moderated} onClick={completeStep}>{moderated ? 'Moderated' : 'Moderate this post'}</button> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                {stepIndex === 4 && !moderated ? <div className="tutorial-moderation-demo"><strong>1 moderation available</strong><span>Recommended target: Node 3 · misleading Pro Zoo post</span></div> : null}
                {stepIndex === 5 ? (
                  <div className="tutorial-counterfactual">
                    <div className="tutorial-counterfactual__heading"><strong>Without moderation</strong><span>Next step projection</span></div>
                    <div className="tutorial-counterfactual__row"><strong>Node 2 · Undecided</strong><span>0.52</span><b>→</b><strong className="tutorial-counterfactual__zoo">0.22 · Pro Zoo</strong></div>
                    <p>The misleading post would reach node 2 through the network and pull its alignment toward Pro Zoo. Because you moderated it, the real tutorial state keeps node 2 at 0.52.</p>
                  </div>
                ) : null}
                {stepIndex === 6 ? (
                  <ul className="tutorial-rules">
                    <li>Inspect posts before spending the daily action.</li>
                    <li>Moderate the most harmful misleading post.</li>
                    <li>Advance the day only after moderation.</li>
                    <li>Keep Pro Forest ahead at the final evaluation; moderation blocks spread but does not directly change the author's alignment.</li>
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="tutorial-progress" aria-label={`Tutorial progress: ${stepIndex + 1} of ${STEPS.length}`}>
              {STEPS.map((item, index) => <span key={item.title} className={index <= stepIndex ? 'is-active' : ''} />)}
            </div>
            <div className="tutorial-card__footer">
              <button type="button" className="secondary-button" onClick={onClose}>Close</button>
              <button type="button" className="primary-button" disabled={!canAdvance} onClick={completeStep}>{stepIndex === 3 && feedVisible ? 'Continue to moderation' : step.action}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
