"""Point-based illumination timeline from Sun elevation (+ terrain horizon)."""
from __future__ import annotations

from datetime import datetime

import numpy as np

from .constants import SUN_BODY, SUN_RADIUS_KM
from .ephemeris import EphemerisBackend, body_direction_from_site
from .terrain import HorizonProfile, terrain_clear
from .timeutil import iso_z, time_range


def illumination_timeline(
    eph: EphemerisBackend,
    lat_deg: float,
    lon_deg_east: float,
    start: datetime,
    end: datetime,
    step_s: float = 3600.0,
    horizon: HorizonProfile | None = None,
    observer_height_m: float = 0.0,
    use_upper_limb: bool = False,
) -> dict:
    """Sunlit/shadowed state at each time step.

    Sunlit = Sun centre (or upper limb) above the terrain horizon when a horizon
    is supplied, otherwise above the ideal geometric horizon. Intervals have
    time-step resolution (edges are sample times, not interpolated).
    """
    times = time_range(start, end, step_s)
    samples = []
    for t in times:
        d = body_direction_from_site(eph, SUN_BODY, lat_deg, lon_deg_east, t, observer_height_m)
        el = d["elevation_deg"]
        if use_upper_limb:
            el += float(np.degrees(np.arcsin(SUN_RADIUS_KM / d["range_km"])))
        if horizon is not None:
            lit = terrain_clear(horizon, d["azimuth_deg"], el)  # None when horizon unknown
        else:
            lit = bool(el > 0.0)
        samples.append({"time_utc": iso_z(t), "sun_azimuth_deg": d["azimuth_deg"],
                        "sun_elevation_deg": d["elevation_deg"], "sunlit": lit})

    known = [s for s in samples if s["sunlit"] is not None]
    lit_n = sum(1 for s in known if s["sunlit"])
    return {
        "mode": "terrain_aware" if horizon is not None else "geometric_only",
        "spatial_basis": "point",
        "start_utc": iso_z(start), "end_utc": iso_z(end), "time_step_s": step_s,
        "sun_reference": "upper limb" if use_upper_limb else "centre",
        "sample_count": len(samples),
        "unknown_count": len(samples) - len(known),
        "sunlit_fraction": (lit_n / len(known)) if known else None,
        "sunlit_intervals": _intervals(samples),
        "samples": samples,
    }


def _intervals(samples: list[dict]) -> list[dict]:
    out, open_start, last_lit = [], None, None
    for s in samples:
        if s["sunlit"] and open_start is None:
            open_start = s["time_utc"]
        if not s["sunlit"] and open_start is not None:
            out.append({"start_utc": open_start, "end_utc": last_lit})
            open_start = None
        if s["sunlit"]:
            last_lit = s["time_utc"]
    if open_start is not None:
        out.append({"start_utc": open_start, "end_utc": last_lit})
    return out
