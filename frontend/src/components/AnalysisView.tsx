import React from 'react';
import { AnalysisRun, GeometryResult } from '../types';
import  Card  from './Card';
import  Button  from './Button';
import  Badge  from './Badge';
import { formatValue, getVisibilityBadge, getTerrainBadge } from './AnalysisSummary';

interface AnalysisViewProps {
  analysis: AnalysisRun;
  onBack: () => void;
  onCompare: () => void;
  onAIExplain: () => void;
  onExport: () => void;
}

function GeometryCard({ result, title, icon, color }: {
  result: GeometryResult | undefined;
  title: string;
  icon: string;
  color: string;
}) {
  if (!result) return null;

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color }} aria-hidden="true">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted mb-1">Azimuth</div>
          <div className="font-mono text-xl text-primary">{formatValue(result.azimuth_deg, '°')}</div>
          <div className="text-xs text-muted">0°=N, +East</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Elevation</div>
          <div className="font-mono text-xl text-primary">{formatValue(result.elevation_deg, '°')}</div>
          <div className="text-xs text-muted">Horizon=0°</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-tertiary/50 rounded">
          <div className="text-xs text-muted mb-1">Geometric Visibility</div>
          {getVisibilityBadge(result.geometric_visible ?? null, title === 'Sun Geometry' ? 'Sun' : 'Earth')}
        </div>
        <div className="p-3 bg-tertiary/50 rounded">
          <div className="text-xs text-muted mb-1">Terrain Visibility</div>
          {getTerrainBadge(result.terrain_visible ?? null)}
        </div>
      </div>
    </Card>
  );
}

function ProvenancePanel({ analysis }: { analysis: AnalysisRun }) {
  const result = analysis.geometry_results[0];

  return (
    <Card variant="outlined" className="p-4">
      <h3 className="font-semibold mb-3">Provenance & Metadata</h3>
      <dl className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <dt className="text-muted">Algorithm Version</dt>
          <dd className="font-mono text-primary">{analysis.algorithm_version}</dd>
          <dt className="text-muted">SPICE Kernels</dt>
          <dd className="font-mono text-primary text-xs truncate">{result?.provenance.kernel_ids.join(', ') || 'N/A'}</dd>
          <dt className="text-muted">Reference Frame</dt>
          <dd className="font-mono text-primary">{result?.frame || 'N/A'}</dd>
          <dt className="text-muted">Units</dt>
          <dd className="font-mono text-primary">{result?.units || 'N/A'}</dd>
          <dt className="text-muted">Data Mode</dt>
          <dd className="font-mono">
            <Badge variant={analysis.data_mode === 'DEMO' ? 'warning' : 'success'}>{analysis.data_mode}</Badge>
          </dd>
          <dt className="text-muted">Status</dt>
          <dd className="font-mono">
            <Badge variant={analysis.status === 'completed' ? 'success' : 'default'}>{analysis.status}</Badge>
          </dd>
          <dt className="text-muted">Analysis ID</dt>
          <dd className="font-mono text-xs col-span-2 truncate">{analysis.analysis_id}</dd>
          <dt className="text-muted">Site ID</dt>
          <dd className="font-mono text-xs col-span-2 truncate">{analysis.site_id}</dd>
          <dt className="text-muted">Timestamp (UTC)</dt>
          <dd className="font-mono text-xs col-span-2">{analysis.timestamp_utc}</dd>
        </div>
      </dl>
    </Card>
  );
}

function LimitationsPanel({ limitations }: { limitations: string[] }) {
  return (
    <Card variant="outlined" className="p-4 border-warning/30 bg-warning/5">
      <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
        <span aria-hidden="true">⚠</span> Limitations & Caveats
      </h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-muted">
        {limitations.map((lim, i) => (
          <li key={i}>{lim}</li>
        ))}
      </ul>
    </Card>
  );
}

function CoordinateInfo({ analysis }: { analysis: AnalysisRun }) {
  const site = analysis.input_snapshot.site;

  return (
    <Card variant="outlined" className="p-4">
      <h3 className="font-semibold mb-3">Site Coordinates</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted">Name</dt>
        <dd className="font-medium">{site.name}</dd>
        <dt className="text-muted">Latitude</dt>
        <dd className="font-mono">{site.latitude_deg.toFixed(6)}° ({site.latitude_type})</dd>
        <dt className="text-muted">Longitude</dt>
        <dd className="font-mono">{site.longitude_deg.toFixed(6)}° ({site.longitude_convention})</dd>
        {site.elevation_m && (
          <>
            <dt className="text-muted">Elevation</dt>
            <dd className="font-mono">{site.elevation_m.toFixed(1)} m</dd>
          </>
        )}
        <dt className="text-muted">Timestamp (UTC)</dt>
        <dd className="font-mono text-xs">{analysis.timestamp_utc}</dd>
      </dl>
    </Card>
  );
}

export default function AnalysisView({ analysis, onBack, onCompare, onAIExplain, onExport }: AnalysisViewProps) {
  const sunResult = analysis.geometry_results.find(r => r.target === 'SUN');
  const earthResult = analysis.geometry_results.find(r => r.target === 'EARTH');

  return (
    <div className="analysis-view space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="text-secondary hover:text-primary">
          ← Back
        </Button>
        <div>
          <h2 className="font-semibold text-lg">{analysis.input_snapshot.site.name}</h2>
          <p className="text-sm text-muted">
            Analysis at {new Date(analysis.timestamp_utc).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={analysis.data_mode === 'DEMO' ? 'warning' : 'success'}>
            {analysis.data_mode} DATA
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Geometry Results */}
        <section className="lg:col-span-7 space-y-6">
          {/* Sun & Earth Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GeometryCard
              result={sunResult}
              title="Sun Geometry"
              icon="☀"
              color="#ffb800"
            />
            <GeometryCard
              result={earthResult}
              title="Earth Geometry"
              icon="🌍"
              color="#00a3e0"
            />
          </div>

          {/* Site Coordinates */}
          <CoordinateInfo analysis={analysis} />
        </section>

        {/* Right Column - Metadata & Actions */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Provenance */}
          <ProvenancePanel analysis={analysis} />

          {/* Limitations */}
          <LimitationsPanel limitations={analysis.limitations} />

          {/* Actions */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold mb-2">Actions</h3>
            <div className="flex flex-col gap-2">
              <Button onClick={onCompare} variant="outline" className="w-full">
                Compare Sites
              </Button>
              <Button onClick={onAIExplain} variant="secondary" className="w-full">
                AI Explanation
              </Button>
              <Button onClick={onExport} variant="ghost" className="w-full justify-start">
                Export Results
              </Button>
            </div>
          </Card>

          {/* Interpretation Guide */}
          <Card className="p-4 bg-info/5 border-info/20">
            <h3 className="font-semibold text-info mb-2 flex items-center gap-2">
              <span aria-hidden="true">💡</span> Interpretation Guide
            </h3>
            <ul className="text-sm text-muted space-y-2">
              <li><strong>Azimuth:</strong> 0° = North, 90° = East. Measured clockwise from North.</li>
              <li><strong>Elevation:</strong> Angle above local horizontal. +90° = zenith, 0° = horizon, -90° = nadir.</li>
              <li><strong>Geometric Visibility:</strong> Body is above ideal mathematical horizon (elevation {'>'} 0°).</li>
              <li><strong>Terrain Visibility:</strong> Accounts for local topography blocking line-of-sight (requires DEM).</li>
              <li><strong>DEMO Data:</strong> Values are synthetic approximations for interface demonstration only.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}