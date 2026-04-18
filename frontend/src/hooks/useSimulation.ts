import { useEffect, useState } from 'react';

import { api } from '../api/client';
import type {
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

  const refreshSelectedFeed = async (nodeId: number | null) => {
    if (nodeId === null) {
      setFeed(null);
      return;
    }
    const nextFeed = await api.getFeed(nodeId);
    setFeed(nextFeed);
  };

  const hydrate = async (loader: () => Promise<SnapshotResponse>) => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loader();
      const next = applySnapshot(snapshot);
      setGraph(next.graph);
      setStatus(next.status);
      setParameters(next.parameters);
      setTimeSeries(next.timeSeries);
      if (selectedNodeId !== null) {
        await refreshSelectedFeed(selectedNodeId);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrate(api.startSimulation);
  }, []);

  const selectNode = async (nodeId: number) => {
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
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to censor post');
    }
  };

  const stepSimulation = async () => {
    await hydrate(api.stepSimulation);
  };

  const resetSimulation = async () => {
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    await hydrate(api.resetSimulation);
  };

  const updateParameters = async (nextParameters: SimulationParameters) => {
    setSelectedNodeId(null);
    setFeed(null);
    setHighlightedNodeIds([]);
    setHighlightedPostId(null);
    await hydrate(() => api.updateParameters(nextParameters));
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
    selectNode,
    highlightInfluence,
    censorPost,
    stepSimulation,
    resetSimulation,
    updateParameters,
  };
}
