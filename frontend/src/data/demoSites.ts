import { Site } from '../types';

// Pre-defined candidate landing sites based on real lunar locations of interest
export const demoSites: Site[] = [
  {
    site_id: 'shackleton-crater',
    name: 'Shackleton Crater Rim',
    latitude_deg: -89.9,
    longitude_deg: 0.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 1200,
    notes: 'Near-continuous illumination on rim; PSR in crater floor. Artemis III candidate region.'
  },
  {
    site_id: 'connecting-ridge',
    name: 'Connecting Ridge',
    latitude_deg: -89.4,
    longitude_deg: 120.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 850,
    notes: 'High illumination fraction; direct Earth visibility. Between Shackleton and de Gerlache.'
  },
  {
    site_id: 'de-gerlache-rim',
    name: 'de Gerlache Crater Rim',
    latitude_deg: -88.5,
    longitude_deg: -60.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 950,
    notes: 'Favorable illumination; potential water ice access. Near Connecting Ridge.'
  },
  {
    site_id: 'haworth-crater',
    name: 'Haworth Crater',
    latitude_deg: -87.5,
    longitude_deg: 90.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 600,
    notes: 'Permanently shadowed region candidate; high hydrogen signatures detected.'
  },
  {
    site_id: 'nobile-crater',
    name: 'Nobile Crater Rim',
    latitude_deg: -84.2,
    longitude_deg: -40.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 1100,
    notes: 'VIPER rover target region; good Earth visibility; moderate illumination.'
  },
  {
    site_id: 'faustini-crater',
    name: 'Faustini Crater',
    latitude_deg: -87.3,
    longitude_deg: 78.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 400,
    notes: 'Deep PSR; very low illumination; challenging for solar power but high volatile potential.'
  },
  {
    site_id: 'amundsen-crater',
    name: 'Amundsen Crater Rim',
    latitude_deg: -84.5,
    longitude_deg: 85.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 1300,
    notes: 'Large crater with illuminated rim segments; potential for long-duration missions.'
  },
  {
    site_id: 'malapert-massif',
    name: 'Malapert Massif',
    latitude_deg: -86.0,
    longitude_deg: 0.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 5000,
    notes: 'High elevation peak; near-continuous Earth visibility; strong comm relay potential.'
  },
  {
    site_id: 'cabeus-crater',
    name: 'Cabeus Crater (LCROSS Impact)',
    latitude_deg: -84.9,
    longitude_deg: -35.5,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 300,
    notes: 'LCROSS impact site; confirmed water ice detection; deep PSR environment.'
  },
  {
    site_id: 'south-pole-peak',
    name: 'South Pole Peak (Peak of Eternal Light)',
    latitude_deg: -89.99,
    longitude_deg: 180.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 2500,
    notes: 'Theoretical peak of eternal light; maximum illumination; symbolic location.'
  },
  {
    site_id: 'whipple-crater',
    name: 'Whipple Crater Rim',
    latitude_deg: -89.1,
    longitude_deg: -120.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 750,
    notes: 'High illumination fraction; adjacent to PSR; good Earth visibility.'
  },
  {
    site_id: 'shoemaker-crater',
    name: 'Shoemaker Crater',
    latitude_deg: -88.1,
    longitude_deg: 45.0,
    latitude_type: 'planetocentric',
    longitude_convention: 'east-positive',
    elevation_m: 500,
    notes: 'Named for Eugene Shoemaker; PSR with high hydrogen; challenging terrain.'
  }
];