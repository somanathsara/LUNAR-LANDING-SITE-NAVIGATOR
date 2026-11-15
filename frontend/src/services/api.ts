/** API service layer for Lunar Landing Site Navigator frontend. */

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Health
  health: () => request<{ status: string; version: string; spice_kernels_loaded: number }>('/health'),

  // Sites
  sites: {
    list: () => request<Site[]>('/sites'),
    get: (id: string) => request<Site>(`/sites/${id}`),
    create: (site: SiteCreate) => request<Site>('/sites', { method: 'POST', body: JSON.stringify(site) }),
    update: (id: string, site: Partial<SiteCreate>) => request<Site>(`/sites/${id}`, { method: 'PATCH', body: JSON.stringify(site) }),
    delete: (id: string) => request<void>(`/sites/${id}`, { method: 'DELETE' }),
  },

  // Analysis
  analyze: {
    single: (input: AnalysisInput) => request<AnalysisRun>('/analyze', { method: 'POST', body: JSON.stringify(input) }),
    timeSeries: (input: AnalysisInput) => request<AnalysisRun[]>('/analyze/time-series', { method: 'POST', body: JSON.stringify(input) }),
    get: (id: string) => request<AnalysisRun>(`/analyses/${id}`),
  },

  // Comparison
  compare: {
    create: (input: ComparisonInput) => request<Comparison>('/compare', { method: 'POST', body: JSON.stringify(input) }),
    get: (id: string) => request<Comparison>(`/comparisons/${id}`),
  },

  // AI Explanation
  ai: {
    explain: (question: AIQuestion) => request<AIResponse>('/ai/explain', { method: 'POST', body: JSON.stringify(question) }),
  },

  // Export
  export: {
    download: (payload: ExportRequest) => request<Blob>('/export', { method: 'POST', body: JSON.stringify(payload) }),
  },
};

// Type definitions (mirror backend schemas)
export interface Site {
  site_id: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  latitude_type: 'planetocentric' | 'planetographic';
  longitude_convention: 'east-positive' | 'west-positive';
  elevation_m?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  latitude_type?: 'planetocentric' | 'planetographic';
  longitude_convention?: 'east-positive' | 'west-positive';
  elevation_m?: number;
  notes?: string;
}

export interface TimeInput {
  timestamp_utc: string;
  interval_seconds?: number;
  steps?: number;
}

export interface AnalysisInput {
  site: SiteCreate;
  time: TimeInput;
  conventions?: {
    latitude_type: 'planetocentric' | 'planetographic';
    longitude_convention: 'east-positive' | 'west-positive';
  };
}

export interface GeometryResult {
  target: 'SUN' | 'EARTH';
  azimuth_deg: number | null;
  elevation_deg: number | null;
  geometric_visible: boolean | null;
  terrain_visible: 'clear' | 'obstructed' | 'unavailable' | null;
  units: string;
  frame: string;
  provenance: Record<string, unknown>;
}

export interface AnalysisRun {
  analysis_id: string;
  site_id: string;
  timestamp_utc: string;
  created_at_utc: string;
  algorithm_version: string;
  status: 'pending' | 'completed' | 'failed';
  data_mode: 'LIVE' | 'DEMO';
  input_snapshot: {
    site: Site;
    time: TimeInput;
  };
  geometry_results: GeometryResult[];
  limitations: string[];
}

export interface ComparisonWeights {
  sun_elevation: number;
  sun_visibility: number;
  earth_visibility: number;
  terrain_sun: number;
  terrain_earth: number;
}

export interface ComparisonInput {
  sites: SiteCreate[];
  time: TimeInput;
  weights?: ComparisonWeights;
  conventions?: {
    latitude_type: 'planetocentric' | 'planetographic';
    longitude_convention: 'east-positive' | 'west-positive';
  };
}

export interface ComparisonComponentScores {
  sun_elevation: number;
  sun_visibility: number;
  earth_visibility: number;
  terrain_sun: number;
  terrain_earth: number;
}

export interface ComparisonRanking {
  analysis_id: string;
  site_name: string;
  score: number | null;
  rank: number | null;
}

export interface Comparison {
  comparison_id: string;
  analysis_ids: string[];
  weights: ComparisonWeights;
  component_scores: Record<string, ComparisonComponentScores>;
  ranking: ComparisonRanking[];
  created_at_utc: string;
}

export interface AIQuestion {
  question: string;
  analysis_id: string;
}

export interface AIResponse {
  question: string;
  answer: string;
  analysis_id: string;
  grounded: boolean;
  disclaimer: string;
}

export interface ExportRequest {
  format: 'json' | 'csv';
  analyses: string[];
  comparison_id?: string;
}