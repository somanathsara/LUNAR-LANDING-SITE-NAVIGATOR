"""SPICE service for lunar geometry calculations.

This service wraps SPICE/SpiceyPy calls for computing Sun and Earth
geometry at lunar surface sites. All calculations follow documented
conventions and preserve provenance metadata.
"""

import logging
from contextlib import contextmanager
from dataclasses import dataclass

import numpy as np
import spiceypy as spice

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class GeometryResult:
    """Result of a geometry calculation for a target body."""
    target: str  # 'SUN' or 'EARTH'
    azimuth_deg: float | None
    elevation_deg: float | None
    geometric_visible: bool | None
    terrain_visible: str | None  # 'clear', 'obstructed', 'unavailable'
    units: str
    frame: str
    provenance: dict


@dataclass
class SiteGeometry:
    """Complete geometry results for a site at a given time."""
    site_id: str
    timestamp_utc: str
    sun: GeometryResult
    earth: GeometryResult
    algorithm_version: str
    limitations: list[str]


class SpiceService:
    """Service for SPICE-based lunar geometry computations.

    Handles kernel loading, time conversion, coordinate transformations,
    and geometry calculations with full provenance tracking.
    """

    # SPICE ID codes
    MOON_ID = 301
    SUN_ID = 10
    EARTH_ID = 399
    MOON_CENTER_ID = 301

    # Reference frame constants
    MOON_FIXED_FRAME = "MOON_ME"  # Mean Earth/Polar Axis frame
    J2000_FRAME = "J2000"
    TOPOCENTRIC_FRAME_SUFFIX = "_TOPO"

    # Lunar radius (IAU 2015)
    LUNAR_RADIUS_KM = 1737.4

    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        self._kernels_loaded = False
        self._kernel_ids = []

    def initialize(self) -> None:
        """Load SPICE kernels. Call once at startup."""
        if self._kernels_loaded:
            return

        kernel_dir = self.settings.kernel_dir
        logger.info(f"Loading SPICE kernels from {kernel_dir}")

        for kernel_name in self.settings.kernel_list:
            kernel_path = kernel_dir / kernel_name
            if kernel_path.exists():
                try:
                    spice.furnsh(str(kernel_path))
                    self._kernel_ids.append(kernel_name)
                    logger.info(f"Loaded kernel: {kernel_name}")
                except spice.SpiceyError as e:
                    logger.error(f"Failed to load kernel {kernel_name}: {e}")
            else:
                logger.warning(f"Kernel not found: {kernel_path}")

        self._kernels_loaded = True
        logger.info(f"SPICE initialized with {len(self._kernel_ids)} kernels")

    def unload(self) -> None:
        """Unload all kernels."""
        spice.kclear()
        self._kernels_loaded = False
        self._kernel_ids = []
        logger.info("SPICE kernels unloaded")

    @contextmanager
    def kernel_context(self):
        """Context manager for kernel lifecycle."""
        try:
            self.initialize()
            yield self
        finally:
            # Keep kernels loaded for performance in server context
            pass

    def utc_to_et(self, utc_str: str) -> float:
        """Convert UTC string to SPICE Ephemeris Time (ET)."""
        return spice.str2et(utc_str)

    def et_to_utc(self, et: float, format_str: str = "ISOC", precision: int = 3) -> str:
        """Convert ET to UTC string."""
        return spice.et2utc(et, format_str, precision)

    def compute_site_position(
        self,
        latitude_deg: float,
        longitude_deg: float,
        elevation_m: float = 0.0,
        latitude_type: str = "planetocentric",
        longitude_convention: str = "east-positive",
    ) -> tuple[np.ndarray, np.ndarray]:
        """Compute site position and rotation matrix in Moon-fixed frame.

        Args:
            latitude_deg: Latitude in degrees
            longitude_deg: Longitude in degrees
            elevation_m: Elevation above reference sphere in meters
            latitude_type: 'planetocentric' or 'planetographic'
            longitude_convention: 'east-positive' or 'west-positive'

        Returns:
            Tuple of (position_vector_km, rotation_matrix_to_topo)
        """
        # Convert to planetocentric if needed
        if latitude_type == "planetographic":
            # For Moon, planetocentric == planetographic (no flattening)
            lat_pc = latitude_deg
        else:
            lat_pc = latitude_deg

        # Convert longitude convention
        if longitude_convention == "west-positive":
            lon_pc = -longitude_deg
        else:
            lon_pc = longitude_deg

        # Normalize to 0-360
        lon_pc = lon_pc % 360

        # Convert to radians
        lat_rad = np.radians(lat_pc)
        lon_rad = np.radians(lon_pc)

        # Radius in km
        radius_km = self.LUNAR_RADIUS_KM + elevation_m / 1000.0

        # Position in Moon-fixed frame (ME frame)
        # x = r * cos(lat) * cos(lon)
        # y = r * sin(lat)
        # z = r * cos(lat) * sin(lon)
        pos = np.array([
            radius_km * np.cos(lat_rad) * np.cos(lon_rad),
            radius_km * np.sin(lat_rad),
            radius_km * np.cos(lat_rad) * np.sin(lon_rad),
        ])

        # Rotation matrix from Moon-fixed to local topocentric frame
        # Topocentric frame: X=East, Y=North, Z=Up (local vertical)
        # This follows the convention: Azimuth 0=North, +East
        slat = np.sin(lat_rad)
        clat = np.cos(lat_rad)
        slon = np.sin(lon_rad)
        clon = np.cos(lon_rad)

        # Rotation matrix: Moon-fixed -> Topocentric (East, North, Up)
        rot = np.array([
            [-slon, 0, clon],          # East
            [-slat * clon, clat, -slat * slon],  # North
            [clat * clon, slat, clat * slon],    # Up
        ])

        return pos, rot

    def compute_target_vector(
        self,
        et: float,
        target_id: int,
        observer_pos: np.ndarray,
        frame: str = "J2000",
        abcorr: str = "LT+S",
    ) -> np.ndarray:
        """Compute target direction vector from observer position.

        Args:
            et: Ephemeris time
            target_id: SPICE ID of target body
            observer_pos: Observer position in Moon-fixed frame (km)
            frame: Reference frame for output
            abcorr: Aberration correction

        Returns:
            Target direction vector in specified frame
        """
        # Use SPICE subpoint/illumination computation
        # spkpos gives position of target relative to observer
        # We want Moon-centered observer, so use Moon as center
        state, _ = spice.spkpos(
            targ=str(target_id),
            et=et,
            ref=frame,
            abcorr=abcorr,
            obs=str(self.MOON_CENTER_ID),
        )

        # State is [x, y, z, vx, vy, vz] in km and km/s
        # We want direction from Moon center to target
        target_pos = state[:3]

        # Vector from site to target = target_pos - observer_pos
        # But observer_pos is in Moon-fixed frame, need to transform
        # For simplicity, compute in J2000 frame
        # Transform observer position to J2000
        rot_mat = spice.pxform(self.MOON_FIXED_FRAME, frame, et)
        observer_j2000 = rot_mat @ observer_pos

        vec = target_pos - observer_j2000
        return vec / np.linalg.norm(vec)

    def compute_topocentric_angles(
        self,
        target_vec_j2000: np.ndarray,
        rot_moon_to_topo: np.ndarray,
        et: float,
    ) -> tuple[float, float]:
        """Transform target vector to topocentric frame and compute az/el.

        Args:
            target_vec_j2000: Unit vector to target in J2000
            rot_moon_to_topo: Rotation matrix from Moon-fixed to topocentric
            et: Ephemeris time

        Returns:
            Tuple of (azimuth_deg, elevation_deg)
            Azimuth: 0=North, +East (clockwise from North)
            Elevation: angle above local horizontal
        """
        # Transform target vector from J2000 to Moon-fixed
        rot_j2000_to_moon = spice.pxform("J2000", self.MOON_FIXED_FRAME, et)
        target_moon = rot_j2000_to_moon @ target_vec_j2000

        # Transform to topocentric frame
        target_topo = rot_moon_to_topo @ target_moon

        # target_topo = [East, North, Up]
        east = target_topo[0]
        north = target_topo[1]
        up = target_topo[2]

        # Azimuth: atan2(East, North), 0=North, +East
        azimuth_rad = np.arctan2(east, north)
        azimuth_deg = np.degrees(azimuth_rad) % 360

        # Elevation: asin(Up)
        elevation_rad = np.arcsin(np.clip(up, -1.0, 1.0))
        elevation_deg = np.degrees(elevation_rad)

        return azimuth_deg, elevation_deg

    def compute_geometry(
        self,
        site_id: str,
        latitude_deg: float,
        longitude_deg: float,
        elevation_m: float,
        timestamp_utc: str,
        latitude_type: str = "planetocentric",
        longitude_convention: str = "east-positive",
    ) -> SiteGeometry:
        """Compute complete Sun/Earth geometry for a site at a given time.

        Args:
            site_id: Unique site identifier
            latitude_deg: Latitude in degrees
            longitude_deg: Longitude in degrees
            elevation_m: Elevation in meters
            timestamp_utc: ISO 8601 UTC timestamp
            latitude_type: 'planetocentric' or 'planetographic'
            longitude_convention: 'east-positive' or 'west-positive'

        Returns:
            SiteGeometry with Sun and Earth results
        """
        self.initialize()

        et = self.utc_to_et(timestamp_utc)

        # Compute site position and rotation matrix
        observer_pos, rot_moon_to_topo = self.compute_site_position(
            latitude_deg, longitude_deg, elevation_m,
            latitude_type, longitude_convention
        )

        limitations = []

        # Sun geometry
        sun_vec = self.compute_target_vector(et, self.SUN_ID, observer_pos)
        sun_az, sun_el = self.compute_topocentric_angles(sun_vec, rot_moon_to_topo, et)
        sun_geometric = sun_el > 0.0

        # Earth geometry
        earth_vec = self.compute_target_vector(et, self.EARTH_ID, observer_pos)
        earth_az, earth_el = self.compute_topocentric_angles(earth_vec, rot_moon_to_topo, et)
        earth_geometric = earth_el > 0.0

        # Terrain visibility (placeholder - requires DEM)
        terrain_sun = "unavailable"
        terrain_earth = "unavailable"
        limitations.append("Terrain visibility not computed: DEM data not loaded")

        # Provenance
        provenance = {
            "kernel_ids": self._kernel_ids.copy(),
            "method": "SPICE SUBPOINT/ILLUMINATION via SpiceyPy",
            "software_versions": {
                "SPICE": spice.tkvrsn("TOOLKIT"),
                "SpiceyPy": spice.__version__,
                "Python": "3.11+",
            },
        }

        frame = f"{self.MOON_FIXED_FRAME} -> TOPOCENTRIC (Az: 0=N, +E; El: horizon=0)"

        sun_result = GeometryResult(
            target="SUN",
            azimuth_deg=round(sun_az, 4),
            elevation_deg=round(sun_el, 4),
            geometric_visible=sun_geometric,
            terrain_visible=terrain_sun,
            units="degrees",
            frame=frame,
            provenance=provenance,
        )

        earth_result = GeometryResult(
            target="EARTH",
            azimuth_deg=round(earth_az, 4),
            elevation_deg=round(earth_el, 4),
            geometric_visible=earth_geometric,
            terrain_visible=terrain_earth,
            units="degrees",
            frame=frame,
            provenance=provenance,
        )

        # Additional limitations
        if abs(latitude_deg) > 85:
            limitations.append("Polar site: Sun elevation near horizon; long shadows; terrain effects significant")

        return SiteGeometry(
            site_id=site_id,
            timestamp_utc=timestamp_utc,
            sun=sun_result,
            earth=earth_result,
            algorithm_version="spice-v1.0.0",
            limitations=limitations,
        )

    def compute_time_series(
        self,
        site_id: str,
        latitude_deg: float,
        longitude_deg: float,
        elevation_m: float,
        start_utc: str,
        interval_seconds: float,
        steps: int,
        latitude_type: str = "planetocentric",
        longitude_convention: str = "east-positive",
    ) -> list[SiteGeometry]:
        """Compute geometry for a time series.

        Args:
            site_id: Unique site identifier
            latitude_deg: Latitude in degrees
            longitude_deg: Longitude in degrees
            elevation_m: Elevation in meters
            start_utc: Start time ISO 8601
            interval_seconds: Interval between steps
            steps: Number of steps
            latitude_type: 'planetocentric' or 'planetographic'
            longitude_convention: 'east-positive' or 'west-positive'

        Returns:
            List of SiteGeometry for each time step
        """
        results = []
        start_et = self.utc_to_et(start_utc)

        for i in range(steps):
            et = start_et + i * interval_seconds
            utc = self.et_to_utc(et)
            result = self.compute_geometry(
                site_id, latitude_deg, longitude_deg, elevation_m,
                utc, latitude_type, longitude_convention
            )
            results.append(result)

        return results


# Global service instance
_spice_service: SpiceService | None = None


def get_spice_service() -> SpiceService:
    """Get or create global SPICE service instance."""
    global _spice_service
    if _spice_service is None:
        _spice_service = SpiceService()
    return _spice_service