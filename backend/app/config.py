from pydantic_settings import BaseSettings
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Supabase Configuration
    supabase_url: str = ""
    supabase_service_key: str = ""

    # OpenWeatherMap Configuration
    openweathermap_api_key: str = ""

    # CORS Configuration
    frontend_url: str = "http://localhost:5173"
    cors_origins: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000"

    # Environment
    environment: str = "development"

    # API Configuration
    api_prefix: str = "/api"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS origins from comma-separated string if needed
        if isinstance(self.cors_origins, str):
            self.cors_origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        
        # Add frontend_url to CORS origins if not already present
        if self.frontend_url and self.frontend_url not in self.cors_origins:
            self.cors_origins.append(self.frontend_url)


settings = Settings()
