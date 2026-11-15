"""Single-site analysis: the function the /analysis/site endpoint should call.

Output follows docs/API_CONTRACT.md. Unavailable values are None (never 0 or a
placeholder), and every gap is explained in `limitations`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from . import conventions as conv
from .constants import (AZIMUTH_CONVENTION, EARTH_BODY, ELEVATION_CONVENTION,
                        MOON_RADIUS_M, SUN_BODY)
from .ephemeris import EphemerisBackend, body_direction_from_site
from .errors import EphemerisUnavailableError, TerrainDataError
from .illumination import illumination_timeline
from .terrain import DemGrid, HorizonProfile, horizon_profile, terrain_clear
from .timeutil import iso_z, parse_utc


@dataclass
class SiteQuery:
    site_id: str
    latitude_deg: float
    longitude_deg: float
    timestamp_utc: str | datetime
    name: str = ""
    latitude_type: str = "planetocentric"
    longitude_convention: str = "east_positive_0_360"


def analyze_site(
    q: SiteQuery,
    ephemeris: EphemerisBackend | None,
    dem: DemGrid | None = None,
    observer_height_m: float = 0.0,
    horizon_max_range_m: float = 20_000.0,
    illumination_hours: float | None = None,
    illumination_step_s: float = 3600.0,
) -> dict:
    lat = conv.normalize_latitude(q.latitude_deg, q.latitude_type)       # raises InvalidInputError
    lon = conv.normalize_longitude(q.longitude_deg, q.longitude_convention)
    when = parse_utc(q.timestamp_utc)

    limitations: list[str] = [conv.LATITUDE_NOTE,
                              "Geometric visibility is not a communication-link analysis "
                              "(no antenna, relay, power or link-margin model)."]
    provenance: dict = {
        "conventions": {
            "latitude": "planetocentric degrees", "longitude": "east-positive degrees [0, 360)",
            "azimuth": AZIMUTH_CONVENTION, "elevation": ELEVATION_CONVENTION,
            "reference_radius_m": MOON_RADIUS_M, "observer_height_m": observer_height_m,
            "input_latitude_type": q.latitude_type, "input_longitude_convention": q.longitude_convention,
        },
        "ephemeris": None, "terrain": None,
    }

    # --- terrain horizon (optional)
    horizon: HorizonProfile | None = None
    if dem is None:
        limitations.append("No DEM loaded: terrain_clear is null; horizon obstruction not evaluated.")
    else:
        try:
            horizon = horizon_profile(dem, lat, lon, observer_height_m, max_range_m=horizon_max_range_m)
            provenance["terrain"] = horizon.settings
            if horizon.settings["missing_sample_fraction"] > 0:
                limitations.append(
                    f"{horizon.settings['missing_sample_fraction']:.1%} of terrain samples were outside the DEM "
                    "or nodata; directions whose rays were incomplete report terrain_clear=null unless blocked.")
        except TerrainDataError as exc:
            limitations.append(f"Terrain horizon unavailable: {exc}")

    # --- Sun / Earth geometry
    sun = {"azimuth_deg": None, "elevation_deg": None, "terrain_clear": None}
    earth = {"azimuth_deg": None, "elevation_deg": None, "geometric_visible": None,
             "terrain_clear": None, "range_km": None}
    illumination = None

    if ephemeris is None:
        limitations.append("No ephemeris available (SPICE kernels not loaded): Sun/Earth values are null.")
    else:
        try:
            provenance["ephemeris"] = ephemeris.describe()
            s = body_direction_from_site(ephemeris, SUN_BODY, lat, lon, when, observer_height_m)
            e = body_direction_from_site(ephemeris, EARTH_BODY, lat, lon, when, observer_height_m)
            sun.update(azimuth_deg=s["azimuth_deg"], elevation_deg=s["elevation_deg"],
                       terrain_clear=_clear(horizon, s))
            earth.update(azimuth_deg=e["azimuth_deg"], elevation_deg=e["elevation_deg"],
                         geometric_visible=bool(e["elevation_deg"] > 0.0),
                         terrain_clear=_clear(horizon, e), range_km=e["range_km"])
            if illumination_hours:
                illumination = illumination_timeline(
                    ephemeris, lat, lon, when, when + timedelta(hours=illumination_hours),
                    illumination_step_s, horizon, observer_height_m)
        except EphemerisUnavailableError as exc:
            limitations.append(f"Sun/Earth geometry unavailable: {exc}")

    return {
        "site_id": q.site_id, "name": q.name, "timestamp_utc": iso_z(when),
        "latitude_deg": lat, "longitude_deg_east": lon,
        "sun": sun, "earth": earth, "illumination": illumination,
        "provenance": provenance, "limitations": limitations,
    }


def _clear(horizon: HorizonProfile | None, d: dict) -> bool | None:
    if horizon is None:
        return None
    return terrain_clear(horizon, d["azimuth_deg"], d["elevation_deg"])
