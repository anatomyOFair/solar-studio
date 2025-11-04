from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime
from typing import Optional


# Celestial Object Types
CelestialObjectType = Literal['moon', 'planet', 'satellite', 'star', 'asteroid', 'spacecraft']


class Position(BaseModel):
    """Position coordinates"""
    lat: float = Field(..., description="Latitude in degrees", ge=-90, le=90)
    lon: float = Field(..., description="Longitude in degrees", ge=-180, le=180)
    altitude: float = Field(..., description="Altitude in kilometers above sea level", ge=0)


class CelestialObject(BaseModel):
    """Celestial object representation"""
    id: Optional[str] = Field(None, description="Unique identifier")
    name: str = Field(..., description="Name of the celestial object")
    type: CelestialObjectType = Field(..., description="Type of celestial object")
    position: Position = Field(..., description="Position of the celestial object")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Sun",
                "type": "star",
                "position": {
                    "lat": 0.0,
                    "lon": 0.0,
                    "altitude": 0.0
                }
            }
        }


class WeatherConditions(BaseModel):
    """Weather conditions affecting visibility"""
    cloud_cover: float = Field(..., description="Cloud cover (0-1), percentage of sky covered", ge=0, le=1)
    precipitation: float = Field(..., description="Precipitation in mm/h", ge=0)
    fog: float = Field(..., description="Fog visibility reduction factor (0-1)", ge=0, le=1)
    extinction_coeff: float = Field(..., description="Atmospheric extinction coefficient", ge=0)


class VisibilityData(BaseModel):
    """Visibility calculation results"""
    percentage: float = Field(..., description="Overall visibility percentage (0-100)", ge=0, le=100)
    weather_rating: int = Field(..., description="Weather impact rating (1-10)", ge=1, le=10)
    time_rating: int = Field(..., description="Time/light rating (1-10)", ge=1, le=10)


# Request/Response Models for API endpoints

class VisibilityCalculationRequest(BaseModel):
    """Request model for visibility calculation"""
    observer_position: Position
    target_position: Position
    weather_conditions: WeatherConditions
    current_time: Optional[datetime] = Field(default_factory=datetime.now)


class VisibilityCalculationResponse(BaseModel):
    """Response model for visibility calculation"""
    visibility_data: VisibilityData
    distance_km: float
    max_los_distance_km: float
    weather_limit_km: float


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    database: str
    environment: str
