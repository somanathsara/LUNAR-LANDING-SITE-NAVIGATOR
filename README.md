# Lunar Landing Site Navigator

A scientific decision-support prototype for exploring lunar landing-site candidates and comparing Sun/Earth geometry at selected locations and times.

![Lunar Landing Site Navigator](docs/screenshot.png)

## Overview

This application helps users analyze lunar landing site candidates by computing:
- **Sun geometry**: Azimuth, elevation, geometric & terrain visibility
- **Earth geometry**: Azimuth, elevation, geometric & terrain visibility
- **Site comparison**: Transparent scoring across multiple candidates
- **AI explanations**: Grounded interpretations of computed results
- **Data export**: JSON/CSV with full provenance metadata

## Key Features

- 🌙 **Interactive 3D Moon visualization** with site markers and Sun/Earth vectors
- 📐 **SPICE-based geometry calculations** using NAIF kernels via SpiceyPy
- ⚖️ **Multi-site comparison** with configurable scoring weights
- 🤖 **AI-powered explanations** grounded in validated computations
- 📊 **Responsive dashboard** with mission-control aesthetic
- 📤 **Export capabilities** (JSON/CSV) with full provenance
- ⚠️ **Transparent limitations** — all synthetic data clearly labeled

## Data Sources

- **SPICE Kernels**: NAIF (JPL) — [de440.bsp](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/), [pck00010.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/), [moon_080317.tf](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/), [moon_pa_de421_1900-2050.bpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/), [naif0012.tls](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/)
- **Lunar Topography**: LROC LOLA DEM via [LROC QuickMap](https://quickmap.lroc.im-ldi.com/)
- **Mission Context**: [NASA Moon Trek](https://trek.nasa.gov/moon/), [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), [CSA Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/)

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **SPICE kernels** (auto-downloaded via script)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download SPICE kernels
python scripts/download_kernels.py

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` with API docs at `http://localhost:8000/docs`

### Full Stack (Docker)

```bash
docker-compose up --build
```

## Project Structure

```
lunar-landing-site-navigator/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── data/            # Demo data
│   │   └── styles/          # CSS styles
│   └── package.json
├── backend/                  # Python FastAPI
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── models/          # Pydantic models
│   │   ├── services/        # Business logic (SPICE)
│   │   └── core/            # Configuration
│   ├── scripts/             # Utility scripts
│   └── requirements.txt
├── data/                     # Data directory (gitignored)
│   ├── kernels/             # SPICE kernels
│   ├── dem/                 # DEM files
│   └── cache/               # Computation cache
└── docs/                     # Documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/sites` | List candidate sites |
| POST | `/api/v1/sites` | Create new site |
| GET | `/api/v1/sites/{id}` | Get site details |
| POST | `/api/v1/analyze` | Analyze single site |
| POST | `/api/v1/analyze/time-series` | Time series analysis |
| POST | `/api/v1/compare` | Compare multiple sites |
| POST | `/api/v1/ai/explain` | AI explanation |
| POST | `/api/v1/export` | Export results (JSON/CSV) |

## Scientific Methodology

### Coordinate Conventions

- **Latitude**: Planetocentric (angle from equatorial plane to radius vector)
- **Longitude**: East-positive (0-360°, increases eastward from prime meridian)
- **Reference Frame**: Moon Mean Earth/Polar Axis (ME), IAU 2015
- **Lunar Radius**: 1737.4 km (IAU 2015)

### Geometry Workflow

1. Parse UTC timestamp → SPICE Ephemeris Time (ET)
2. Resolve site in Moon-fixed frame (ME) with IAU 2015 radius
3. Compute Sun/Earth direction vectors via SPICE `spkpos`
4. Transform to local topocentric frame (East, North, Up)
5. Derive azimuth (0°=North, +East) and elevation (horizon=0°)
6. Geometric visibility: elevation > 0°
7. Terrain visibility: Requires DEM ray-tracing (not yet implemented)

### Limitations

- Terrain visibility requires LOLA DEM integration (planned)
- Earth libration computed from SPICE, not approximated
- No uncertainty quantification in current prototype
- Single timestamp analysis — no annual illumination profiles
- **DEMO DATA**: Synthetic approximations for interface demonstration

## Development

### Frontend Commands

```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint
```

### Backend Commands

```bash
cd backend
uvicorn app.main:app --reload    # Development server
pytest                           # Run tests
black .                          # Format code
ruff check .                     # Lint
```

### Environment Variables

Backend (`.env`):
```env
SPICE_KERNEL_DIR=./data/kernels
DEBUG=true
CORS_ORIGINS=["http://localhost:3000"]
```

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Deployment

### Frontend (Static Hosting)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

### Backend (Container)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python scripts/download_kernels.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License — See LICENSE file for details.

## Disclaimer

**This is a scientific prototype, not flight software.** 

- Not certified for landing safety
- Not a navigation system
- Not a complete power/communications predictor
- All results must be independently validated for mission use

## Acknowledgments

- NASA NAIF/SPICE team for ephemeris tools
- LROC team for lunar topography data
- JPL Horizons for ephemeris reference
- Canadian Space Agency for lunar exploration resources
- Open source contributors: React Three Fiber, Recharts, FastAPI, SpiceyPy