"""Local horizontal frame and vector -> azimuth/elevation.

Moon-fixed Cartesian axes (e.g. SPICE MOON_ME): +Z toward the north pole,
+X toward lon 0 / lat 0. For a site (lat, lon):

    up    = ( cos lat cos lon,  cos lat sin lon, sin lat)
    east  = (-sin lon,          cos lon,         0)
    north = (-sin lat cos lon, -sin lat sin lon, cos lat)

Azimuth is clockwise from north (north=0, east=90). At exactly +/-90 deg
latitude the east/north split is defined by the supplied longitude.
"""
from __future__ import annotations

import numpy as np

from .constants import MOON_RADIUS_M


def local_basis(lat_deg: float, lon_deg: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    sl, cl, so, co = np.sin(lat), np.cos(lat), np.sin(lon), np.cos(lon)
    up = np.array([cl * co, cl * so, sl])
    east = np.array([-so, co, 0.0])
    north = np.array([-sl * co, -sl * so, cl])
    return east, north, up


def site_position_km(lat_deg: float, lon_deg: float, height_m: float = 0.0) -> np.ndarray:
    """Site position from Moon centre in the Moon-fixed frame (km)."""
    _, _, up = local_basis(lat_deg, lon_deg)
    return up * (MOON_RADIUS_M + height_m) / 1000.0


def vector_to_az_el(vec_fixed, lat_deg: float, lon_deg: float) -> tuple[float, float]:
    """Direction (Moon-fixed vector, any length) -> (azimuth_deg, elevation_deg)."""
    v = np.asarray(vec_fixed, dtype=float)
    norm = np.linalg.norm(v)
    if norm == 0.0:
        raise ValueError("zero-length vector has no direction")
    east, north, up = local_basis(lat_deg, lon_deg)
    e, n, u = v @ east, v @ north, v @ up
    az = float(np.degrees(np.arctan2(e, n)) % 360.0)
    el = float(np.degrees(np.arcsin(np.clip(u / norm, -1.0, 1.0))))
    return az, el


def az_el_to_vector(az_deg: float, el_deg: float, lat_deg: float, lon_deg: float) -> np.ndarray:
    """Inverse of vector_to_az_el; returns a unit vector in the Moon-fixed frame."""
    east, north, up = local_basis(lat_deg, lon_deg)
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.cos(el) * (np.sin(az) * east + np.cos(az) * north) + np.sin(el) * up
