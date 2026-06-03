import { useEffect, useRef, useState } from 'react';

import { api } from '../api/client';
import type {
  AppNotification,
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
  const [graph, setGraph] = useState<GraphState | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [parameters, setParameters] = useState<SimulationParameters | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<number[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const selectedNodeIdRef = useRef<number | null>(null);
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

  const refreshSelectedFeed = async (nodeId: number | null) => {
    if (nodeId === null) {
      setFeed(null);
      return;
    }
    const nextFeed = await api.getFeed(nodeId);
    setFeed(nextFeed);
  };

  const hydrate = async (
    loader: () => Promise<SnapshotResponse>,
    feedNodeId: number | null = selectedNodeIdRef.current,
  ): Promise<SnapshotResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loader();
      const next = applySnapshot(snapshot);
      setGraph(next.graph);
      setStatus(next.status);
      setParameters(next.parameters);
      setTimeSeries(next.timeSeries);
      if (feedNodeId !== null) {
        await refreshSelectedFeed(feedNodeId);
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

    void (async () => {
      await hydrate(api.startSimulation);
      await stepSimulation();
      addNotification(
        'Each node is a citizen in the online community. Your mission is to defend democracy before election day. The simulation is already running: inspect feeds, highlight influence, and moderate strategically.',
        1,
      );
    })();
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
      const nextFeed = await api.getFeed(nodeId);
      setFeed(nextFeed);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load feed');
    }
  };

  const highlightInfluence = async (post: PostRecord) => {
    setHighlightedPostId(post.id);
    try {
      const influence = await api.getInfluence(post.id);
      setHighlightedNodeIds(influence.influenced_nodes);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load influence');
    }
  };

  const censorPost = async (postId: string) => {
    try {
      const moderation = await api.censorPosts([postId]);
      setStatus((current: StatusResponse | null) =>
        current
          ? {
              ...current,
              censorship_actions_remaining: moderation.censorship_actions_remaining,
            }
          : current,
      );
      if (selectedNodeId !== null) {
        await refreshSelectedFeed(selectedNodeId);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to moderate post');
    }
  };

  const stepSimulation = async () => {
    const prevKeys = prevEdgeKeysRef.current;
    const snapshot = await hydrate(api.stepSimulation);
    if (!snapshot) return;

    const currentStep = snapshot.status.current_step;
    const currentKeys = new Set(snapshot.graph.edges.map((e) => `${e.source}-${e.target}`));
    prevEdgeKeysRef.current = currentKeys;

    if (!firstPostNotifiedRef.current && currentStep >= 1) {
      firstPostNotifiedRef.current = true;
      addNotification(
        'Citizens have started publishing content. Click a node to inspect its feed, then click a post to highlight influenced users. Use moderation actions carefully: every intervention can change election momentum.',
        currentStep,
      );
    }

    if (!firstEdgeRemovedNotifiedRef.current && prevKeys.size > 0) {
      const hasRemoval = [...prevKeys].some((key) => !currentKeys.has(key));
      if (hasRemoval) {
        firstEdgeRemovedNotifiedRef.current = true;
        addNotification(
          'Some citizens are drifting apart ideologically. When opinions diverge enough, social ties can break and dashed links mark those disrupted relationships.',
          currentStep,
        );
      }
    }

    if (!firstEdgeAddedNotifiedRef.current && prevKeys.size > 0) {
      const hasAddition = [...currentKeys].some((key) => !prevKeys.has(key));
      if (hasAddition) {
        firstEdgeAddedNotifiedRef.current = true;
        addNotification(
          'Opinion convergence can also create new ties. Bold links indicate new relationships that can amplify either democratic or authoritarian narratives.',
          currentStep,
        );
      }
    }
  };

  const resetSimulation = async () => {
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
    await hydrate(api.resetSimulation, null);
  };

  const updateParameters = async (nextParameters: SimulationParameters) => {
    selectedNodeIdRef.current = null;
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    await hydrate(() => api.updateParameters(nextParameters), null);
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
    error,
    notifications,
    addNotification,
    markAllRead,
    selectNode,
    highlightInfluence,
    censorPost,
    stepSimulation,
    resetSimulation,
    updateParameters,
  };
}
