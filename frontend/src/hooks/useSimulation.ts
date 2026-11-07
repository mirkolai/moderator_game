import { useEffect, useRef, useState } from 'react';

import { CATEGORY_CONFIG } from '../config/categories';
import { SimulationEngine } from '../simulation/engine';
import type {
  AppNotification,
  DayAnimation,
  FeedResponse,
  GraphState,
  PostRecord,
  SimulationParameters,
  SnapshotResponse,
  StatusResponse,
  TimeSeriesPoint,
} from '../types';

function applySnapshot(snapshot: SnapshotResponse) {
  return {
    graph: snapshot.graph,
    status: snapshot.status,
    parameters: snapshot.parameters,
    timeSeries: snapshot.time_series.series,
  };
}

export function useSimulation() {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new SimulationEngine();
  }
  const engine = engineRef.current;

  const [graph, setGraph] = useState<GraphState | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [parameters, setParameters] = useState<SimulationParameters | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<number[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayAnimation, setDayAnimation] = useState<DayAnimation | null>(null);
  const [isDayAnimating, setIsDayAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const selectedNodeIdRef = useRef<number | null>(null);
  const isDayAnimatingRef = useRef(false);
  const dayAnimationIdRef = useRef(0);
  const firstPostNotifiedRef = useRef(false);
  const firstEdgeRemovedNotifiedRef = useRef(false);
  const firstEdgeAddedNotifiedRef = useRef(false);
  const prevEdgeKeysRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  const addNotification = (message: string, step: number) => {
    setNotifications((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        message,
        step,
        read: false,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const refreshSelectedFeed = (nodeId: number | null) => {
    if (nodeId === null) {
      setFeed(null);
      return;
    }
    setFeed(engine.getFeed(nodeId));
  };

  const hydrate = (
    loader: () => SnapshotResponse,
    feedNodeId: number | null = selectedNodeIdRef.current,
  ): SnapshotResponse | null => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = loader();
      const next = applySnapshot(snapshot);
      setGraph(next.graph);
      setStatus(next.status);
      setParameters(next.parameters);
      setTimeSeries(next.timeSeries);
      if (feedNodeId !== null) {
        refreshSelectedFeed(feedNodeId);
      }
      return snapshot;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    hydrate(() => engine.reset());
    addNotification(
      `Each node is an animal in the online community. Your mission is to keep ${CATEGORY_CONFIG.pro_forest.label} ahead until the last day. Once the first day begins, inspect feeds, highlight influence, and moderate strategically.`,
      0,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectNode = async (nodeId: number | null) => {
    if (nodeId === null) {
      selectedNodeIdRef.current = null;
      setSelectedNodeId(null);
      setFeed(null);
      setHighlightedNodeIds([]);
      setHighlightedPostId(null);
      return;
    }
    selectedNodeIdRef.current = nodeId;
    setSelectedNodeId(nodeId);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    try {
      setFeed(engine.getFeed(nodeId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load feed');
    }
  };

  const highlightInfluence = async (post: PostRecord) => {
    setHighlightedPostId(post.id);
    try {
      const influence = engine.getPostInfluence(post.id);
      setHighlightedNodeIds(influence.influenced_nodes);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load influence');
    }
  };

  const censorPost = async (postId: string) => {
    try {
      const moderation = engine.censorPosts([postId]);
      const snapshot = engine.getSummary();
      setGraph(snapshot.graph);
      setTimeSeries(snapshot.time_series.series);
      setStatus({
        ...snapshot.status,
        censorship_actions_remaining: moderation.censorship_actions_remaining,
      });
      if (selectedNodeId !== null) {
        refreshSelectedFeed(selectedNodeId);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to moderate post');
    }
  };

  const stepSimulation = async (animate = true) => {
    if (isDayAnimatingRef.current) return null;
    const initialGraph = engine.getGraphState();
    const prevKeys = prevEdgeKeysRef.current;
    const snapshot = hydrate(() => engine.step());
    if (!snapshot) return null;
    const events = engine.getLastPropagationEvents();
    if (animate && events.length > 0) {
      isDayAnimatingRef.current = true;
      setIsDayAnimating(true);
      setDayAnimation({
        id: dayAnimationIdRef.current++,
        initial_states: initialGraph.nodes.map((node) => node.state),
        final_states: snapshot.graph.nodes.map((node) => node.state),
        events,
      });
    }

    const currentStep = snapshot.status.current_step;
    const currentKeys = new Set(snapshot.graph.edges.map((e) => `${e.source}-${e.target}`));
    prevEdgeKeysRef.current = currentKeys;

    if (!firstPostNotifiedRef.current && currentStep >= 1) {
      firstPostNotifiedRef.current = true;
      addNotification(
        'Animals have started publishing content. Click a node to inspect its feed, then click a post to highlight influenced users. Use moderation actions carefully: every intervention can change animal opinion.',
        currentStep,
      );
    }

    if (!firstEdgeRemovedNotifiedRef.current && prevKeys.size > 0) {
      const hasRemoval = [...prevKeys].some((key) => !currentKeys.has(key));
      if (hasRemoval) {
        firstEdgeRemovedNotifiedRef.current = true;
        addNotification(
          'Some animals are drifting apart ideologically. When opinions diverge enough, social ties can break and dashed links mark those disrupted relationships.',
          currentStep,
        );
      }
    }

    if (!firstEdgeAddedNotifiedRef.current && prevKeys.size > 0) {
      const hasAddition = [...currentKeys].some((key) => !prevKeys.has(key));
      if (hasAddition) {
        firstEdgeAddedNotifiedRef.current = true;
        addNotification(
          'Opinion convergence can also create new ties. Bold links indicate new relationships that can amplify either high-end or low-end narrative streams.',
          currentStep,
        );
      }
    }

    return snapshot;
  };

  const finishDayAnimation = () => {
    isDayAnimatingRef.current = false;
    setIsDayAnimating(false);
    setDayAnimation(null);
  };

  const resetSimulation = async () => {
    finishDayAnimation();
    selectedNodeIdRef.current = null;
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    setNotifications([]);
    firstPostNotifiedRef.current = false;
    firstEdgeRemovedNotifiedRef.current = false;
    firstEdgeAddedNotifiedRef.current = false;
    prevEdgeKeysRef.current = new Set();
    hydrate(() => engine.reset(), null);
  };

  /** Rebuilds a fully deterministic game: seeded start, warm-up days, then one debunk list per day. */
  const replay = (
    replayParameters: SimulationParameters,
    seed: number,
    warmUpSteps: number,
    days: string[][],
  ) => {
    finishDayAnimation();
    selectedNodeIdRef.current = null;
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    setNotifications([]);
    firstPostNotifiedRef.current = true;
    firstEdgeRemovedNotifiedRef.current = true;
    firstEdgeAddedNotifiedRef.current = true;
    hydrate(() => {
      engine.reset(replayParameters, seed);
      for (let day = 0; day < warmUpSteps; day += 1) {
        engine.step();
      }
      for (const postIds of days) {
        engine.censorPosts(postIds);
        engine.step();
      }
      return engine.getSummary();
    }, null);
    prevEdgeKeysRef.current = new Set(engine.getGraphState().edges.map((e) => `${e.source}-${e.target}`));
  };

  const loadLevel = async (levelParameters: SimulationParameters) => {
    finishDayAnimation();
    selectedNodeIdRef.current = null;
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    setNotifications([]);
    firstPostNotifiedRef.current = false;
    firstEdgeRemovedNotifiedRef.current = false;
    firstEdgeAddedNotifiedRef.current = false;
    prevEdgeKeysRef.current = new Set();
    hydrate(() => engine.reset(levelParameters), null);
    await stepSimulation();
  };

  const updateParameters = async (nextParameters: SimulationParameters) => {
    finishDayAnimation();
    selectedNodeIdRef.current = null;
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    hydrate(() => engine.updateParameters(nextParameters), null);
    await stepSimulation();
  };

  return {
    graph,
    status,
    parameters,
    timeSeries,
    selectedNodeId,
    feed,
    highlightedNodeIds,
    highlightedPostId,
    loading,
    dayAnimation,
    isDayAnimating,
    error,
    notifications,
    addNotification,
    markAllRead,
    selectNode,
    highlightInfluence,
    censorPost,
    stepSimulation,
    finishDayAnimation,
    resetSimulation,
    loadLevel,
    replay,
    updateParameters,
  };
}
