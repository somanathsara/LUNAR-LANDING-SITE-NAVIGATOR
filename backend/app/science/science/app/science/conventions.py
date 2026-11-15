"""Coordinate-convention validation and normalisation.

Internal convention (everything downstream):
    latitude   planetocentric degrees, [-90, 90]
    longitude  east-positive degrees, [0, 360)

On the 1737.4 km reference sphere used by LOLA, planetographic and
planetocentric latitude are identical, so both are accepted and recorded in
the provenance. If an ellipsoid is introduced later, convert here.
"""
from __future__ import annotations

import math

from .errors import InvalidInputError

LAT_TYPES = ("planetocentric", "planetographic")
LON_CONVENTIONS = ("east_positive_0_360", "east_positive_180", "west_positive_0_360")

LATITUDE_NOTE = (
    "Latitude treated as planetocentric on the 1737.4 km reference sphere "
    "(planetographic is identical on a sphere)."
)


def validate_latitude(lat_deg: float) -> float:
    lat = _finite(lat_deg, "latitude_deg")
    if not -90.0 <= lat <= 90.0:
        raise InvalidInputError(f"latitude_deg must be within [-90, 90], got {lat}")
    return lat


def normalize_latitude(lat_deg: float, lat_type: str = "planetocentric") -> float:
    if lat_type not in LAT_TYPES:
        raise InvalidInputError(f"latitude_type must be one of {LAT_TYPES}, got {lat_type!r}")
    return validate_latitude(lat_deg)  # identical on a sphere


def normalize_longitude(lon_deg: float, convention: str = "east_positive_0_360") -> float:
    """Return east-positive longitude in [0, 360). Raises if out of the stated range."""
    lon = _finite(lon_deg, "longitude_deg")
    if convention == "east_positive_0_360":
        _check_range(lon, 0.0, 360.0, convention)
        east = lon
    elif convention == "east_positive_180":
        _check_range(lon, -180.0, 180.0, convention)
        east = lon
    elif convention == "west_positive_0_360":
        _check_range(lon, 0.0, 360.0, convention)
        east = -lon
    else:
        raise InvalidInputError(f"longitude_convention must be one of {LON_CONVENTIONS}, got {convention!r}")
    return east % 360.0


def _check_range(v: float, lo: float, hi: float, convention: str) -> None:
    if not lo <= v <= hi:
        raise InvalidInputError(f"longitude_deg must be within [{lo}, {hi}] for {convention}, got {v}")


def _finite(v: float, name: str) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError) as exc:
        raise InvalidInputError(f"{name} must be a number") from exc
    if not math.isfinite(f):
        raise InvalidInputError(f"{name} must be finite")
    return f
