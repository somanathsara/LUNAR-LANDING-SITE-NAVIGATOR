// Lunar Landing Site Navigator - Type Definitions

// Coordinate conventions
export type LatitudeType = 'planetocentric' | 'planetographic';
export type LongitudeConvention = 'east-positive' | 'west-positive';

// Site data
export interface Site {
  site_id: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  latitude_type: LatitudeType;
  longitude_convention: LongitudeConvention;
  elevation_m?: number;
  notes?: string;
}

// Time input
export interface TimeInput {
  timestamp_utc: string; // ISO 8601
  interval_seconds?: number; // For time series
  steps?: number;
}

// Geometry result for a single target (SUN or EARTH)
export interface GeometryResult {
  target: 'SUN' | 'EARTH';
  azimuth_deg: number | null;
  elevation_deg: number | null;
  geometric_visible: boolean | null;
  terrain_visible: 'clear' | 'obstructed' | 'unavailable' | null;
  units: string;
  frame: string;
  provenance: {
    kernel_ids: string[];
    method: string;
    software_versions: Record<string, string>;
  };
}

// Analysis run
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

// Comparison
export interface Comparison {
  comparison_id: string;
  analysis_ids: string[];
  weights: Record<string, number>;
  component_scores: Record<string, Record<string, number>>;
  ranking: Array<{
    analysis_id: string;
    site_name: string;
    score: number | null;
    rank: number | null;
  }>;
  created_at_utc: string;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// UI state types
export type ScreenId = 'dashboard' | 'explorer' | 'analysis' | 'compare' | 'ai-explanation' | 'export';

export interface UIState {
  currentScreen: ScreenId;
  selectedSite: Site | null;
  candidateSites: Site[];
  comparisonSites: Site[];
  currentAnalysis: AnalysisRun | null;
  comparisonAnalysis: AnalysisRun[];
  isLoading: boolean;
  error: string | null;
}

// Demo/Synthetic data marker
export interface DemoDataMarker {
  isDemo: boolean;
  message: string;
}

// Export formats
export type ExportFormat = 'json' | 'csv';

export interface ExportData {
  format: ExportFormat;
  analyses: AnalysisRun[];
  comparison?: Comparison;
  metadata: {
    exported_at_utc: string;
    application_version: string;
    disclaimer: string;
  };
}