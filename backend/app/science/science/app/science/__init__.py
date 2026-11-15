"""Science engine: SPICE geometry, frames, terrain horizon, illumination.

Independent of the API and AI layers (docs/ARCHITECTURE.md). Entry point:
`site_analysis.analyze_site`.
"""
from .conventions import normalize_latitude, normalize_longitude
from .ephemeris import SpiceEphemeris, body_direction_from_site
from .errors import (
    EphemerisUnavailableError,
    InvalidInputError,
    KernelCoverageError,
    ScienceError,
    TerrainDataError,
)
from .frames import az_el_to_vector, local_basis, vector_to_az_el
from .illumination import illumination_timeline
from .site_analysis import SiteQuery, analyze_site
from .terrain import DemGrid, HorizonProfile, horizon_profile, terrain_clear

__all__ = [
    "DemGrid",
    "EphemerisUnavailableError",
    "HorizonProfile",
    "InvalidInputError",
    "KernelCoverageError",
    "ScienceError",
    "SiteQuery",
    "SpiceEphemeris",
    "TerrainDataError",
    "analyze_site",
    "az_el_to_vector",
    "body_direction_from_site",
    "horizon_profile",
    "illumination_timeline",
    "local_basis",
    "normalize_latitude",
    "normalize_longitude",
    "terrain_clear",
    "vector_to_az_el",
]
