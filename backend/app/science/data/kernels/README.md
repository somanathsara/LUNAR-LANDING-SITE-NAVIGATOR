# SPICE kernels (not committed; large)

Download from https://naif.jpl.nasa.gov/naif/data.html and place here. Record the exact versions you use.

| File | Purpose | NAIF folder |
|---|---|---|
| naif0012.tls | leap seconds | kernels/lsk |
| pck00011.tpc | body constants | kernels/pck |
| de440s.bsp | Sun/Earth/Moon ephemeris (1849-2150) | kernels/spk/planets |
| moon_080317.tf | MOON_ME / MOON_PA frames | kernels/fk/satellites |
| moon_pa_de440_200625.bpc | lunar orientation | kernels/pck |

Or drop a single meta-kernel (`*.tm`) in this folder. Set `SPICE_KERNEL_DIR=../data/kernels` in backend/.env.
