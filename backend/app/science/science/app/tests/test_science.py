from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.science import (DemGrid, InvalidInputError, SiteQuery, analyze_site, az_el_to_vector,
                         body_direction_from_site, horizon_profile, illumination_timeline,
                         normalize_latitude, normalize_longitude, terrain_clear, vector_to_az_el)
from app.science.terrain import grid_direction, polar_stereographic_forward
from app.science.timeutil import parse_utc, to_spice_utc_string

T0 = datetime(2026, 11, 14, 12, tzinfo=timezone.utc)


class FakeEphemeris:
    """Sun rotates in the XY plane (period 27.3 d); Earth fixed on +X. Test double only."""
    name = "fake"

    def body_position_km(self, body, when):
        if body == "SUN":
            w = 2 * np.pi * (when - T0).total_seconds() / (27.3 * 86400)
            return 1.5e8 * np.array([np.cos(w), np.sin(w), 0.0])
        return np.array([384400.0, 0.0, 0.0])

    def describe(self):
        return {"backend": "fake"}


# ---- conventions / time
def test_longitude_conventions():
    assert normalize_longitude(360, "east_positive_0_360") == 0
    assert normalize_longitude(-90, "east_positive_180") == 270
    assert normalize_longitude(90, "west_positive_0_360") == 270
    for bad in (-1, 361):
        with pytest.raises(InvalidInputError):
            normalize_longitude(bad, "east_positive_0_360")
    with pytest.raises(InvalidInputError):
        normalize_longitude(float("nan"))


def test_latitude_validation():
    assert normalize_latitude(-89.5) == -89.5
    with pytest.raises(InvalidInputError):
        normalize_latitude(91)
    with pytest.raises(InvalidInputError):
        normalize_latitude(0, "bogus")


def test_timestamps():
    assert parse_utc("2026-11-14T12:00:00Z") == T0
    assert to_spice_utc_string(T0) == "2026-11-14T12:00:00.000000 UTC"
    with pytest.raises(InvalidInputError):
        parse_utc("2026-11-14T12:00:00")  # naive
    with pytest.raises(InvalidInputError):
        parse_utc("not a date")


# ---- frames
def test_az_el_synthetic_vectors():
    assert vector_to_az_el([1, 0, 0], 0, 0)[1] == pytest.approx(90)      # zenith
    az, el = vector_to_az_el([0, 0, 1], 0, 0)                            # north pole direction
    assert (az, el) == (pytest.approx(0), pytest.approx(0))
    az, el = vector_to_az_el([0, 1, 0], 0, 0)                            # +Y is east at lon 0
    assert (az, el) == (pytest.approx(90), pytest.approx(0))
    assert vector_to_az_el([-1, 0, 0], 0, 0)[1] == pytest.approx(-90)


@pytest.mark.parametrize("lat,lon,az,el", [(-89.5, 0, 123.4, 17.2), (30, 200, 300, -5), (0, 45, 0, 0)])
def test_az_el_roundtrip(lat, lon, az, el):
    v = az_el_to_vector(az, el, lat, lon)
    a2, e2 = vector_to_az_el(v, lat, lon)
    assert a2 == pytest.approx(az, abs=1e-9) and e2 == pytest.approx(el, abs=1e-9)


def test_earth_parallax_from_equator_site():
    # Earth on +X; site at lat 0, lon 90 deg east is 90 deg away -> Earth near the horizon,
    # offset below by ~ R/d rad (site-vs-centre parallax).
    d = body_direction_from_site(FakeEphemeris(), "EARTH", 0.0, 90.0, T0)
    assert d["elevation_deg"] == pytest.approx(-np.degrees(1737.4 / 384400.0), abs=0.01)


# ---- projection
@pytest.mark.parametrize("hemi,lat", [("south", -89.5), ("north", 89.5)])
def test_grid_direction_matches_finite_difference(hemi, lat):
    lon = 37.0
    x0, y0 = polar_stereographic_forward(lat, lon, hemi)
    x1, y1 = polar_stereographic_forward(lat + 1e-6, lon, hemi)         # one step toward lunar north
    north = np.array([x1 - x0, y1 - y0]); north /= np.linalg.norm(north)
    assert np.allclose(grid_direction(0.0, lon, hemi), north, atol=1e-5)
    x2, y2 = polar_stereographic_forward(lat, lon + 1e-6, hemi)         # one step toward lunar east
    east = np.array([x2 - x0, y2 - y0]); east /= np.linalg.norm(east)
    assert np.allclose(grid_direction(90.0, lon, hemi), east, atol=1e-5)


# ---- terrain horizon
def make_dem(ridge=None, px=10.0, half=6000.0, lat=-89.5, lon=0.0, hole=None):
    sx, sy = polar_stereographic_forward(lat, lon, "south")
    n = int(2 * half / px)
    xs = sx - half + (np.arange(n) + 0.5) * px
    ys = sy + half - (np.arange(n) + 0.5) * px
    X, Y = np.meshgrid(xs, ys)
    Z = np.zeros((n, n))
    if ridge:
        Z[(X - sx >= ridge[0]) & (X - sx < ridge[0] + 50)] = ridge[1]      # wall to the east
    if hole:
        Z[(X - sx > hole[0]) & (X - sx < hole[1])] = np.nan
    return DemGrid(Z, sx - half, sy + half, px, "south", metadata={"product_id": "synthetic"})


def test_flat_terrain_horizon_is_about_zero():
    p = horizon_profile(make_dem(), -89.5, 0.0, max_range_m=5000)
    assert np.all(p.elevation_deg < 0.01) and np.all(p.elevation_deg > -0.05)


def test_synthetic_ridge_horizon():
    p = horizon_profile(make_dem(ridge=(1000, 100)), -89.5, 0.0, max_range_m=5000)
    assert p.at(90) == pytest.approx(np.degrees(np.arctan(100 / 1000)), abs=0.15)
    assert p.at(270) < 0.05                                                 # opposite side flat
    assert terrain_clear(p, 90, 3.0) is False and terrain_clear(p, 90, 8.0) is True


def test_nodata_gives_unknown_not_clear():
    p = horizon_profile(make_dem(hole=(50, 1e9)), -89.5, 0.0, max_range_m=300)  # all samples east of site missing
    assert terrain_clear(p, 90, 5.0) is None          # above partial horizon but ray incomplete -> unknown
    assert terrain_clear(p, 90, -5.0) is False        # at/below the known horizon -> certainly blocked
    assert terrain_clear(p, 270, 5.0) is True         # complete ray -> certain
    assert p.settings["missing_sample_fraction"] > 0


# ---- illumination / site analysis
def test_illumination_fraction_half_for_equator_site():
    r = illumination_timeline(FakeEphemeris(), 0.0, 0.0, T0, T0 + timedelta(days=27.3), 3600)
    assert r["sunlit_fraction"] == pytest.approx(0.5, abs=0.02)
    assert r["mode"] == "geometric_only" and r["sunlit_intervals"]


def test_analyze_site_without_kernels_returns_nulls():
    r = analyze_site(SiteQuery("a", -89.5, 0.0, "2026-11-14T12:00:00Z"), ephemeris=None)
    assert r["sun"]["elevation_deg"] is None and r["earth"]["geometric_visible"] is None
    assert any("ephemeris" in m.lower() for m in r["limitations"])


def test_analyze_site_with_terrain():
    q = SiteQuery("a", -89.5, 0.0, "2026-11-14T12:00:00Z")
    r = analyze_site(q, FakeEphemeris(), dem=make_dem(ridge=(1000, 100)), horizon_max_range_m=5000,
                     illumination_hours=48)
    assert r["sun"]["elevation_deg"] is not None
    assert r["sun"]["terrain_clear"] in (True, False)
    assert r["illumination"]["mode"] == "terrain_aware"
    assert r["provenance"]["terrain"]["dem_metadata"]["product_id"] == "synthetic"


def test_analyze_site_rejects_bad_input():
    with pytest.raises(InvalidInputError):
        analyze_site(SiteQuery("a", 95, 0.0, "2026-11-14T12:00:00Z"), None)
    with pytest.raises(InvalidInputError):
        analyze_site(SiteQuery("a", 0, 0.0, "yesterday"), None)
