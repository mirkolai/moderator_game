import type {
  FeedResponse,
  GraphState,
  InfluenceResponse,
  SimulationParameters,
  SnapshotResponse,
  StatusResponse,
  TimeSeriesResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  startSimulation: () => request<SnapshotResponse>('/simulation/start', { method: 'POST' }),
  resetSimulation: () => request<SnapshotResponse>('/simulation/reset', { method: 'POST' }),
  stepSimulation: () => request<SnapshotResponse>('/simulation/step', { method: 'POST' }),
  getGraph: () => request<GraphState>('/graph'),
  getFeed: (nodeId: number) => request<FeedResponse>(`/feed/${nodeId}`),
  censorPosts: (postIds: string[]) =>
    request<{ censored_post_ids: string[]; censorship_actions_remaining: number }>('/moderation/censor', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds }),
    }),
  getInfluence: (postId: string) => request<InfluenceResponse>(`/posts/${postId}/influence`),
  getTimeSeries: () => request<TimeSeriesResponse>('/timeseries'),
  getParameters: () => request<SimulationParameters>('/parameters'),
  updateParameters: (params: SimulationParameters) =>
    request<SnapshotResponse>('/parameters', {
      method: 'PUT',
      body: JSON.stringify({ params }),
    }),
  getStatus: () => request<StatusResponse>('/status'),
};
