#!/usr/bin/env python3
"""Download SPICE kernels from NAIF for lunar geometry calculations.

This script downloads the required SPICE kernels from JPL NAIF.
Run this before starting the backend server.

Kernels needed:
- de440.bsp: Planetary ephemeris (DE440)
- pck00010.tpc: Planetary constants kernel
- moon_080317.tf: Moon frame definitions
- moon_pa_de421_1900-2050.bpc: Moon pole/axis orientation
- naif0012.tls: Leapseconds kernel
"""

import sys
import urllib.error
import urllib.request
from pathlib import Path

# NAIF kernel URLs
KERNEL_URLS = {
    "de440.bsp": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/a_old_versions/de440.bsp",
    "pck00010.tpc": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc",
    "moon_080317.tf": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf",
    "moon_pa_de421_1900-2050.bpc": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc",
    "naif0012.tls": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
}

# Alternative: DE440 from newer location
DE440_ALT = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440.bsp"


def download_file(url: str, dest: Path, description: str = "") -> bool:
    """Download a file with progress indication."""
    try:
        print(f"Downloading {description or dest.name}...")
        print(f"  From: {url}")
        print(f"  To:   {dest}")

        def progress_hook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, (block_num * block_size * 100) // total_size)
                sys.stdout.write(f"\r  Progress: {percent}%")
                sys.stdout.flush()

        urllib.request.urlretrieve(url, dest, progress_hook)
        print("\n  Done!")
        return True
    except (urllib.error.URLError, OSError) as e:
        print(f"\n  Failed: {e}")
        return False


def main():
    """Download all required kernels."""
    kernel_dir = Path(__file__).parent.parent / "data" / "kernels"
    kernel_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading SPICE kernels to {kernel_dir}")
    print("=" * 60)

    success_count = 0
    total_count = len(KERNEL_URLS)

    for name, url in KERNEL_URLS.items():
        dest = kernel_dir / name
        if dest.exists():
            print(f"Skipping {name} (already exists)")
            success_count += 1
            continue

        # Try primary URL
        if download_file(url, dest, name):
            success_count += 1
        elif name == "de440.bsp":
            # Try alternative URL for DE440
            print(f"  Trying alternative URL for {name}...")
            if download_file(DE440_ALT, dest, name):
                success_count += 1

    print("=" * 60)
    print(f"Downloaded: {success_count}/{total_count} kernels")

    if success_count == total_count:
        print("\nAll kernels downloaded successfully!")
        print(f"Kernel directory: {kernel_dir.absolute()}")
        return 0
    else:
        print("\nSome kernels failed to download.")
        print("You may need to download them manually from:")
        print("https://naif.jpl.nasa.gov/naif/data.html")
        return 1


if __name__ == "__main__":
    sys.exit(main())