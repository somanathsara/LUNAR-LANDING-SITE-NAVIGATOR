import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, SphereGeometry, MeshStandardMaterial, Vector3, Group, CircleGeometry, MeshBasicMaterial, DoubleSide, Line, BufferGeometry, LineBasicMaterial, Float32BufferAttribute } from 'three';
import { Site } from '../types';

interface MoonSceneProps {
  selectedSite: Site | null;
  comparisonSites: Site[];
  currentScreen: string;
}

// Lunar radius in km
const LUNAR_RADIUS = 1737.4;
// Scale factor for visualization
const SCALE = 1 / 1000; // 1 unit = 1000 km

// Convert lat/lon to 3D position on sphere
function latLonToVector3(latDeg: number, lonDeg: number, radius: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);
  return new Vector3(x, y, z);
}

function SiteMarker({ site, isSelected, isComparison, color }: {
  site: Site;
  isSelected: boolean;
  isComparison: boolean;
  color: string;
}) {
  const position = useMemo(() => latLonToVector3(site.latitude_deg, site.longitude_deg, LUNAR_RADIUS * SCALE), [site.latitude_deg, site.longitude_deg]);
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      // Billboard effect - always face camera
      groupRef.current.lookAt(camera.position);
    }
  });

  const markerSize = isSelected ? 0.08 : isComparison ? 0.06 : 0.05;
  const pulseSpeed = isSelected ? 3 : 2;

  return (
    <Group ref={groupRef} position={position.toArray()}>
      {/* Outer glow ring */}
      <Mesh>
        <CircleGeometry args={[markerSize * 1.5, 32]} />
        <MeshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={DoubleSide}
          depthWrite={false}
        />
      </Mesh>

      {/* Main marker */}
      <Mesh>
        <CircleGeometry args={[markerSize, 32]} />
        <MeshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthWrite={false}
        />
      </Mesh>

      {/* Center dot */}
      <Mesh>
        <CircleGeometry args={[markerSize * 0.4, 16]} />
        <MeshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          side={DoubleSide}
          depthWrite={false}
        />
      </Mesh>

      {/* Label - using HTML overlay would be better, but keeping simple for now */}
      <Html
        position={position.clone().multiplyScalar(1.15).toArray()}
        style={{
          color: color,
          fontSize: isSelected ? '12px' : '10px',
          fontWeight: isSelected ? '600' : '500',
          textShadow: '0 0 4px #000',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {site.name}
      </Html>
    </Group>
  );
}

function SunDirectionIndicator({ sunAzimuth, sunElevation }: { sunAzimuth: number | null; sunElevation: number | null }) {
  if (sunAzimuth === null || sunElevation === null) return null;

  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
    }
  });

  // Convert azimuth/elevation to direction vector
  // Azimuth: 0 = North, 90 = East (assuming east-positive longitude)
  // Elevation: angle above horizon
  const az = (sunAzimuth * Math.PI) / 180;
  const el = (sunElevation * Math.PI) / 180;

  const dir = new Vector3(
    Math.cos(el) * Math.sin(az),  // East component
    Math.sin(el),                  // Up component
    Math.cos(el) * Math.cos(az)    // North component
  ).normalize().multiplyScalar(LUNAR_RADIUS * SCALE * 1.5);

  return (
    <Group ref={groupRef} position={dir.toArray()}>
      <Mesh>
        <CircleGeometry args={[0.06, 16]} />
        <MeshBasicMaterial
          color="#ffb800"
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthWrite={false}
        />
      </Mesh>
      <Html
        position={dir.clone().multiplyScalar(1.1).toArray()}
        style={{
          color: '#ffb800',
          fontSize: '10px',
          fontWeight: '600',
          textShadow: '0 0 4px #000',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      >
        ☀ Sun
      </Html>
    </Group>
  );
}

function EarthDirectionIndicator({ earthAzimuth, earthElevation }: { earthAzimuth: number | null; earthElevation: number | null }) {
  if (earthAzimuth === null || earthElevation === null) return null;

  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position);
    }
  });

  const az = (earthAzimuth * Math.PI) / 180;
  const el = (earthElevation * Math.PI) / 180;

  const dir = new Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az)
  ).normalize().multiplyScalar(LUNAR_RADIUS * SCALE * 1.5);

  return (
    <Group ref={groupRef} position={dir.toArray()}>
      <Mesh>
        <CircleGeometry args={[0.05, 16]} />
        <MeshBasicMaterial
          color="#00a3e0"
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthWrite={false}
        />
      </Mesh>
      <Html
        position={dir.clone().multiplyScalar(1.1).toArray()}
        style={{
          color: '#00a3e0',
          fontSize: '10px',
          fontWeight: '600',
          textShadow: '0 0 4px #000',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      >
        🌍 Earth
      </Html>
    </Group>
  );
}

function TerminatorLine() {
  const lineRef = useRef<Line>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta * 0.1;
    if (lineRef.current) {
      // Slowly rotate terminator
      lineRef.current.rotation.y = timeRef.current;
    }
  });

  // Create terminator line geometry
  const points: number[] = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * LUNAR_RADIUS * SCALE * 1.001;
    const z = Math.sin(theta) * LUNAR_RADIUS * SCALE * 1.001;
    points.push(x, 0, z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));

  return (
    <Line
      ref={lineRef}
      geometry={geometry}
      material={new LineBasicMaterial({
        color: '#ffb800',
        transparent: true,
        opacity: 0.3,
        depthWrite: false
      })}
    />
  );
}

export default function MoonScene({ selectedSite, comparisonSites, currentScreen }: MoonSceneProps) {
  const { geometryResults } = selectedSite ? (selectedSite as any) : {};
  const sunAzimuth = geometryResults?.find((r: any) => r.target === 'SUN')?.azimuth_deg ?? null;
  const sunElevation = geometryResults?.find((r: any) => r.target === 'SUN')?.elevation_deg ?? null;
  const earthAzimuth = geometryResults?.find((r: any) => r.target === 'EARTH')?.azimuth_deg ?? null;
  const earthElevation = geometryResults?.find((r: any) => r.target === 'EARTH')?.elevation_deg ?? null;

  return (
    <Group>
      {/* Moon Sphere */}
      <Mesh>
        <SphereGeometry args={[LUNAR_RADIUS * SCALE, 64, 64]} />
        <MeshStandardMaterial
          color="#888888"
          roughness={0.9}
          metalness={0.05}
          map={null} // Would use lunar texture in production
        />
      </Mesh>

      {/* Terminator line */}
      <TerminatorLine />

      {/* Sun direction indicator */}
      <SunDirectionIndicator sunAzimuth={sunAzimuth} sunElevation={sunElevation} />

      {/* Earth direction indicator */}
      <EarthDirectionIndicator earthAzimuth={earthAzimuth} earthElevation={earthElevation} />

      {/* Comparison site markers */}
      {comparisonSites.map((site, index) => (
        <SiteMarker
          key={site.site_id}
          site={site}
          isSelected={false}
          isComparison={true}
          color={index % 2 === 0 ? '#00a3e0' : '#5c9cff'}
        />
      ))}

      {/* Selected site marker */}
      {selectedSite && (
        <SiteMarker
          site={selectedSite}
          isSelected={true}
          isComparison={false}
          color="#00d4aa"
        />
      )}

      {/* Coordinate grid lines (subtle) */}
      <Group>
        {[-90, -60, -30, 0, 30, 60, 90].map(lat => (
          <Line
            key={`lat-${lat}`}
            geometry={new BufferGeometry().setAttribute('position', new Float32BufferAttribute(
              Array.from({ length: 65 }, (_, i) => {
                const lon = (i / 64) * Math.PI * 2;
                const latRad = (lat * Math.PI) / 180;
                const r = LUNAR_RADIUS * SCALE * 1.002;
                return [r * Math.cos(latRad) * Math.cos(lon), r * Math.sin(latRad), r * Math.cos(latRad) * Math.sin(lon)];
              }).flat(), 3
            ))}
            material={new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, depthWrite: false })}
          />
        ))}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(lon => (
          <Line
            key={`lon-${lon}`}
            geometry={new BufferGeometry().setAttribute('position', new Float32BufferAttribute(
              Array.from({ length: 65 }, (_, i) => {
                const lat = (i / 64 - 0.5) * Math.PI;
                const lonRad = (lon * Math.PI) / 180;
                const r = LUNAR_RADIUS * SCALE * 1.002;
                return [r * Math.cos(lat) * Math.cos(lonRad), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lonRad)];
              }).flat(), 3
            ))}
            material={new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, depthWrite: false })}
          />
        ))}
      </Group>
    </Group>
  );
}