import { Site } from '../types';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';

interface ComparisonPanelProps {
  comparisonSites: Site[];
  onRemoveSite: (siteId: string) => void;
  onCompare: () => void;
  canCompare: boolean;
  isLoading: boolean;
}

export default function ComparisonPanel({
  comparisonSites,
  onRemoveSite,
  onCompare,
  canCompare,
  isLoading,
}: ComparisonPanelProps) {
  if (comparisonSites.length === 0) {
    return (
      <Card className="h-full">
        <div className="h-full flex flex-col items-center justify-center text-center p-6">
          <div className="text-3xl mb-3" aria-hidden="true">⚖️</div>
          <h3 className="font-medium mb-2">Site Comparison</h3>
          <p className="text-sm text-muted mb-4">Add at least 2 sites to compare</p>
          <p className="text-xs text-muted">Select sites from the left panel and click "Add to Compare"</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Comparison Queue</h3>
        <Badge variant="info" size="sm">{comparisonSites.length}/4</Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {comparisonSites.map((site, index) => (
          <div
            key={site.site_id}
            className="flex items-center gap-3 p-3 bg-tertiary/50 rounded-lg border border-secondary/50 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="badge bg-info/20 text-info text-sm font-mono w-6 text-center">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{site.name}</p>
              <p className="text-xs text-muted font-mono">
                {site.latitude_deg.toFixed(2)}°, {site.longitude_deg.toFixed(2)}°
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onRemoveSite(site.site_id)}
              className="text-danger hover:bg-danger/10"
              aria-label={`Remove ${site.name} from comparison`}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t border-secondary pt-4 mt-auto">
        <Button
          onClick={onCompare}
          disabled={!canCompare || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Preparing Comparison...' : `Compare ${comparisonSites.length} Sites`}
        </Button>
        <p className="text-xs text-muted text-center mt-2">
          Uses common timestamp for all sites
        </p>
      </div>
    </Card>
  );
}