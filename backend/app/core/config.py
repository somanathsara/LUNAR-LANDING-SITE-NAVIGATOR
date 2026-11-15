"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Lunar Landing Site Navigator"
    app_version: str = "0.1.0"
    debug: bool = True
    environment: str = "development"

    # API
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # Paths
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    data_dir: Path = Field(default=Path("./data"))
    kernel_dir: Path = Field(default=Path("./data/kernels"))
    dem_dir: Path = Field(default=Path("./data/dem"))
    cache_dir: Path = Field(default=Path("./data/cache"))

    # SPICE Kernels (comma-separated filenames)
    spice_kernels: str = "de440.bsp,pck00010.tpc,moon_080317.tf,moon_pa_de421_1900-2050.bpc,naif0012.tls"

    # External APIs
    jpl_horizons_api_url: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
    lroc_quickmap_api_url: str = "https://quickmap.lroc.im-ldi.com"
    moon_trek_api_url: str = "https://trek.nasa.gov/moon"

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30

    @property
    def kernel_list(self) -> List[str]:
        """Get list of kernel filenames."""
        return [k.strip() for k in self.spice_kernels.split(",") if k.strip()]

    @property
    def kernel_paths(self) -> List[Path]:
        """Get full paths to kernel files."""
        return [self.kernel_dir / k for k in self.kernel_list]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()