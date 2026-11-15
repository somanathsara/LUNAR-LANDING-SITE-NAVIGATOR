import React from 'react';
import { Site } from '../types';
import { Button } from './Button';

interface SiteCardProps {
  site: Site;
  isSelected: boolean;
  isInComparison: boolean;
  onClick: () => void;
  onAddToComparison: () => void;
  onRemoveFromComparison: () => void;
}

export default function SiteCard({
  site,
  isSelected,
  isInComparison,
  onClick,
  onAddToComparison,
  onRemoveFromComparison,
}: SiteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`site-card w-full p-3 text-left transition-all ${
        isSelected
          ? 'bg-accent-primary/10 border-l-3 border-accent-primary'
          : 'hover:bg-tertiary/50'
      }`}
      aria-pressed={isSelected}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{site.name}</h4>
            {isInComparison && (
              <span className="badge bg-info/20 text-info text-xs flex-shrink-0">Compare</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted font-mono">
            <span>Lat: {site.latitude_deg.toFixed(2)}°</span>
            <span>Lon: {site.longitude_deg.toFixed(2)}°</span>
          </div>
          <p className="text-xs text-muted mt-1 truncate">{site.notes || 'No description'}</p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isInComparison ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => { e.stopPropagation(); onRemoveFromComparison(); }}
              className="text-danger hover:bg-danger/10"
            >
              Remove
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => { e.stopPropagation(); onAddToComparison(); }}
              className="text-info hover:bg-info/10"
            >
              Add
            </Button>
          )}
        </div>
      </div>
    </button>
  );
}