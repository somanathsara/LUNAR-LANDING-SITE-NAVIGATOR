"""API routes for Lunar Landing Site Navigator."""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.models.schemas import (
    SiteCreate,
    SiteResponse,
    SiteUpdate,
    TimeInput,
    AnalysisInput,
    AnalysisRunResponse,
    ComparisonInput,
    ComparisonResponse,
    ExportRequest,
    AIQuestion,
    AIResponse,
    HealthResponse,
    ErrorResponse,
)
from app.services.spice_service import SpiceService, get_spice_service

router = APIRouter()

# In-memory storage (replace with database in production)
sites_db: dict = {}
analyses_db: dict = {}
comparisons_db: dict = {}


# Demo sites for initial data
DEMO_SITES = [
    {
        "site_id": "shackleton-crater",
        "name": "Shackleton Crater Rim",
        "latitude_deg": -89.9,
        "longitude_deg": 0.0,
        "latitude_type": "planetocentric",
        "longitude_convention": "east-positive",
        "elevation_m": 1200,
        "notes": "Near-continuous illumination on rim; PSR in crater floor. Artemis III candidate region.",
    },
    {
        "site_id": "connecting-ridge",
        "name": "Connecting Ridge",
        "latitude_deg": -89.4,
        "longitude_deg": 120.0,
        "latitude_type": "planetocentric",
        "longitude_convention": "east-positive",
        "elevation_m": 850,
        "notes": "High illumination fraction; direct Earth visibility. Between Shackleton and de Gerlache.",
    },
    {
        "site_id": "de-gerlache-rim",
        "name": "de Gerlache Crater Rim",
        "latitude_deg": -88.5,
        "longitude_deg": 300.0,  # -60 converted to east-positive
        "latitude_type": "planetocentric",
        "longitude_convention": "east-positive",
        "elevation_m": 950,
        "notes": "Favorable illumination; potential water ice access. Near Connecting Ridge.",
    },
    {
        "site_id": "malapert-massif",
        "name": "Malapert Massif",
        "latitude_deg": -86.0,
        "longitude_deg": 0.0,
        "latitude_type": "planetocentric",
        "longitude_convention": "east-positive",
        "elevation_m": 5000,
        "notes": "High elevation peak; near-continuous Earth visibility; strong comm relay potential.",
    },
    {
        "site_id": "cabeus-crater",
        "name": "Cabeus Crater (LCROSS Impact)",
        "latitude_deg": -84.9,
        "longitude_deg": 324.5,  # -35.5 converted
        "latitude_type": "planetocentric",
        "longitude_convention": "east-positive",
        "elevation_m": 300,
        "notes": "LCROSS impact site; confirmed water ice detection; deep PSR environment.",
    },
]


def init_demo_sites():
    """Initialize demo sites in memory."""
    for site_data in DEMO_SITES:
        site_id = site_data["site_id"]
        now = datetime.utcnow().isoformat() + "Z"
        sites_db[site_id] = {
            **site_data,
            "created_at": now,
            "updated_at": now,
        }


# Initialize on import
init_demo_sites()


@router.get("/health", response_model=HealthResponse)
async def health_check(spice: SpiceService = Depends(get_spice_service)):
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        spice_kernels_loaded=len(spice._kernel_ids),
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


# Site endpoints
@router.get("/sites", response_model=List[SiteResponse])
async def list_sites():
    """List all candidate landing sites."""
    return [SiteResponse(**site) for site in sites_db.values()]


@router.get("/sites/{site_id}", response_model=SiteResponse)
async def get_site(site_id: str):
    """Get a specific site by ID."""
    if site_id not in sites_db:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    return SiteResponse(**sites_db[site_id])


@router.post("/sites", response_model=SiteResponse, status_code=201)
async def create_site(site: SiteCreate):
    """Create a new candidate site."""
    site_id = site.name.lower().replace(" ", "-").replace("'", "")
    # Ensure unique ID
    base_id = site_id
    counter = 1
    while site_id in sites_db:
        site_id = f"{base_id}-{counter}"
        counter += 1

    now = datetime.utcnow().isoformat() + "Z"
    site_data = {
        "site_id": site_id,
        **site.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    sites_db[site_id] = site_data
    return SiteResponse(**site_data)


@router.patch("/sites/{site_id}", response_model=SiteResponse)
async def update_site(site_id: str, site_update: SiteUpdate):
    """Update an existing site."""
    if site_id not in sites_db:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")

    site_data = sites_db[site_id]
    update_data = site_update.model_dump(exclude_unset=True)
    site_data.update(update_data)
    site_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
    return SiteResponse(**site_data)


@router.delete("/sites/{site_id}", status_code=204)
async def delete_site(site_id: str):
    """Delete a site."""
    if site_id not in sites_db:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    del sites_db[site_id]


# Analysis endpoints
@router.post("/analyze", response_model=AnalysisRunResponse)
async def analyze_site(
    request: Request,
    input_data: AnalysisInput,
    spice: SpiceService = Depends(get_spice_service),
):
    """Analyze a single site at a given time."""
    site = input_data.site
    time = input_data.time
    conventions = input_data.conventions

    # Validate timestamp format
    try:
        datetime.fromisoformat(time.timestamp_utc.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO 8601 UTC.")

    # Use conventions from request or site
    lat_type = conventions.latitude_type if conventions else site.latitude_type
    lon_conv = conventions.longitude_convention if conventions else site.longitude_convention

    # Run SPICE computation
    try:
        result = spice.compute_geometry(
            site_id=site.name.lower().replace(" ", "-"),
            latitude_deg=site.latitude_deg,
            longitude_deg=site.longitude_deg,
            elevation_m=site.elevation_m or 0.0,
            timestamp_utc=time.timestamp_utc,
            latitude_type=lat_type,
            longitude_convention=lon_conv,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SPICE computation failed: {str(e)}")

    # Build response
    analysis_id = f"analysis-{uuid.uuid4().hex[:12]}"
    analysis = {
        "analysis_id": analysis_id,
        "site_id": site.name.lower().replace(" ", "-"),
        "timestamp_utc": time.timestamp_utc,
        "created_at_utc": datetime.utcnow().isoformat() + "Z",
        "algorithm_version": result.algorithm_version,
        "status": "completed",
        "data_mode": "LIVE",
        "input_snapshot": {
            "site": site.model_dump(),
            "time": time.model_dump(),
        },
        "geometry_results": [
            {
                "target": result.sun.target,
                "azimuth_deg": result.sun.azimuth_deg,
                "elevation_deg": result.sun.elevation_deg,
                "geometric_visible": result.sun.geometric_visible,
                "terrain_visible": result.sun.terrain_visible,
                "units": result.sun.units,
                "frame": result.sun.frame,
                "provenance": result.sun.provenance,
            },
            {
                "target": result.earth.target,
                "azimuth_deg": result.earth.azimuth_deg,
                "elevation_deg": result.earth.elevation_deg,
                "geometric_visible": result.earth.geometric_visible,
                "terrain_visible": result.earth.terrain_visible,
                "units": result.earth.units,
                "frame": result.earth.frame,
                "provenance": result.earth.provenance,
            },
        ],
        "limitations": result.limitations,
    }

    analyses_db[analysis_id] = analysis
    return AnalysisRunResponse(**analysis)


@router.post("/analyze/time-series", response_model=List[AnalysisRunResponse])
async def analyze_time_series(
    input_data: AnalysisInput,
    spice: SpiceService = Depends(get_spice_service),
):
    """Analyze a site over a time series."""
    site = input_data.site
    time = input_data.time
    conventions = input_data.conventions

    if not time.interval_seconds or not time.steps:
        raise HTTPException(
            status_code=400,
            detail="interval_seconds and steps required for time series"
        )

    if time.steps > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 steps allowed")

    lat_type = conventions.latitude_type if conventions else site.latitude_type
    lon_conv = conventions.longitude_convention if conventions else site.longitude_convention

    try:
        results = spice.compute_time_series(
            site_id=site.name.lower().replace(" ", "-"),
            latitude_deg=site.latitude_deg,
            longitude_deg=site.longitude_deg,
            elevation_m=site.elevation_m or 0.0,
            start_utc=time.timestamp_utc,
            interval_seconds=time.interval_seconds,
            steps=time.steps,
            latitude_type=lat_type,
            longitude_convention=lon_conv,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SPICE computation failed: {str(e)}")

    analyses = []
    for result in results:
        analysis_id = f"analysis-{uuid.uuid4().hex[:12]}"
        analysis = {
            "analysis_id": analysis_id,
            "site_id": result.site_id,
            "timestamp_utc": result.timestamp_utc,
            "created_at_utc": datetime.utcnow().isoformat() + "Z",
            "algorithm_version": result.algorithm_version,
            "status": "completed",
            "data_mode": "LIVE",
            "input_snapshot": {
                "site": site.model_dump(),
                "time": time.model_dump(),
            },
            "geometry_results": [
                {
                    "target": result.sun.target,
                    "azimuth_deg": result.sun.azimuth_deg,
                    "elevation_deg": result.sun.elevation_deg,
                    "geometric_visible": result.sun.geometric_visible,
                    "terrain_visible": result.sun.terrain_visible,
                    "units": result.sun.units,
                    "frame": result.sun.frame,
                    "provenance": result.sun.provenance,
                },
                {
                    "target": result.earth.target,
                    "azimuth_deg": result.earth.azimuth_deg,
                    "elevation_deg": result.earth.elevation_deg,
                    "geometric_visible": result.earth.geometric_visible,
                    "terrain_visible": result.earth.terrain_visible,
                    "units": result.earth.units,
                    "frame": result.earth.frame,
                    "provenance": result.earth.provenance,
                },
            ],
            "limitations": result.limitations,
        }
        analyses_db[analysis_id] = analysis
        analyses.append(AnalysisRunResponse(**analysis))

    return analyses


@router.get("/analyses/{analysis_id}", response_model=AnalysisRunResponse)
async def get_analysis(analysis_id: str):
    """Get a specific analysis by ID."""
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
    return AnalysisRunResponse(**analyses_db[analysis_id])


# Comparison endpoints
@router.post("/compare", response_model=ComparisonResponse)
async def compare_sites(
    input_data: ComparisonInput,
    spice: SpiceService = Depends(get_spice_service),
):
    """Compare multiple sites at a common timestamp."""
    if len(input_data.sites) < 2:
        raise HTTPException(status_code=400, detail="At least 2 sites required for comparison")
    if len(input_data.sites) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 sites for comparison")

    conventions = input_data.conventions
    weights = input_data.weights or {
        "sun_elevation": 0.35,
        "sun_visibility": 0.25,
        "earth_visibility": 0.20,
        "terrain_sun": 0.10,
        "terrain_earth": 0.10,
    }

    analyses = []
    for site in input_data.sites:
        lat_type = conventions.latitude_type if conventions else site.latitude_type
        lon_conv = conventions.longitude_convention if conventions else site.longitude_convention

        try:
            result = spice.compute_geometry(
                site_id=site.name.lower().replace(" ", "-"),
                latitude_deg=site.latitude_deg,
                longitude_deg=site.longitude_deg,
                elevation_m=site.elevation_m or 0.0,
                timestamp_utc=input_data.time.timestamp_utc,
                latitude_type=lat_type,
                longitude_convention=lon_conv,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SPICE computation failed for {site.name}: {str(e)}")

        analysis_id = f"analysis-{uuid.uuid4().hex[:12]}"
        analysis = {
            "analysis_id": analysis_id,
            "site_id": site.name.lower().replace(" ", "-"),
            "timestamp_utc": input_data.time.timestamp_utc,
            "created_at_utc": datetime.utcnow().isoformat() + "Z",
            "algorithm_version": result.algorithm_version,
            "status": "completed",
            "data_mode": "LIVE",
            "input_snapshot": {
                "site": site.model_dump(),
                "time": input_data.time.model_dump(),
            },
            "geometry_results": [
                {
                    "target": result.sun.target,
                    "azimuth_deg": result.sun.azimuth_deg,
                    "elevation_deg": result.sun.elevation_deg,
                    "geometric_visible": result.sun.geometric_visible,
                    "terrain_visible": result.sun.terrain_visible,
                    "units": result.sun.units,
                    "frame": result.sun.frame,
                    "provenance": result.sun.provenance,
                },
                {
                    "target": result.earth.target,
                    "azimuth_deg": result.earth.azimuth_deg,
                    "elevation_deg": result.earth.elevation_deg,
                    "geometric_visible": result.earth.geometric_visible,
                    "terrain_visible": result.earth.terrain_visible,
                    "units": result.earth.units,
                    "frame": result.earth.frame,
                    "provenance": result.earth.provenance,
                },
            ],
            "limitations": result.limitations,
        }
        analyses_db[analysis_id] = analysis
        analyses.append(analysis)

    # Compute comparison scores
    component_scores = {}
    ranking = []

    for analysis in analyses:
        sun = next(r for r in analysis["geometry_results"] if r["target"] == "SUN")
        earth = next(r for r in analysis["geometry_results"] if r["target"] == "EARTH")

        scores = {
            "sun_elevation": max(0, (sun["elevation_deg"] or 0) + 10) / 100 if sun["elevation_deg"] else 0,
            "sun_visibility": 1.0 if sun["geometric_visible"] else 0.0,
            "earth_visibility": 1.0 if earth["geometric_visible"] else 0.0,
            "terrain_sun": 1.0 if sun["terrain_visible"] == "clear" else (0.0 if sun["terrain_visible"] == "obstructed" else 0.5),
            "terrain_earth": 1.0 if earth["terrain_visible"] == "clear" else (0.0 if earth["terrain_visible"] == "obstructed" else 0.5),
        }
        component_scores[analysis["analysis_id"]] = scores

        total = sum(scores[k] * weights[k] for k in weights)
        ranking.append({
            "analysis_id": analysis["analysis_id"],
            "site_name": analysis["input_snapshot"]["site"]["name"],
            "score": round(total, 4),
            "rank": 0,
        })

    ranking.sort(key=lambda x: x["score"] or 0, reverse=True)
    for i, item in enumerate(ranking):
        item["rank"] = i + 1

    comparison_id = f"comparison-{uuid.uuid4().hex[:12]}"
    comparison = {
        "comparison_id": comparison_id,
        "analysis_ids": [a["analysis_id"] for a in analyses],
        "weights": weights,
        "component_scores": component_scores,
        "ranking": ranking,
        "created_at_utc": datetime.utcnow().isoformat() + "Z",
    }
    comparisons_db[comparison_id] = comparison

    return ComparisonResponse(**comparison)


@router.get("/comparisons/{comparison_id}", response_model=ComparisonResponse)
async def get_comparison(comparison_id: str):
    """Get a specific comparison by ID."""
    if comparison_id not in comparisons_db:
        raise HTTPException(status_code=404, detail=f"Comparison {comparison_id} not found")
    return ComparisonResponse(**comparisons_db[comparison_id])


# AI Explanation endpoint
@router.post("/ai/explain", response_model=AIResponse)
async def ai_explain(question: AIQuestion):
    """Get AI explanation grounded in analysis results."""
    if question.analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail=f"Analysis {question.analysis_id} not found")

    analysis = analyses_db[question.analysis_id]
    sun = next(r for r in analysis["geometry_results"] if r["target"] == "SUN")
    earth = next(r for r in analysis["geometry_results"] if r["target"] == "EARTH")

    # Generate grounded response (simplified - would use LLM in production)
    q_lower = question.question.lower()

    if "sun" in q_lower and "elevation" in q_lower:
        answer = f"The Sun elevation at {analysis['input_snapshot']['site']['name']} is {sun['elevation_deg']:.1f}°. "
        if sun['elevation_deg'] and sun['elevation_deg'] < 5:
            answer += "This low elevation is typical for polar regions where the Sun remains near the horizon. "
        answer += f"Geometric visibility: {'Yes' if sun['geometric_visible'] else 'No'}. Terrain: {sun['terrain_visible']}."
    elif "earth" in q_lower and "visible" in q_lower:
        answer = f"Earth elevation: {earth['elevation_deg']:.1f}°. "
        answer += f"Geometric visibility: {'Yes' if earth['geometric_visible'] else 'No'}. "
        answer += "Earth visibility enables direct-to-Earth communications when above horizon."
    elif "terrain" in q_lower:
        answer = f"Terrain visibility - Sun: {sun['terrain_visible']}, Earth: {earth['terrain_visible']}. "
        answer += "Terrain obstruction means local topography blocks line-of-sight. "
        answer += "DEM data required for accurate terrain analysis (currently unavailable)."
    elif "limitation" in q_lower:
        answer = "Key limitations: " + "; ".join(analysis["limitations"])
    else:
        answer = (
            f"Analysis for {analysis['input_snapshot']['site']['name']} at {analysis['timestamp_utc']}:\n\n"
            f"Sun: Az={sun['azimuth_deg']:.1f}°, El={sun['elevation_deg']:.1f}° "
            f"({'Visible' if sun['geometric_visible'] else 'Obstructed'} geometrically, {sun['terrain_visible']} terrain)\n"
            f"Earth: Az={earth['azimuth_deg']:.1f}°, El={earth['elevation_deg']:.1f}° "
            f"({'Visible' if earth['geometric_visible'] else 'Obstructed'} geometrically, {earth['terrain_visible']} terrain)\n\n"
            f"Limitations: {'; '.join(analysis['limitations'])}"
        )

    return AIResponse(
        question=question.question,
        answer=answer,
        analysis_id=question.analysis_id,
    )


# Export endpoint
@router.post("/export")
async def export_data(request: ExportRequest):
    """Export analyses and optionally comparison data."""
    # Validate analysis IDs
    for aid in request.analyses:
        if aid not in analyses_db:
            raise HTTPException(status_code=404, detail=f"Analysis {aid} not found")

    export_analyses = [analyses_db[aid] for aid in request.analyses]
    comparison = comparisons_db.get(request.comparison_id) if request.comparison_id else None

    if request.format == "json":
        import json
        data = {
            "format": "json",
            "analyses": export_analyses,
            "comparison": comparison,
            "metadata": {
                "exported_at_utc": datetime.utcnow().isoformat() + "Z",
                "application_version": "0.1.0",
                "disclaimer": "DEMO/SYNTHETIC DATA — Not validated for mission use",
            },
        }
        return JSONResponse(content=data, headers={
            "Content-Disposition": f'attachment; filename="lunar-export-{datetime.utcnow().strftime("%Y%m%d-%H%M%S")}.json"'
        })
    else:
        # CSV export
        import io
        output = io.StringIO()
        headers = [
            "analysis_id", "site_id", "site_name", "timestamp_utc",
            "latitude_deg", "longitude_deg", "latitude_type", "longitude_convention",
            "elevation_m", "algorithm_version", "data_mode",
            "sun_azimuth_deg", "sun_elevation_deg", "sun_geometric_visible", "sun_terrain_visible",
            "earth_azimuth_deg", "earth_elevation_deg", "earth_geometric_visible", "earth_terrain_visible",
            "frame", "units", "limitations",
        ]
        output.write(",".join(headers) + "\n")

        for analysis in export_analyses:
            sun = next(r for r in analysis["geometry_results"] if r["target"] == "SUN")
            earth = next(r for r in analysis["geometry_results"] if r["target"] == "EARTH")
            site = analysis["input_snapshot"]["site"]

            row = [
                analysis["analysis_id"],
                site["site_id"],
                site["name"],
                analysis["timestamp_utc"],
                str(site["latitude_deg"]),
                str(site["longitude_deg"]),
                site["latitude_type"],
                site["longitude_convention"],
                str(site.get("elevation_m", "")),
                analysis["algorithm_version"],
                analysis["data_mode"],
                str(sun.get("azimuth_deg", "")),
                str(sun.get("elevation_deg", "")),
                str(sun.get("geometric_visible", "")),
                sun.get("terrain_visible", ""),
                str(earth.get("azimuth_deg", "")),
                str(earth.get("elevation_deg", "")),
                str(earth.get("geometric_visible", "")),
                earth.get("terrain_visible", ""),
                sun.get("frame", ""),
                sun.get("units", ""),
                f'"{"; ".join(analysis["limitations"])}"',
            ]
            output.write(",".join(f'"{v}"' for v in row) + "\n")

        if comparison:
            output.write("\n# COMPARISON RANKING\n")
            output.write("rank,analysis_id,site_name,score\n")
            for item in comparison["ranking"]:
                output.write(f'{item["rank"]},{item["analysis_id"]},"{item["site_name"]}",{item["score"] or ""}\n')

        return JSONResponse(
            content={"csv": output.getvalue()},
            headers={
                "Content-Disposition": f'attachment; filename="lunar-export-{datetime.utcnow().strftime("%Y%m%d-%H%M%S")}.csv"'
            }
        )