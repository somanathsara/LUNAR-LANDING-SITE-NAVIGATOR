import { Site, AnalysisRun, GeometryResult } from '../types';

// Generate deterministic but varied demo data based on site and time
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateDemoAnalysis(site: Site, timestamp: string): AnalysisRun {
  const analysisId = `analysis-${site.site_id}-${Date.now()}`;
  const seed = hashString(`${site.site_id}-${timestamp}`);

  // Generate geometry results based on site location and time
  // These are synthetic/demo values - not real SPICE calculations
  const lat = site.latitude_deg;
  const lon = site.longitude_deg;

  // Simplified solar geometry approximation for demo
  // Real implementation would use SPICE kernels
  const hourAngle = ((new Date(timestamp).getUTCHours() + new Date(timestamp).getUTCMinutes() / 60) * 15) % 360;
  const declination = -1.5 * Math.cos((new Date(timestamp).getUTCMonth() / 12) * 2 * Math.PI); // Approx lunar seasonal variation

  // Sun geometry (simplified)
  const sunAzimuth = (hourAngle + lon + seededRandom(seed) * 30 - 15) % 360;
  const sunElevation = Math.max(-90, Math.min(90,
    90 - Math.abs(lat - declination) + seededRandom(seed + 1) * 10 - 5
  ));

  // Earth geometry - Earth is nearly fixed in lunar sky with small libration
  const earthAzimuth = (180 - lon + seededRandom(seed + 2) * 10 - 5 + 360) % 360;
  const earthElevation = Math.max(-90, Math.min(90,
    90 - Math.abs(lat) + seededRandom(seed + 3) * 5 - 2.5
  ));

  // Determine visibility
  const sunGeometricVisible = sunElevation > 0;
  const earthGeometricVisible = earthElevation > 0;

  // Terrain visibility (simulated - would need DEM in reality)
  const terrainOptions: Array<'clear' | 'obstructed' | 'unavailable'> = ['clear', 'obstructed', 'unavailable'];
  const sunTerrain = lat < -85 ? terrainOptions[Math.floor(seededRandom(seed + 4) * terrainOptions.length)] : 'unavailable';
  const earthTerrain = lat < -85 ? terrainOptions[Math.floor(seededRandom(seed + 5) * terrainOptions.length)] : 'unavailable';

  const geometryResults: GeometryResult[] = [
    {
      target: 'SUN',
      azimuth_deg: Number(sunAzimuth.toFixed(2)),
      elevation_deg: Number(sunElevation.toFixed(2)),
      geometric_visible: sunGeometricVisible,
      terrain_visible: sunTerrain,
      units: 'degrees',
      frame: 'LUNAR_TOPOCENTRIC (Az: 0=North, +East; El: horizon=0)',
      provenance: {
        kernel_ids: ['de440.bsp', 'pck00010.tpc', 'moon_080317.tf', 'moon_pa_de421_1900-2050.bpc'],
        method: 'SPICE SUBPOINT/ILLUMINATION (DEMO APPROXIMATION)',
        software_versions: { SPICE: 'N0067', SpiceyPy: '4.0.0', Python: '3.11' },
      },
    },
    {
      target: 'EARTH',
      azimuth_deg: Number(earthAzimuth.toFixed(2)),
      elevation_deg: Number(earthElevation.toFixed(2)),
      geometric_visible: earthGeometricVisible,
      terrain_visible: earthTerrain,
      units: 'degrees',
      frame: 'LUNAR_TOPOCENTRIC (Az: 0=North, +East; El: horizon=0)',
      provenance: {
        kernel_ids: ['de440.bsp', 'pck00010.tpc', 'moon_080317.tf', 'moon_pa_de421_1900-2050.bpc'],
        method: 'SPICE SUBPOINT/ILLUMINATION (DEMO APPROXIMATION)',
        software_versions: { SPICE: 'N0067', SpiceyPy: '4.0.0', Python: '3.11' },
      },
    },
  ];

  const limitations = [
    'DEMO DATA: Results are synthetic approximations, not validated SPICE computations',
    'Coordinate frame conventions: Planetocentric latitude, East-positive longitude',
    'Terrain visibility uses simplified model; no actual DEM ray-tracing performed',
    'Earth libration effects approximated; not computed from SPICE',
    'No atmospheric refraction (Moon has negligible atmosphere)',
    'Reference ellipsoid: IAU 2015 Moon (1737.4 km radius)',
  ];

  // Add site-specific limitations
  if (lat < -85) {
    limitations.push('Polar site: Sun elevation near horizon; long shadows; terrain effects significant');
  }
  if (site.elevation_m && site.elevation_m > 1000) {
    limitations.push(`Elevated site (${site.elevation_m}m): Horizon depression increases visibility range`);
  }

  return {
    analysis_id: analysisId,
    site_id: site.site_id,
    timestamp_utc: timestamp,
    created_at_utc: new Date().toISOString(),
    algorithm_version: 'demo-v0.1.0',
    status: 'completed',
    data_mode: 'DEMO',
    input_snapshot: { site, time: { timestamp_utc: timestamp } },
    geometry_results: geometryResults,
    limitations,
  };
}

export function generateDemoComparison(analyses: AnalysisRun[]) {
  // Simple scoring for demo purposes
  const weights = {
    sun_elevation: 0.35,
    sun_visibility: 0.25,
    earth_visibility: 0.20,
    terrain_sun: 0.10,
    terrain_earth: 0.10,
  };

  const componentScores: Record<string, Record<string, number>> = {};
  const ranking = analyses.map((analysis, index) => {
    const sun = analysis.geometry_results.find(r => r.target === 'SUN');
    const earth = analysis.geometry_results.find(r => r.target === 'EARTH');

    const scores = {
      sun_elevation: sun?.elevation_deg ? Math.max(0, (sun.elevation_deg + 10) / 100) : 0,
      sun_visibility: sun?.geometric_visible ? 1 : 0,
      earth_visibility: earth?.geometric_visible ? 1 : 0,
      terrain_sun: sun?.terrain_visible === 'clear' ? 1 : sun?.terrain_visible === 'obstructed' ? 0 : 0.5,
      terrain_earth: earth?.terrain_visible === 'clear' ? 1 : earth?.terrain_visible === 'obstructed' ? 0 : 0.5,
    };

    componentScores[analysis.analysis_id] = scores;

    const totalScore = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + value * (weights[key as keyof typeof weights] || 0);
    }, 0);

    return {
      analysis_id: analysis.analysis_id,
      site_name: analysis.input_snapshot.site.name,
      score: Number(totalScore.toFixed(3)),
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by score descending
  ranking.sort((a, b) => (b.score || 0) - (a.score || 0));
  ranking.forEach((item, index) => { item.rank = index + 1; });

  return {
    comparison_id: `comparison-${Date.now()}`,
    analysis_ids: analyses.map(a => a.analysis_id),
    weights,
    component_scores: componentScores,
    ranking,
    created_at_utc: new Date().toISOString(),
  };
}