"""Physical constants and fixed conventions used across the science package.

Lunar reference sphere: LOLA topography is expressed relative to a sphere of
radius 1737.4 km, so that is the single reference radius used here.
"""

MOON_RADIUS_M = 1_737_400.0          # IAU / LOLA reference sphere
SUN_RADIUS_KM = 695_700.0            # IAU nominal solar radius

# SPICE frame / body names
MOON_BODY = "MOON"
SUN_BODY = "SUN"
EARTH_BODY = "EARTH"
DEFAULT_MOON_FIXED_FRAME = "MOON_ME"  # Mean-Earth / polar-axis frame (needs moon_080317.tf)
DEFAULT_ABCORR = "LT+S"               # light time + stellar aberration

AZIMUTH_CONVENTION = "degrees clockwise from local north (north=0, east=90), range [0, 360)"
ELEVATION_CONVENTION = "degrees above the ideal geometric horizon (local tangent plane on the reference sphere)"
