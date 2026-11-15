import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SiteExplorer from './components/SiteExplorer';
import AnalysisView from './components/AnalysisView';
import CompareView from './components/CompareView';
import AIExplanationView from './components/AIExplanationView';
import ExportView from './components/ExportView';
import MoonScene from './components/MoonScene';
import { Site, AnalysisRun, ScreenId, DemoDataMarker } from './types';
import { demoSites } from './data/demoSites';
import { generateDemoAnalysis } from './utils/demoData';
import './styles/components.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [candidateSites] = useState<Site[]>(demoSites);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [comparisonSites, setComparisonSites] = useState<Site[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisRun | null>(null);
  const [comparisonAnalyses, setComparisonAnalyses] = useState<AnalysisRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<DemoDataMarker>({
    isDemo: true,
    message: 'DEMO / SYNTHETIC DATA — Not validated for mission use'
  });

  const handleAnalyze = useCallback(async (site: Site, timestamp: string) => {
    setIsLoading(true);
    setError(null);

    // Simulate API call with demo data
    await new Promise(resolve => setTimeout(resolve, 1500));

    const analysis = generateDemoAnalysis(site, timestamp);
    setCurrentAnalysis(analysis);
    setCurrentScreen('analysis');
    setIsLoading(false);
  }, []);

  const handleCompare = useCallback(async (sites: Site[], timestamp: string) => {
    setIsLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const analyses = sites.map(site => generateDemoAnalysis(site, timestamp));
    setComparisonAnalyses(analyses);
    setComparisonSites(sites);
    setCurrentScreen('compare');
    setIsLoading(false);
  }, []);

  const handleAddToComparison = useCallback((site: Site) => {
    setComparisonSites(prev => {
      if (prev.some(s => s.site_id === site.site_id)) return prev;
      if (prev.length >= 4) return prev; // Max 4 sites for comparison
      return [...prev, site];
    });
  }, []);

  const handleRemoveFromComparison = useCallback((siteId: string) => {
    setComparisonSites(prev => prev.filter(s => s.site_id !== siteId));
    setComparisonAnalyses(prev => prev.filter(a => a.input_snapshot.site.site_id !== siteId));
  }, []);

  const handleScreenChange = useCallback((screen: ScreenId) => {
    setCurrentScreen(screen);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSite(null);
    setCurrentAnalysis(null);
    setComparisonSites([]);
    setComparisonAnalyses([]);
    setCurrentScreen('dashboard');
    setError(null);
  }, []);

  return (
    <div className="app min-h-screen bg-primary flex flex-col">
      <Header
        currentScreen={currentScreen}
        onScreenChange={handleScreenChange}
        demoMode={demoMode}
      />

      <main className="flex-1 container" role="main">
        {/* 3D Moon Background */}
        <div className="moon-canvas-container" aria-hidden="true">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 40 }}
            gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
          >
            <color attach="background" args={['#0a0e17']} />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} opacity={0.6} />
            <ambientLight intensity={0.4} color="#ffffff" />
            <directionalLight position={[5, 3, 5]} intensity={1.2} color="#fff8e7" />
            <directionalLight position={[-3, -2, -3]} intensity={0.3} color="#4a6fa5" />
            <MoonScene
              selectedSite={selectedSite}
              comparisonSites={comparisonSites}
              currentScreen={currentScreen}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minZoom={1.5}
              maxZoom={10}
              enableRotate={true}
              autoRotate={currentScreen === 'dashboard'}
              autoRotateSpeed={0.2}
            />
          </Canvas>
        </div>

        {/* Screen Content */}
        <div className="screen-content relative z-10 animate-fade-in">
          {currentScreen === 'dashboard' && (
            <Dashboard
              candidateSites={candidateSites}
              selectedSite={selectedSite}
              currentAnalysis={currentAnalysis}
              comparisonSites={comparisonSites}
              onSiteSelect={setSelectedSite}
              onAnalyze={handleAnalyze}
              onAddToComparison={handleAddToComparison}
              onRemoveFromComparison={handleRemoveFromComparison}
              onCompare={handleCompare}
              onReset={handleReset}
              isLoading={isLoading}
              error={error}
            />
          )}

          {currentScreen === 'explorer' && (
            <SiteExplorer
              candidateSites={candidateSites}
              selectedSite={selectedSite}
              onSiteSelect={setSelectedSite}
              onAnalyze={handleAnalyze}
              onBack={() => handleScreenChange('dashboard')}
              isLoading={isLoading}
              error={error}
            />
          )}

          {currentScreen === 'analysis' && currentAnalysis && (
            <AnalysisView
              analysis={currentAnalysis}
              onBack={() => handleScreenChange('dashboard')}
              onCompare={() => handleScreenChange('compare')}
              onAIExplain={() => handleScreenChange('ai-explanation')}
              onExport={() => handleScreenChange('export')}
            />
          )}

          {currentScreen === 'compare' && comparisonAnalyses.length > 0 && (
            <CompareView
              analyses={comparisonAnalyses}
              onBack={() => handleScreenChange('dashboard')}
              onExport={() => handleScreenChange('export')}
              onRemoveSite={handleRemoveFromComparison}
            />
          )}

          {currentScreen === 'ai-explanation' && currentAnalysis && (
            <AIExplanationView
              analysis={currentAnalysis}
              onBack={() => handleScreenChange('analysis')}
            />
          )}

          {currentScreen === 'export' && (
            <ExportView
              analyses={currentAnalysis ? [currentAnalysis, ...comparisonAnalyses] : comparisonAnalyses}
              comparison={comparisonAnalyses.length > 0 ? {
                comparison_id: 'comp-' + Date.now(),
                analysis_ids: comparisonAnalyses.map(a => a.analysis_id),
                weights: {},
                component_scores: {},
                ranking: comparisonAnalyses.map((a, i) => ({
                  analysis_id: a.analysis_id,
                  site_name: a.input_snapshot.site.name,
                  score: null,
                  rank: i + 1
                })),
                created_at_utc: new Date().toISOString()
              } : undefined
              onBack={() => handleScreenChange(currentAnalysis ? 'analysis' : 'compare')}
            />
          )}
        </div>
      </main>

      <footer className="app-footer border-t border-secondary py-3 px-4 text-center text-xs text-muted">
        <p>
          Lunar Landing Site Navigator — Scientific Prototype —{' '}
          <span className="text-warning">NOT FOR FLIGHT USE</span>
        </p>
        <p className="mt-1">
          Data sources: LROC QuickMap, NASA Moon Trek, JPL Horizons, CSA Moon Exploration
        </p>
      </footer>
    </div>
  );
}

export default App;