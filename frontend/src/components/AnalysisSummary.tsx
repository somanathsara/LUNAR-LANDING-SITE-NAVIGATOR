import React from 'react';
import { AnalysisRun, GeometryResult } from '../types';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

interface AnalysisSummaryProps {
  analysis: AnalysisRun;
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  return `${value.toFixed(2)} ${unit}`;
}

function getVisibilityBadge(visible: boolean | null, label: string) {
  if (visible === null) {
    return <Badge variant="default">Unknown</Badge>;
  }
  return visible ? (
    <Badge variant="success">{label} Visible</Badge>
  ) : (
    <Badge variant="danger">{label} Obstructed</Badge>
  );
}

function getTerrainBadge(terrain: 'clear' | 'obstructed' | 'unavailable' | null) {
  switch (terrain) {
    case 'clear':
      return <Badge variant="success">Clear</Badge>;
    case 'obstructed':
      return <Badge variant="danger">Obstructed</Badge>;
    case 'unavailable':
      return <Badge variant="default">No DEM Data</Badge>;
    default:
      return <Badge variant="default">Unknown</Badge>;
  }
}

export default function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  const sunResult = analysis.geometry_results.find(r => r.target === 'SUN');
  const earthResult = analysis.geometry_results.find(r => r.target === 'EARTH');

  return (
    <Card variant="elevated" className="animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold">Analysis Results</h3>
          <p className="text-xs text-muted mt-1">
            {new Date(analysis.timestamp_utc).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </p>
        </div>
        <Badge variant={analysis.data_mode === 'DEMO' ? 'warning' : 'success'}>
          {analysis.data_mode}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Sun Card */}
        <Card variant="outlined" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-warning" aria-hidden="true">☀</span>
            <h4 className="font-medium text-sm">Sun Geometry</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Azimuth</span>
              <span className="font-mono text-primary">{formatValue(sunResult?.azimuth_deg ?? null, '°')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Elevation</span>
              <span className="font-mono text-primary">{formatValue(sunResult?.elevation_deg ?? null, '°')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Geometric</span>
              {getVisibilityBadge(sunResult?.geometric_visible ?? null, 'Sun')}
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Terrain</span>
              {getTerrainBadge(sunResult?.terrain_visible ?? null)}
            </div>
          </div>
        </Card>

        {/* Earth Card */}
        <Card variant="outlined" className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-info" aria-hidden="true">🌍</span>
            <h4 className="font-medium text-sm">Earth Geometry</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Azimuth</span>
              <span className="font-mono text-primary">{formatValue(earthResult?.azimuth_deg ?? null, '°')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Elevation</span>
              <span className="font-mono text-primary">{formatValue(earthResult?.elevation_deg ?? null, '°')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Geometric</span>
              {getVisibilityBadge(earthResult?.geometric_visible ?? null, 'Earth')}
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Terrain</span>
              {getTerrainBadge(earthResult?.terrain_visible ?? null)}
            </div>
          </div>
        </Card>
      </div>

      {/* Metadata */}
      <details className="text-xs text-muted border-t border-secondary pt-3">
        <summary className="cursor-pointer font-medium text-secondary mb-2">Provenance & Metadata</summary>
        <div className="space-y-1 font-mono">
          <div>Algorithm: {analysis.algorithm_version}</div>
          <div>Kernels: {analysis.geometry_results[0]?.provenance?.kernel_ids.join(', ') || 'N/A'}</div>
          <div>Frame: {analysis.geometry_results[0]?.frame || 'N/A'}</div>
          <div>Status: {analysis.status}</div>
        </div>
      </details>

      {/* Limitations */}
      {analysis.limitations.length > 0 && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded text-xs">
          <div className="font-medium text-warning mb-1">Limitations</div>
          <ul className="list-disc list-inside space-y-1 text-muted">
            {analysis.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}