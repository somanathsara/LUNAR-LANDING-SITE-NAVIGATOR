"""DEM handling and terrain-horizon calculation.

The DEM must be a polar-stereographic raster on the 1737.4 km sphere with
elevations in metres relative to that sphere (the standard LOLA polar DEM
layout). Do not feed it an equirectangular or differently-referenced DEM
without reprojecting first.

Horizon method (docs/SCIENCE_METHODOLOGY.md): along each azimuth, sample the
DEM at increasing ground distance s, compute the exact spherical apparent
elevation of every sample as seen from the site, and keep the maximum.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .constants import MOON_RADIUS_M
from .errors import InvalidInputError, TerrainDataError


# ------------------------------------------------------------------ projection
def polar_stereographic_forward(lat_deg: float, lon_deg_east: float, hemisphere: str, radius_m: float = MOON_RADIUS_M):
    """(lat, lon) -> (x, y) metres, true scale at the pole (Snyder, k0=1 at pole)."""
    lat, lon = np.radians(lat_deg), np.radians(lon_deg_east)
    if hemisphere == "south":
        colat = np.pi / 2 + lat
        rho = 2 * radius_m * np.tan(colat / 2)
        return rho * np.sin(lon), rho * np.cos(lon)
    if hemisphere == "north":
        colat = np.pi / 2 - lat
        rho = 2 * radius_m * np.tan(colat / 2)
        return rho * np.sin(lon), -rho * np.cos(lon)
    raise InvalidInputError("hemisphere must be 'south' or 'north'")


def projection_scale(lat_deg: float, hemisphere: str) -> float:
    """Local scale factor k (grid distance / ground distance)."""
    colat = np.radians(90.0 + lat_deg if hemisphere == "south" else 90.0 - lat_deg)
    return float(2.0 / (1.0 + np.cos(colat)))


def grid_direction(azimuth_deg, lon_deg_east: float, hemisphere: str) -> np.ndarray:
    """Unit grid vectors (x, y) for geographic azimuths at a site; shape (..., 2)."""
    lon = np.radians(lon_deg_east)
    if hemisphere == "south":
        north = np.array([np.sin(lon), np.cos(lon)])
        east = np.array([np.cos(lon), -np.sin(lon)])
    else:
        north = np.array([-np.sin(lon), np.cos(lon)])
        east = np.array([np.cos(lon), np.sin(lon)])
    az = np.radians(np.asarray(azimuth_deg, dtype=float))[..., None]
    return np.cos(az) * north + np.sin(az) * east


# ------------------------------------------------------------------------- DEM
@dataclass
class DemGrid:
    """Elevation raster. Pixel (row, col) centre = (x_min + (col+.5)px, y_max - (row+.5)px)."""

    elevation_m: np.ndarray
    x_min_m: float
    y_max_m: float
    pixel_size_m: float
    hemisphere: str = "south"
    radius_m: float = MOON_RADIUS_M
    metadata: dict = field(default_factory=dict)  # product id, url, release, checksum, ...

    def __post_init__(self):
        self.elevation_m = np.asarray(self.elevation_m, dtype=float)
        if self.elevation_m.ndim != 2:
            raise TerrainDataError("DEM must be a 2-D array")
        if self.pixel_size_m <= 0:
            raise TerrainDataError("pixel_size_m must be > 0")

    @classmethod
    def from_geotiff(
        cls, path: str, hemisphere: str = "south", metadata: dict | None = None
    ) -> DemGrid:
        """Load a north-up polar-stereographic GeoTIFF whose values are metres."""
        import rasterio  # lazy: heavy dependency

        with rasterio.open(path) as src:
            data = src.read(1).astype(float)
            if src.nodata is not None:
                data[data == src.nodata] = np.nan
            tf = src.transform
            if abs(tf.a) != abs(tf.e):
                raise TerrainDataError("DEM pixels are not square")
            if tf.b != 0 or tf.d != 0:
                raise TerrainDataError("rotated DEM grids are not supported")
            meta = {"local_file": str(path), "crs": str(src.crs), **(metadata or {})}
            return cls(data, tf.c, tf.f, abs(tf.a), hemisphere=hemisphere, metadata=meta)

    @property
    def extent(self) -> tuple[float, float, float, float]:
        h, w = self.elevation_m.shape
        return (self.x_min_m, self.x_min_m + w * self.pixel_size_m,
                self.y_max_m - h * self.pixel_size_m, self.y_max_m)

    def sample(self, x, y) -> np.ndarray:
        """Bilinear elevation at grid coords (m). NaN outside the DEM or next to nodata."""
        x, y = np.asarray(x, dtype=float), np.asarray(y, dtype=float)
        col = (x - self.x_min_m) / self.pixel_size_m - 0.5
        row = (self.y_max_m - y) / self.pixel_size_m - 0.5
        h, w = self.elevation_m.shape
        c0, r0 = np.floor(col).astype(int), np.floor(row).astype(int)
        inside = (c0 >= 0) & (r0 >= 0) & (c0 + 1 < w) & (r0 + 1 < h)
        c0c, r0c = np.clip(c0, 0, w - 2), np.clip(r0, 0, h - 2)
        fc, fr = col - c0c, row - r0c
        z = self.elevation_m
        v = (z[r0c, c0c] * (1 - fc) * (1 - fr) + z[r0c, c0c + 1] * fc * (1 - fr)
             + z[r0c + 1, c0c] * (1 - fc) * fr + z[r0c + 1, c0c + 1] * fc * fr)
        return np.where(inside, v, np.nan)

    def site_xy(self, lat_deg: float, lon_deg_east: float) -> tuple[float, float]:
        x, y = polar_stereographic_forward(lat_deg, lon_deg_east, self.hemisphere, self.radius_m)
        return float(x), float(y)


# --------------------------------------------------------------------- horizon
@dataclass
class HorizonProfile:
    azimuth_deg: np.ndarray      # (N,) 0..360 exclusive
    elevation_deg: np.ndarray    # (N,) NaN where no valid terrain samples
    site_elevation_m: float
    observer_height_m: float
    settings: dict
    complete: np.ndarray | None = None   # (N,) True if every ray sample had valid DEM data

    def complete_at(self, azimuth_deg: float) -> bool:
        if self.complete is None:
            return True
        az = float(azimuth_deg) % 360.0
        step = 360.0 / len(self.azimuth_deg)
        i0 = int(az // step) % len(self.azimuth_deg)
        return bool(self.complete[i0] and self.complete[(i0 + 1) % len(self.azimuth_deg)])

    def at(self, azimuth_deg: float) -> float:
        """Circular linear interpolation; NaN if either neighbour is unknown."""
        az = float(azimuth_deg) % 360.0
        step = 360.0 / len(self.azimuth_deg)
        i0 = int(az // step) % len(self.azimuth_deg)
        i1 = (i0 + 1) % len(self.azimuth_deg)
        f = (az - i0 * step) / step
        a, b = self.elevation_deg[i0], self.elevation_deg[i1]
        if np.isnan(a) or np.isnan(b):
            return float("nan")
        return float(a * (1 - f) + b * f)


def horizon_profile(
    dem: DemGrid,
    lat_deg: float,
    lon_deg_east: float,
    observer_height_m: float = 0.0,
    azimuth_step_deg: float = 1.0,
    max_range_m: float = 20_000.0,
    step_m: float | None = None,
) -> HorizonProfile:
    if not 0 < azimuth_step_deg <= 90 or 360 % azimuth_step_deg > 1e-9:
        raise InvalidInputError("azimuth_step_deg must divide 360 evenly")
    if max_range_m <= 0:
        raise InvalidInputError("max_range_m must be > 0")
    step = float(step_m or dem.pixel_size_m)
    sx, sy = dem.site_xy(lat_deg, lon_deg_east)
    z0 = float(dem.sample(sx, sy))
    if np.isnan(z0):
        raise TerrainDataError("site is outside the DEM or on a nodata cell")

    az = np.arange(0.0, 360.0, azimuth_step_deg)
    s = np.arange(step, max_range_m + step / 2, step)                    # ground distance (m)
    k = projection_scale(lat_deg, dem.hemisphere)
    dirs = grid_direction(az, lon_deg_east, dem.hemisphere)               # (A, 2)
    x = sx + k * s[None, :] * dirs[:, 0:1]
    y = sy + k * s[None, :] * dirs[:, 1:2]
    z = dem.sample(x, y)                                                  # (A, S)

    R = dem.radius_m
    theta = s / R
    rr = R + z                                                            # NaN propagates
    horiz = rr * np.sin(theta)[None, :]
    vert = rr * np.cos(theta)[None, :] - (R + z0 + observer_height_m)
    ang = np.degrees(np.arctan2(vert, horiz))
    valid = ~np.isnan(ang)
    with np.errstate(all="ignore"):
        horizon = np.where(valid.any(axis=1), np.nanmax(np.where(valid, ang, -np.inf), axis=1), np.nan)

    settings = {
        "azimuth_step_deg": azimuth_step_deg,
        "sampling_distance_m": step,
        "max_range_requested_m": max_range_m,
        "missing_sample_fraction": float(1.0 - valid.mean()),
        "dem_pixel_size_m": dem.pixel_size_m,
        "dem_extent_xy_m": dem.extent,
        "dem_metadata": dem.metadata,
        "interpolation": "bilinear",
        "geometry": f"exact spherical, radius {R:.1f} m",
        "range_note": "Terrain beyond the DEM edge is not seen, so the horizon is a lower bound there.",
    }
    return HorizonProfile(az, horizon, z0, observer_height_m, settings, complete=valid.all(axis=1))


def terrain_clear(profile: HorizonProfile, azimuth_deg: float, elevation_deg: float) -> bool | None:
    """True/False if the terrain verdict is certain, else None.

    Blocked (False) is certain whenever the direction is at or below the horizon
    built from valid samples. Clear (True) is only certain if every sample along
    the neighbouring rays had valid DEM data; otherwise unseen terrain could still
    block it, so the answer is None (unknown), never silently True.
    """
    h = profile.at(azimuth_deg)
    if np.isnan(h):
        return None
    if elevation_deg <= h:
        return False
    return True if profile.complete_at(azimuth_deg) else None
