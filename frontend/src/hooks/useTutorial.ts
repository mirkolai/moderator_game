import { useState } from 'react';

import {
  TUTORIAL_PARAMETERS,
  TUTORIAL_ROUNDS,
  TUTORIAL_SEED,
  TUTORIAL_WARM_UP_STEPS,
} from '../config/tutorial';
import type { FeedResponse, GraphState, PostRecord, SnapshotResponse } from '../types';

export type TutorialPhase = 'node' | 'post' | 'debunk' | 'ok' | 'bad' | 'won' | 'lost';

interface TutorialSimulation {
  graph: GraphState | null;
  feed: FeedResponse | null;
  selectNode: (nodeId: number | null) => Promise<void>;
  highlightInfluence: (post: PostRecord) => Promise<void>;
  censorPost: (postId: string) => Promise<void>;
  stepSimulation: () => Promise<SnapshotResponse | null>;
  replay: (
    parameters: typeof TUTORIAL_PARAMETERS,
    seed: number,
    warmUpSteps: number,
    days: string[][],
  ) => void;
}

/** Animals that have not seen the post yet but are friends with someone who has. */
function potentialRecipients(graph: GraphState, post: PostRecord): number[] {
  const seen = new Set(post.seen_by);
  const recipients = new Set<number>();
  for (const { source, target } of graph.edges) {
    if (seen.has(source) && !seen.has(target)) recipients.add(target);
    if (seen.has(target) && !seen.has(source)) recipients.add(source);
  }
  return [...recipients];
}

export function useTutorial(sim: TutorialSimulation) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<TutorialPhase>('node');
  const [flippedNodeIds, setFlippedNodeIds] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const current = TUTORIAL_ROUNDS[round];
  const isLastRound = round === TUTORIAL_ROUNDS.length - 1;

  const replayRound = (targetRound: number) => {
    const days = TUTORIAL_ROUNDS.slice(0, targetRound).map((entry) => [entry.rightPostId]);
    sim.replay(TUTORIAL_PARAMETERS, TUTORIAL_SEED, TUTORIAL_WARM_UP_STEPS, days);
    setRound(targetRound);
    setPhase('node');
    setFlippedNodeIds([]);
    setHint(null);
  };

  const start = () => replayRound(0);
  const rewind = () => replayRound(round);

  const next = () => {
    void sim.selectNode(null);
    setRound((value) => value + 1);
    setPhase('node');
    setFlippedNodeIds([]);
    setHint(null);
  };

  const onSelectNode = (nodeId: number | null) => {
    if (phase !== 'node' || nodeId === null) return;
    if (nodeId !== current.nodeId) {
      setHint('Not that animal: click the one marked with the purple ring.');
      return;
    }
    setHint(null);
    void sim.selectNode(nodeId);
    setPhase('post');
  };

  const onHighlightPost = (post: PostRecord) => {
    if (phase !== 'post' && phase !== 'debunk') return;
    setHint(null);
    void sim.highlightInfluence(post);
    setPhase('debunk');
  };

  const onCensorPost = async (postId: string) => {
    if (phase !== 'debunk') {
      if (phase === 'post') setHint('First click a post to see who has seen it and who could see it.');
      return;
    }
    const graphBefore = sim.graph;
    const rightPost = sim.feed?.posts.find((post) => post.id === current.rightPostId);
    if (!graphBefore || !rightPost) return;

    const isRight = postId === current.rightPostId;
    const recipients = potentialRecipients(graphBefore, rightPost);
    const wasZoo = new Set(graphBefore.nodes.filter((n) => n.classification === 'gamma').map((n) => n.id));

    await sim.censorPost(postId);
    const snapshot = await sim.stepSimulation();
    if (!snapshot) return;

    const turnedZoo = recipients.filter(
      (id) => !wasZoo.has(id) && snapshot.graph.nodes[id]?.classification === 'gamma',
    );
    setFlippedNodeIds(turnedZoo);
    setHint(null);
    if (isRight) {
      setPhase(isLastRound ? 'won' : 'ok');
    } else {
      setPhase(isLastRound ? 'lost' : 'bad');
    }
  };

  const guideNodeIds =
    phase === 'node' ? [current.nodeId] : phase === 'bad' || phase === 'lost' ? flippedNodeIds : [];

  return {
    round,
    totalRounds: TUTORIAL_ROUNDS.length,
    current,
    phase,
    hint,
    flippedNodeIds,
    guideNodeIds,
    start,
    rewind,
    next,
    onSelectNode,
    onHighlightPost,
    onCensorPost,
  };
}
