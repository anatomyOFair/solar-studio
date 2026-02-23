"""
Weather API endpoint using Open-Meteo (free, no API key)
with in-memory caching and neighbor lookup
"""

import time
import math
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# In-memory cache: {cache_key: {data, timestamp, lat, lon}}
weather_cache: dict = {}
CACHE_TTL_SECONDS = 3600  # 1 hour
NEIGHBOR_RADIUS_KM = 50  # Return cached if within 50km


class WeatherResponse(BaseModel):
    cloudCover: float
    precipitation: float
    fog: float
    visibility_km: Optional[float] = None
    temperature_c: Optional[float] = None
    source: str  # 'api', 'cache', 'neighbor', 'forecast'
    lat: float
    lon: float


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km"""
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


def find_nearest_cached(lat: float, lon: float) -> Optional[dict]:
    """Find nearest cached weather within NEIGHBOR_RADIUS_KM"""
    now = time.time()
    nearest = None
    nearest_dist = float('inf')

    for key, entry in list(weather_cache.items()):
        if now - entry['timestamp'] > CACHE_TTL_SECONDS:
            del weather_cache[key]
            continue
        dist = haversine_distance(lat, lon, entry['lat'], entry['lon'])
        if dist < NEIGHBOR_RADIUS_KM and dist < nearest_dist:
            nearest = entry
            nearest_dist = dist

    return nearest


def cache_key(lat: float, lon: float) -> str:
    """Generate cache key rounded to 0.1 degrees"""
    return f"{round(lat, 1)},{round(lon, 1)}"


async def fetch_weather_from_open_meteo(lat: float, lon: float) -> dict:
    """Fetch current weather from Open-Meteo (free, no API key)"""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "cloud_cover,precipitation,temperature_2m",
        "hourly": "visibility",
        "forecast_days": 1,
        "timezone": "UTC",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()


def parse_open_meteo_response(data: dict, lat: float, lon: float) -> dict:
    """Parse Open-Meteo response into our format"""
    current = data.get("current", {})
    cloud_cover = (current.get("cloud_cover", 0) or 0) / 100  # 0-100 -> 0-1
    precipitation = current.get("precipitation", 0) or 0
    temperature = current.get("temperature_2m")

    # Visibility from first hourly entry (current hour)
    hourly = data.get("hourly", {})
    vis_list = hourly.get("visibility", [])
    vis_m = vis_list[0] if vis_list else 10000
    visibility_km = round((vis_m or 10000) / 1000, 2)
    fog = max(0, 1 - (visibility_km / 10)) if visibility_km < 10 else 0

    return {
        "cloudCover": round(cloud_cover, 2),
        "precipitation": round(precipitation, 2),
        "fog": round(fog, 2),
        "visibility_km": visibility_km,
        "temperature_c": round(temperature, 2) if temperature is not None else None,
        "lat": lat,
        "lon": lon,
        "timestamp": time.time()
    }


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(lat: float, lon: float):
    """
    Get weather for a specific location.
    Uses Open-Meteo with in-memory cache and neighbor lookup.
    """
    key = cache_key(lat, lon)
    now = time.time()

    # Check exact cache hit
    if key in weather_cache:
        entry = weather_cache[key]
        if now - entry['timestamp'] < CACHE_TTL_SECONDS:
            return WeatherResponse(**entry['data'], source='cache')

    # Check neighbor cache
    neighbor = find_nearest_cached(lat, lon)
    if neighbor:
        return WeatherResponse(**neighbor['data'], source='neighbor')

    # Cache miss - fetch from Open-Meteo
    try:
        raw_data = await fetch_weather_from_open_meteo(lat, lon)
        parsed = parse_open_meteo_response(raw_data, lat, lon)

        weather_cache[key] = {
            'data': parsed,
            'timestamp': now,
            'lat': lat,
            'lon': lon
        }

        return WeatherResponse(**parsed, source='api')

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather API error: {str(e)}")


@router.get("/weather/forecast", response_model=WeatherResponse)
async def get_weather_forecast(lat: float, lon: float, time_iso: str):
    """
    Get forecast weather for a location and future time.
    Looks up the nearest hourly forecast from weather_forecast table.
    """
    from app.config import settings
    from supabase import create_client

    sb = create_client(settings.supabase_url, settings.supabase_service_key)

    grid_res = 5
    lat_grid = round(lat / grid_res) * grid_res
    lon_grid = round(lon / grid_res) * grid_res

    try:
        result = sb.table("weather_forecast").select(
            "cloud_cover, precipitation, visibility_km, forecast_time"
        ).eq(
            "lat_grid", lat_grid
        ).eq(
            "lon_grid", lon_grid
        ).gte(
            "forecast_time", time_iso
        ).order(
            "forecast_time"
        ).limit(1).execute()

        if result.data and len(result.data) > 0:
            row = result.data[0]
            cloud_cover_frac = (row["cloud_cover"] or 0) / 100
            precipitation = row["precipitation"] or 0
            visibility_km = row["visibility_km"]
            fog = max(0, 1 - (visibility_km / 10)) if visibility_km and visibility_km < 10 else 0

            return WeatherResponse(
                cloudCover=round(cloud_cover_frac, 2),
                precipitation=round(precipitation, 2),
                fog=round(fog, 2),
                visibility_km=visibility_km,
                temperature_c=None,
                source="forecast",
                lat=lat,
                lon=lon,
            )

        raise HTTPException(status_code=404, detail="No forecast data for this location/time")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast lookup error: {str(e)}")


@router.get("/weather/cache-stats")
async def get_cache_stats():
    """Get cache statistics for debugging"""
    now = time.time()
    valid_entries = sum(1 for e in weather_cache.values() if now - e['timestamp'] < CACHE_TTL_SECONDS)
    return {
        "total_entries": len(weather_cache),
        "valid_entries": valid_entries,
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
        "neighbor_radius_km": NEIGHBOR_RADIUS_KM
    }
