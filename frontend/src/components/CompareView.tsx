import React from 'react';
import { AnalysisRun, GeometryResult } from '../types';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { formatValue, getVisibilityBadge } from './AnalysisSummary';
interface CompareViewProps {
  analyses: AnalysisRun[];
  onBack: () => void;
  onExport: () => void;
  onRemoveSite: (siteId: string) => void;
}

function CompareTable({ analyses }: { analyses: AnalysisRun[] }) {
  const targets = ['SUN', 'EARTH'] as const;
  const metrics = [
    { key: 'azimuth_deg', label: 'Azimuth', unit: '°', format: (v: number | null) => formatValue(v, '°') },
    { key: 'elevation_deg', label: 'Elevation', unit: '°', format: (v: number | null) => formatValue(v, '°') },
    { key: 'geometric_visible', label: 'Geometric Vis.', unit: '', format: (v: boolean | null) => v === null ? '—' : v ? '✓ Visible' : '✗ Obstructed' },
    {
      key: 'terrain_visible', label: 'Terrain Vis.', unit: '', format: (v: 'clear' | 'obstructed' | 'unavailable' | null) => {
        if (!v) return '—';
        switch (v) {
          case 'clear': return '✓ Clear';
          case 'obstructed': return '✗ Obstructed';
          case 'unavailable': return '? No DEM';
        }
      }
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-secondary bg-tertiary/50">
              <th className="p-3 text-left font-medium text-primary sticky left-0 bg-tertiary/50 z-10">Metric</th>
              {analyses.map(analysis => (
                <th
                  key={analysis.analysis_id}
                  className="p-3 text-left font-medium text-primary border-l border-secondary"
                  style={{ minWidth: '200px' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{analysis.input_snapshot.site.name}</span>
                    <Badge variant="warning" size="sm">DEMO</Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.map(target => (
              <React.Fragment key={target}>
                <tr className="border-b border-secondary/50">
                  <td className="p-3 font-medium text-secondary bg-tertiary/30 sticky left-0 bg-tertiary/30 z-10" colSpan={1}>
                    {target} Geometry
                  </td>
                  {analyses.map(() => <td className="p-3 border-l border-secondary" />)}
                </tr>
                {metrics.map(metric => {
                  const key = metric.key as keyof GeometryResult;
                  return (
                    <tr className="border-b border-secondary/50 hover:bg-tertiary/30">
                      <td className="p-3 text-muted sticky left-0 bg-card z-10">{metric.label}</td>
                      {analyses.map(analysis => {
                        const result = analysis.geometry_results.find(r => r.target === target);
                        const value = result ? result[key] : null;
                        return (
                          <td key={analysis.analysis_id} className="p-3 border-l border-secondary font-mono text-primary">
                            {metric.format(value as any)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ComparisonSummary({ analyses }: { analyses: AnalysisRun[] }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Quick Summary</h3>
      <div className="grid grid-cols-2 gap-4">
        {analyses.map(analysis => {
          const sun = analysis.geometry_results.find(r => r.target === 'SUN');
          const earth = analysis.geometry_results.find(r => r.target === 'EARTH');
          return (
            <div key={analysis.analysis_id} className="p-3 bg-tertiary/50 rounded border border-secondary/50">
              <h4 className="font-medium mb-2">{analysis.input_snapshot.site.name}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Sun El.</span>
                  <span className="font-mono">{formatValue(sun?.elevation_deg ?? null, '°')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Earth El.</span>
                  <span className="font-mono">{formatValue(earth?.elevation_deg ?? null, '°')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Sun Vis.</span>
                  {getVisibilityBadge(sun?.geometric_visible ?? null, '')}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Earth Vis.</span>
                  {getVisibilityBadge(earth?.geometric_visible ?? null, '')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeightsPanel() {
  const weights = {
    sun_elevation: 0.35,
    sun_visibility: 0.25,
    earth_visibility: 0.20,
    terrain_sun: 0.10,
    terrain_earth: 0.10,
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Scoring Weights (Demo)</h3>
      <p className="text-sm text-muted mb-3">Transparent scoring criteria for site comparison</p>
      <div className="space-y-2">
        {Object.entries(weights).map(([key, weight]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-muted w-40">{key.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-2 bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary rounded-full transition-all"
                style={{ width: `${weight * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-accent-primary w-12 text-right">{Math.round(weight * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">
        Weights are configurable. Higher sun elevation and visibility weighted for power generation.
        Earth visibility weighted for communications. Terrain factors included when DEM available.
      </p>
    </Card>
  );
}

export default function CompareView({ analyses, onBack, onExport,  }: CompareViewProps) {
  return (
    <div className="compare-view space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="text-secondary hover:text-primary">
          ← Back
        </Button>
        <div>
          <h2 className="font-semibold text-lg">Site Comparison</h2>
          <p className="text-sm text-muted">
            Comparing {analyses.length} sites at common timestamp
          </p>
        </div>
        <Button onClick={onExport} variant="primary">
          Export Comparison
        </Button>
      </div>

      {/* Comparison Summary */}
      <ComparisonSummary analyses={analyses} />

      {/* Detailed Comparison Table */}
      <CompareTable analyses={analyses} />

      {/* Scoring Weights */}
      <WeightsPanel />

      {/* Limitations */}
      <Card className="p-4 border-warning/30 bg-warning/5">
        <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
          <span aria-hidden="true">⚠</span> Comparison Caveats
        </h3>
        <ul className="text-sm text-muted space-y-2 list-disc list-inside">
          <li>All values are DEMO/SYNTHETIC approximations — not validated for mission use</li>
          <li>Common timestamp used for all sites; local solar time differs by longitude</li>
          <li>Terrain visibility requires compatible DEM data; marked unavailable when absent</li>
          <li>Scoring weights are illustrative; adjust based on mission priorities</li>
          <li>No uncertainty quantification included in this prototype</li>
          <li>Coordinate frame: Planetocentric latitude, East-positive longitude (IAU 2015)</li>
        </ul>
      </Card>

      {/* Data Source Attribution */}
      <Card className="p-4 bg-tertiary/50 border-secondary/50">
        <h3 className="font-semibold mb-2">Data Sources & Attribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted">
          <p>• SPICE Kernels: NAIF (JPL) — de440.bsp, pck00010.tpc, moon_080317.tf</p>
          <li>• Lunar Shape: IAU 2015 (1737.4 km radius)</li>
          <li>• Topography: LROC LOLA DEM (when available)</li>
          <li>• Ephemeris: JPL DE440 planetary ephemeris</li>
          <li>• Reference: NASA Moon Trek, LROC QuickMap, JPL Horizons, CSA Moon Exploration</li>
        </div>
      </Card>
    </div>
  );
}