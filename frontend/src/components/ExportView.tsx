import React, { useState } from 'react';
import { AnalysisRun, ExportFormat, ExportData } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

interface ExportViewProps {
  analyses: AnalysisRun[];
  comparison?: {
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
  };
  onBack: () => void;
}

function formatJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

function formatCSV(analyses: AnalysisRun[], comparison?: ExportViewProps['comparison']): string {
  const headers = [
    'analysis_id',
    'site_id',
    'site_name',
    'timestamp_utc',
    'latitude_deg',
    'longitude_deg',
    'latitude_type',
    'longitude_convention',
    'elevation_m',
    'algorithm_version',
    'data_mode',
    'sun_azimuth_deg',
    'sun_elevation_deg',
    'sun_geometric_visible',
    'sun_terrain_visible',
    'earth_azimuth_deg',
    'earth_elevation_deg',
    'earth_geometric_visible',
    'earth_terrain_visible',
    'frame',
    'units',
    'limitations',
  ];

  const rows = analyses.map(analysis => {
    const sun = analysis.geometry_results.find(r => r.target === 'SUN');
    const earth = analysis.geometry_results.find(r => r.target === 'EARTH');
    const site = analysis.input_snapshot.site;

    return [
      analysis.analysis_id,
      site.site_id,
      site.name,
      analysis.timestamp_utc,
      site.latitude_deg.toString(),
      site.longitude_deg.toString(),
      site.latitude_type,
      site.longitude_convention,
      site.elevation_m?.toString() || '',
      analysis.algorithm_version,
      analysis.data_mode,
      sun?.azimuth_deg?.toString() || '',
      sun?.elevation_deg?.toString() || '',
      sun?.geometric_visible?.toString() || '',
      sun?.terrain_visible || '',
      earth?.azimuth_deg?.toString() || '',
      earth?.elevation_deg?.toString() || '',
      earth?.geometric_visible?.toString() || '',
      earth?.terrain_visible || '',
      sun?.frame || '',
      sun?.units || '',
      `"${analysis.limitations.join('; ')}"`,
    ];
  });

  let csv = headers.join(',') + '\n';
  csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  if (comparison) {
    csv += '\n\n# COMPARISON RANKING\n';
    csv += 'rank,analysis_id,site_name,score\n';
    comparison.ranking.forEach(item => {
      csv += `${item.rank},${item.analysis_id},"${item.site_name}",${item.score ?? ''}\n`;
    });
  }

  return csv;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportView({ analyses, comparison, onBack }: ExportViewProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const generatePreview = () => {
    const exportData: ExportData = {
      format,
      analyses,
      comparison,
      metadata: {
        exported_at_utc: new Date().toISOString(),
        application_version: '0.1.0-demo',
        disclaimer: 'DEMO/SYNTHETIC DATA — Not validated for mission use. All values are approximations for interface demonstration only.',
      },
    };

    if (format === 'json') {
      setPreview(formatJSON(exportData));
    } else {
      setPreview(formatCSV(analyses, comparison));
    }
  };

  React.useEffect(() => {
    generatePreview();
  }, [format, analyses, comparison]);

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const exportData: ExportData = {
      format,
      analyses,
      comparison,
      metadata: {
        exported_at_utc: new Date().toISOString(),
        application_version: '0.1.0-demo',
        disclaimer: 'DEMO/SYNTHETIC DATA — Not validated for mission use. All values are approximations for interface demonstration only.',
      },
    };

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `lunar-landing-analysis-${timestamp}.${format}`;

    if (format === 'json') {
      downloadFile(formatJSON(exportData), filename, 'application/json');
    } else {
      downloadFile(formatCSV(analyses, comparison), filename, 'text/csv');
    }

    setIsExporting(false);
  };

  return (
    <div className="export-view space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="text-secondary hover:text-primary">
          ← Back
        </Button>
        <div>
          <h2 className="font-semibold text-lg">Export Results</h2>
          <p className="text-sm text-muted">
            {analyses.length} analysis{analyses.length !== 1 ? 'es' : ''}{comparison ? ' + comparison' : ''}
          </p>
        </div>
      </div>

      {/* Format Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Export Format</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-tertiary/50">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="accent-accent-primary"
            />
            <div>
              <div className="font-medium">JSON</div>
              <div className="text-sm text-muted">Complete structured data with full provenance</div>
            </div>
          </label>
          <label className="flex-1 flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:bg-tertiary/50">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="accent-accent-primary"
            />
            <div>
              <div className="font-medium">CSV</div>
              <div className="text-sm text-muted">Tabular format for spreadsheet analysis</div>
            </div>
          </label>
        </div>
      </Card>

      {/* Export Contents Summary */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Contents</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Analyses</span>
            <Badge variant="info">{analyses.length}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Sites</span>
            <Badge variant="info">{new Set(analyses.map(a => a.site_id)).size}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Data Mode</span>
            <Badge variant="warning">DEMO</Badge>
          </div>
          {comparison && (
            <div className="flex justify-between border-t border-secondary pt-2">
              <span className="text-muted">Comparison</span>
              <Badge variant="success">{comparison.ranking.length} sites ranked</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-4 flex-1 min-h-[300px] max-h-[400px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Preview ({format.toUpperCase()})</h3>
          <Badge variant="warning" size="sm">DEMO DATA</Badge>
        </div>
        <div className="bg-primary border border-secondary rounded p-3 font-mono text-xs text-primary overflow-auto max-h-[300px] whitespace-pre-wrap">
          {preview.slice(0, 5000)}{preview.length > 5000 ? '\n... (truncated for preview)' : ''}
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-4 bg-tertiary/50 border-secondary/50">
        <h3 className="font-semibold mb-2">Export Metadata</h3>
        <dl className="grid grid-cols-2 gap-2 text-sm text-muted">
          <dt>Exported at (UTC)</dt>
          <dd className="font-mono">{new Date().toISOString()}</dd>
          <dt>Application Version</dt>
          <dd className="font-mono">0.1.0-demo</dd>
          <dt>Coordinate Frame</dt>
          <dd className="font-mono">Planetocentric, East-positive</dd>
          <dt>Reference Ellipsoid</dt>
          <dd className="font-mono">IAU 2015 Moon (1737.4 km)</dd>
        </dl>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          isLoading={isExporting}
          size="lg"
          className="flex-1"
        >
          Download {format.toUpperCase()}
        </Button>
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-danger/5 border-danger/20">
        <p className="text-sm text-danger">
          <strong>Important:</strong> This export contains DEMO/SYNTHETIC DATA generated for interface demonstration only.
          Values are approximations and have NOT been validated through SPICE computations or actual mission data.
          Do not use for mission planning, flight operations, or any safety-critical decisions.
        </p>
      </Card>
    </div>
  );
}