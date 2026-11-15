"""Exceptions raised by the science engine."""


class ScienceError(Exception):
    """Base class for all science-engine errors."""


class InvalidInputError(ScienceError, ValueError):
    """Coordinates, timestamps or parameters are outside their valid range."""


class EphemerisUnavailableError(ScienceError):
    """No usable ephemeris (SPICE kernels missing or spiceypy not installed)."""


class KernelCoverageError(EphemerisUnavailableError):
    """Loaded kernels do not cover the requested body/frame/time."""


class TerrainDataError(ScienceError):
    """DEM is missing, incompatible, or does not cover the site."""
