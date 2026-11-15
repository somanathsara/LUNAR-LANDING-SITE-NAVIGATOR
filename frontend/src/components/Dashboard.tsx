import React from 'react';
import { Site, AnalysisRun } from '../types';
import SiteCard from './SiteCard';
import AnalysisSummary from './AnalysisSummary';
import ComparisonPanel from './ComparisonPanel';
import  Button  from './Button';
import  Card  from './Card';

interface DashboardProps {
  candidateSites: Site[];
  selectedSite: Site | null;
  currentAnalysis: AnalysisRun | null;
  comparisonSites: Site[];
  onSiteSelect: (site: Site | null) => void;
  onAnalyze: (site: Site, timestamp: string) => void;
  onAddToComparison: (site: Site) => void;
  onRemoveFromComparison: (siteId: string) => void;
  onCompare: (sites: Site[], timestamp: string) => void;
  onReset: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function Dashboard({
  candidateSites,
  selectedSite,
  currentAnalysis,
  comparisonSites,
  onSiteSelect,
  onAnalyze,
  onAddToComparison,
  onRemoveFromComparison,
  onCompare,
  onReset,
  isLoading,
  error,
}: DashboardProps) {
  const [timestamp, setTimestamp] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [showTimestampPicker, setShowTimestampPicker] = React.useState(false);

  const handleSiteClick = (site: Site) => {
    onSiteSelect(site);
  };

  const handleAnalyzeClick = () => {
    if (selectedSite) {
      onAnalyze(selectedSite, timestamp);
    }
  };

  const handleCompareClick = () => {
    if (comparisonSites.length >= 2) {
      onCompare(comparisonSites, timestamp);
    }
  };

  const canAnalyze = selectedSite && !isLoading;
  const canCompare = comparisonSites.length >= 2 && !isLoading;

  return (
    <div className="dashboard space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="error-banner bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3 animate-slide-up" role="alert">
          <span className="text-danger font-bold text-lg">⚠</span>
          <div className="flex-1">
            <p className="font-medium text-danger">Analysis Error</p>
            <p className="text-sm text-secondary mt-1">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => {}}>Dismiss</Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Site Selection */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Time Selector */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base">Analysis Time (UTC)</h2>
              <span className="text-xs text-muted">ISO 8601</span>
            </div>
            <div className="relative">
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="input w-full bg-tertiary border border-secondary rounded px-3 py-2 text-primary placeholder-muted"
                disabled={isLoading}
                aria-label="Analysis timestamp UTC"
              />
            </div>
            <p className="text-xs text-muted mt-2">
              Select UTC timestamp for Sun/Earth geometry calculation.
              <br />
              <span className="text-warning">Note:</span> Times are converted to SPICE ET for computation.
            </p>
          </Card>

          {/* Candidate Sites */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-secondary flex items-center justify-between">
              <h2 className="font-semibold text-base">Candidate Sites</h2>
              <span className="badge bg-tertiary text-xs text-muted">{candidateSites.length} sites</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {candidateSites.map(site => (
                <SiteCard
                  key={site.site_id}
                  site={site}
                  isSelected={selectedSite?.site_id === site.site_id}
                  isInComparison={comparisonSites.some(s => s.site_id === site.site_id)}
                  onClick={() => handleSiteClick(site)}
                  onAddToComparison={() => onAddToComparison(site)}
                  onRemoveFromComparison={() => onRemoveFromComparison(site.site_id)}
                />
              ))}
            </div>
          </Card>
        </aside>

        {/* Center Panel - Selected Site Details */}
        <section className="lg:col-span-4 space-y-6">
          {selectedSite ? (
            <>
              {/* Selected Site Info */}
              <Card className="p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-base">{selectedSite.name}</h2>
                    <p className="text-xs text-muted mt-1">{selectedSite.notes || 'No description available'}</p>
                  </div>
                  <span className={`badge ${comparisonSites.some(s => s.site_id === selectedSite.site_id) ? 'bg-info/20 text-info' : 'bg-tertiary text-muted'}`}>
                    {comparisonSites.some(s => s.site_id === selectedSite.site_id) ? 'In Comparison' : 'Selected'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-muted">Latitude</span>
                    <div className="font-mono text-primary">{selectedSite.latitude_deg.toFixed(4)}° ({selectedSite.latitude_type})</div>
                  </div>
                  <div>
                    <span className="text-muted">Longitude</span>
                    <div className="font-mono text-primary">{selectedSite.longitude_deg.toFixed(4)}° ({selectedSite.longitude_convention})</div>
                  </div>
                  {selectedSite.elevation_m && (
                    <div className="col-span-2">
                      <span className="text-muted">Elevation</span>
                      <div className="font-mono text-primary">{selectedSite.elevation_m.toFixed(0)} m</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAnalyzeClick}
                    disabled={!canAnalyze || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze Site'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onAddToComparison(selectedSite)}
                    disabled={comparisonSites.some(s => s.site_id === selectedSite.site_id) || comparisonSites.length >= 4}
                    aria-pressed={comparisonSites.some(s => s.site_id === selectedSite.site_id)}
                  >
                    {comparisonSites.some(s => s.site_id === selectedSite.site_id) ? 'Added' : 'Add to Compare'}
                  </Button>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="font-medium text-sm mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onSiteSelect(null)}>
                    Clear Selection
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onReset}>
                    Reset All
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-3" aria-hidden="true">🌙</div>
              <h3 className="font-medium mb-2">Select a Landing Site</h3>
              <p className="text-sm text-muted mb-4">Choose a candidate site from the left panel to begin analysis</p>
              <div className="text-xs text-muted space-y-1">
                <p>• Click any site to select</p>
                <p>• Add multiple sites for comparison</p>
                <p>• Set UTC time for geometry calculation</p>
              </div>
            </Card>
          )}

          {/* Current Analysis Summary */}
          {currentAnalysis && (
            <AnalysisSummary analysis={currentAnalysis} />
          )}
        </section>

        {/* Right Panel - Comparison */}
        <aside className="lg:col-span-3">
          <ComparisonPanel
            comparisonSites={comparisonSites}
            onRemoveSite={onRemoveFromComparison}
            onCompare={handleCompareClick}
            canCompare={canCompare}
            isLoading={isLoading}
          />
        </aside>
      </div>
    </div>
  );
}