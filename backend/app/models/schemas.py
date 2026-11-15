"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator


# Coordinate conventions
class CoordinateConventions(BaseModel):
    latitude_type: str = Field(
        default="planetocentric",
        description="Latitude type: 'planetocentric' or 'planetographic'",
    )
    longitude_convention: str = Field(
        default="east-positive",
        description="Longitude convention: 'east-positive' (0-360) or 'west-positive' (-180 to 180)",
    )

    @field_validator("latitude_type")
    @classmethod
    def validate_lat_type(cls, v):
        if v not in ("planetocentric", "planetographic"):
            raise ValueError("latitude_type must be 'planetocentric' or 'planetographic'")
        return v

    @field_validator("longitude_convention")
    @classmethod
    def validate_lon_conv(cls, v):
        if v not in ("east-positive", "west-positive"):
            raise ValueError("longitude_convention must be 'east-positive' or 'west-positive'")
        return v


# Site models
class SiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    latitude_deg: float = Field(..., ge=-90, le=90)
    longitude_deg: float = Field(..., ge=0, lt=360)
    latitude_type: str = "planetocentric"
    longitude_convention: str = "east-positive"
    elevation_m: Optional[float] = Field(default=None, ge=-10000, le=10000)
    notes: Optional[str] = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    latitude_deg: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude_deg: Optional[float] = Field(default=None, ge=0, lt=360)
    latitude_type: Optional[str] = None
    longitude_convention: Optional[str] = None
    elevation_m: Optional[float] = Field(default=None, ge=-10000, le=10000)
    notes: Optional[str] = None


class SiteResponse(SiteBase):
    site_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Time input
class TimeInput(BaseModel):
    timestamp_utc: str = Field(..., description="ISO 8601 UTC timestamp")
    interval_seconds: Optional[float] = Field(
        default=None, gt=0, description="Interval for time series"
    )
    steps: Optional[int] = Field(default=None, gt=0, le=1000, description="Number of time steps")


# Geometry results
class GeometryResult(BaseModel):
    target: str = Field(..., pattern="^(SUN|EARTH)$")
    azimuth_deg: Optional[float] = None
    elevation_deg: Optional[float] = None
    geometric_visible: Optional[bool] = None
    terrain_visible: Optional[str] = Field(
        default=None, pattern="^(clear|obstructed|unavailable)$"
    )
    units: str = "degrees"
    frame: str
    provenance: Dict[str, Any]


# Analysis models
class AnalysisInput(BaseModel):
    site: SiteCreate
    time: TimeInput
    conventions: Optional[CoordinateConventions] = None


class AnalysisRunResponse(BaseModel):
    analysis_id: str
    site_id: str
    timestamp_utc: str
    created_at_utc: str
    algorithm_version: str
    status: str
    data_mode: str
    input_snapshot: Dict[str, Any]
    geometry_results: List[GeometryResult]
    limitations: List[str]


# Comparison models
class ComparisonWeights(BaseModel):
    sun_elevation: float = Field(default=0.35, ge=0, le=1)
    sun_visibility: float = Field(default=0.25, ge=0, le=1)
    earth_visibility: float = Field(default=0.20, ge=0, le=1)
    terrain_sun: float = Field(default=0.10, ge=0, le=1)
    terrain_earth: float = Field(default=0.10, ge=0, le=1)

    @field_validator("*")
    @classmethod
    def validate_weights_sum(cls, v, info):
        # Note: Sum validation would need model_validator in v2
        return v


class ComparisonInput(BaseModel):
    sites: List[SiteCreate] = Field(..., min_length=2, max_length=4)
    time: TimeInput
    weights: Optional[ComparisonWeights] = None
    conventions: Optional[CoordinateConventions] = None


class ComparisonComponentScores(BaseModel):
    sun_elevation: float
    sun_visibility: float
    earth_visibility: float
    terrain_sun: float
    terrain_earth: float


class ComparisonRanking(BaseModel):
    analysis_id: str
    site_name: str
    score: Optional[float] = None
    rank: Optional[int] = None


class ComparisonResponse(BaseModel):
    comparison_id: str
    analysis_ids: List[str]
    weights: Dict[str, float]
    component_scores: Dict[str, ComparisonComponentScores]
    ranking: List[ComparisonRanking]
    created_at_utc: str


# Export models
class ExportRequest(BaseModel):
    format: str = Field(default="json", pattern="^(json|csv)$")
    analyses: List[str] = Field(..., description="List of analysis IDs to export")
    comparison_id: Optional[str] = None


# AI Explanation
class AIQuestion(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    analysis_id: str


class AIResponse(BaseModel):
    question: str
    answer: str
    analysis_id: str
    grounded: bool = True
    disclaimer: str = "AI explanation grounded in computed metrics only. Does not perform independent calculations."


# Error responses
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None


# Health check
class HealthResponse(BaseModel):
    status: str
    version: str
    spice_kernels_loaded: int
    timestamp: str