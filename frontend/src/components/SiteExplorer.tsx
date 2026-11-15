import React from 'react';
import { Site } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import SiteCard from './SiteCard';

interface SiteExplorerProps {
  candidateSites: Site[];
  selectedSite: Site | null;
  onSiteSelect: (site: Site | null) => void;
  onAnalyze: (site: Site, timestamp: string) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function SiteExplorer({
  candidateSites,
  selectedSite,
  onSiteSelect,
  onAnalyze,
  onBack,
  isLoading,
  error,
}: SiteExplorerProps) {
  const [timestamp, setTimestamp] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterLatType, setFilterLatType] = React.useState<'all' | 'planetocentric' | 'planetographic'>('all');

  const filteredSites = candidateSites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLatType = filterLatType === 'all' || site.latitude_type === filterLatType;
    return matchesSearch && matchesLatType;
  });

  const handleSiteClick = (site: Site) => {
    onSiteSelect(site);
  };

  const handleAnalyzeClick = (site: Site) => {
    onAnalyze(site, timestamp);
  };

  return (
    <div className="site-explorer space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="text-secondary hover:text-primary">
          ← Back to Dashboard
        </Button>
        <div>
          <h2 className="font-semibold text-lg">Site Explorer</h2>
          <p className="text-sm text-muted">Browse and analyze candidate landing sites</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3" role="alert">
          <span className="text-danger font-bold text-lg">⚠</span>
          <div className="flex-1">
            <p className="font-medium text-danger">Error</p>
            <p className="text-sm text-secondary mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Time Selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Analysis Time (UTC)</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="input w-full bg-tertiary border border-secondary rounded px-3 py-2 text-primary placeholder-muted"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-muted sm:w-64">
            ISO 8601 UTC timestamp for geometry calculation
          </p>
        </div>
      </Card>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label className="sr-only">Search sites</label>
            <input
              type="search"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full bg-tertiary border border-secondary rounded px-3 py-2 text-primary placeholder-muted pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">🔍</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Latitude Type:</label>
            <select
              value={filterLatType}
              onChange={(e) => setFilterLatType(e.target.value as any)}
              className="input bg-tertiary border border-secondary rounded px-3 py-2 text-primary text-sm"
            >
              <option value="all">All Types</option>
              <option value="planetocentric">Planetocentric</option>
              <option value="planetographic">Planetographic</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Sites Grid */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-secondary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold">Candidate Sites ({filteredSites.length} of {candidateSites.length})</h3>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Badge variant="info" size="sm">Planetocentric</Badge>
            <Badge variant="default" size="sm">East-positive Longitude</Badge>
            <Badge variant="warning" size="sm">DEMO DATA</Badge>
          </div>
        </div>

        {filteredSites.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>No sites match your search criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary">
            {filteredSites.map(site => (
              <SiteCard
                key={site.site_id}
                site={site}
                isSelected={selectedSite?.site_id === site.site_id}
                isInComparison={false}
                onClick={() => handleSiteClick(site)}
                onAddToComparison={() => {}}
                onRemoveFromComparison={() => {}}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Coordinate Convention Reference */}
      <Card className="p-4 bg-tertiary/50 border-secondary/50">
        <h4 className="font-medium mb-3">Coordinate Conventions Reference</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-primary mb-1">Latitude: Planetocentric</p>
            <p className="text-muted">Angle from equatorial plane to radius vector. Used by SPICE and most planetary data.</p>
          </div>
          <div>
            <p className="font-medium text-primary mb-1">Longitude: East-Positive (0-360°)</p>
            <p className="text-muted">Increases eastward from prime meridian. Standard for lunar coordinates (IAU 2015).</p>
          </div>
          <div>
            <p className="font-medium text-primary mb-1">Reference Frame</p>
            <p className="text-muted">Moon Mean Earth/Polar Axis (ME) frame. IAU 2015 lunar radius: 1737.4 km.</p>
          </div>
          <div>
            <p className="font-medium text-primary mb-1">Azimuth Convention</p>
            <p className="text-muted">0° = North, 90° = East. Elevation: 0° = horizon, +90° = zenith.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}