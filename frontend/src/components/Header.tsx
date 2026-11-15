import { ScreenId, DemoDataMarker } from '../types';
import  NavLink  from './NavLink';

interface HeaderProps {
  currentScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  demoMode: DemoDataMarker;
}

const screenLabels: Record<ScreenId, { label: string; icon: string }> = {
  dashboard: { label: 'Mission Dashboard', icon: '🌙' },
  explorer: { label: 'Site Explorer', icon: '🔍' },
  analysis: { label: 'Geometry Analysis', icon: '📐' },
  compare: { label: 'Site Comparison', icon: '⚖️' },
  'ai-explanation': { label: 'AI Explanation', icon: '🤖' },
  export: { label: 'Export Data', icon: '📤' },
};

const navigationItems: Array<{ screen: ScreenId; label: string; href: string }> = [
  { screen: 'dashboard', label: 'Dashboard', href: '#dashboard' },
  { screen: 'explorer', label: 'Explorer', href: '#explorer' },
  { screen: 'analysis', label: 'Analysis', href: '#analysis' },
  { screen: 'compare', label: 'Compare', href: '#compare' },
];

export default function Header({ currentScreen, onScreenChange, demoMode }: HeaderProps) {
  return (
    <header className="app-header border-b border-secondary bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 md:h-14 gap-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-2xl" aria-hidden="true">🌙</span>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">Lunar Landing Site Navigator</h1>
            <p className="text-xs text-muted">Scientific Prototype</p>
          </div>
        </div>

        {/* Demo mode indicator */}
        {demoMode.isDemo && (
          <div className="demo-badge flex items-center gap-1 px-3 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning text-xs font-medium hidden sm:flex">
            <span className="animate-pulse" aria-hidden="true">●</span>
            {demoMode.message}
          </div>
        )}

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
          {navigationItems.map(({ screen, label, href }) => (
            <NavLink
              key={screen}
              to={href}
              isActive={currentScreen === screen}
              onClick={(e) => {
                e.preventDefault();
                onScreenChange(screen);
              }}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <select
            className="bg-tertiary border border-secondary rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            value={currentScreen}
            onChange={(e) => onScreenChange(e.target.value as ScreenId)}
            aria-label="Select screen"
          >
            {Object.entries(screenLabels).map(([screen, { label }]) => (
              <option key={screen} value={screen}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Current screen indicator */}
      <div className="screen-indicator px-4 py-2 border-t border-secondary bg-primary/50 text-sm text-secondary hidden md:block">
        <span className="font-medium text-primary">{screenLabels[currentScreen].icon} {screenLabels[currentScreen].label}</span>
        {demoMode.isDemo && (
          <span className="ml-4 text-warning text-xs">⚠ {demoMode.message}</span>
        )}
      </div>
    </header>
  );
}