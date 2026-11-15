"""Science engine: SPICE geometry, frames, terrain horizon, illumination.

Independent of the API and AI layers (docs/ARCHITECTURE.md). Entry point:
`site_analysis.analyze_site`.
"""
from .conventions import normalize_latitude, normalize_longitude
from .ephemeris import SpiceEphemeris, body_direction_from_site
from .errors import (EphemerisUnavailableError, InvalidInputError, KernelCoverageError,
                     ScienceError, TerrainDataError)
from .frames import az_el_to_vector, local_basis, vector_to_az_el
from .illumination import illumination_timeline
from .site_analysis import SiteQuery, analyze_site
from .terrain import DemGrid, HorizonProfile, horizon_profile, terrain_clear

__all__ = [
    "SiteQuery", "analyze_site", "SpiceEphemeris", "body_direction_from_site",
    "DemGrid", "HorizonProfile", "horizon_profile", "terrain_clear",
    "illumination_timeline", "vector_to_az_el", "az_el_to_vector", "local_basis",
    "normalize_latitude", "normalize_longitude",
    "ScienceError", "InvalidInputError", "EphemerisUnavailableError",
    "KernelCoverageError", "TerrainDataError",
]
