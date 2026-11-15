"""Ephemeris backends.

An ephemeris backend answers one question: where is BODY relative to the Moon's
centre, expressed in the Moon-fixed frame, at UTC time T? Everything else
(site parallax, az/el) is done in `body_direction_from_site`.

`SpiceEphemeris` uses NAIF SPICE via spiceypy. Kernels needed in
SPICE_KERNEL_DIR (data/kernels):
    naif0012.tls                 leap seconds
    pck00011.tpc                 body constants
    de440s.bsp (or de421.bsp)    planetary ephemeris (Sun, Earth, Moon)
    moon_080317.tf               MOON_ME / MOON_PA frame definitions
    moon_pa_de440_200625.bpc     lunar orientation (high-accuracy)
Or put a single meta-kernel (*.tm) in the directory.
Download from https://naif.jpl.nasa.gov/naif/data.html and record versions.
"""
from __future__ import annotations

import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Protocol

import numpy as np

from .constants import DEFAULT_ABCORR, DEFAULT_MOON_FIXED_FRAME, MOON_BODY
from .errors import EphemerisUnavailableError, KernelCoverageError
from .frames import site_position_km, vector_to_az_el
from .timeutil import to_spice_utc_string

_KERNEL_ORDER = [".tls", ".tpc", ".tf", ".bpc", ".bsp"]


class EphemerisBackend(Protocol):
    name: str

    def body_position_km(self, body: str, when_utc: datetime) -> np.ndarray:
        """Position of `body` relative to Moon centre, Moon-fixed frame, km."""

    def describe(self) -> dict:
        """Provenance: backend, frame, aberration correction, kernels."""


class SpiceEphemeris:
    name = "NAIF SPICE (spiceypy)"

    def __init__(
        self,
        kernel_dir: str | os.PathLike | None = None,
        frame: str = DEFAULT_MOON_FIXED_FRAME,
        abcorr: str = DEFAULT_ABCORR,
    ):
        try:
            import spiceypy as sp
        except ImportError as exc:  # pragma: no cover - depends on environment
            raise EphemerisUnavailableError("spiceypy is not installed") from exc
        self._sp = sp
        self.frame, self.abcorr = frame, abcorr
        self.kernel_dir = Path(kernel_dir or os.environ.get("SPICE_KERNEL_DIR", "../data/kernels")).resolve()
        self.kernels: list[Path] = self._discover()
        if not self.kernels:
            raise EphemerisUnavailableError(f"no SPICE kernels found in {self.kernel_dir}")
        for k in self.kernels:
            try:
                sp.furnsh(str(k))
            except Exception as exc:
                raise EphemerisUnavailableError(f"failed to load kernel {k.name}: {exc}") from exc
        self._sha: dict[str, str] = {}

    def _discover(self) -> list[Path]:
        if not self.kernel_dir.is_dir():
            return []
        meta = sorted(self.kernel_dir.glob("*.tm"))
        if meta:
            return meta[:1]
        files = [p for p in self.kernel_dir.iterdir() if p.suffix.lower() in _KERNEL_ORDER]
        return sorted(files, key=lambda p: (_KERNEL_ORDER.index(p.suffix.lower()), p.name))

    def body_position_km(self, body: str, when_utc: datetime) -> np.ndarray:
        sp = self._sp
        try:
            et = sp.str2et(to_spice_utc_string(when_utc))
            pos, _lt = sp.spkpos(body, et, self.frame, self.abcorr, MOON_BODY)
        except Exception as exc:  # SpiceyError subclasses Exception
            raise KernelCoverageError(
                f"SPICE could not compute {body} relative to MOON in {self.frame} at "
                f"{when_utc.isoformat()}: {exc}"
            ) from exc
        return np.asarray(pos, dtype=float)

    def describe(self) -> dict:
        return {
            "backend": self.name,
            "moon_fixed_frame": self.frame,
            "aberration_correction": self.abcorr,
            "kernel_dir": str(self.kernel_dir),
            "kernels": [{"file": k.name, "sha256": self._checksum(k)} for k in self.kernels],
        }

    def _checksum(self, path: Path) -> str:
        if path.name not in self._sha:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
            self._sha[path.name] = h.hexdigest()
        return self._sha[path.name]

    def close(self) -> None:
        for k in self.kernels:
            self._sp.unload(str(k))


def body_direction_from_site(
    eph: EphemerisBackend,
    body: str,
    lat_deg: float,
    lon_deg_east: float,
    when_utc: datetime,
    height_m: float = 0.0,
) -> dict:
    """Az/el/range of `body` seen from the site (includes site-vs-centre parallax)."""
    site = site_position_km(lat_deg, lon_deg_east, height_m)
    vec = eph.body_position_km(body, when_utc) - site
    az, el = vector_to_az_el(vec, lat_deg, lon_deg_east)
    return {"azimuth_deg": az, "elevation_deg": el, "range_km": float(np.linalg.norm(vec))}
