"""
Weather API endpoint with in-memory caching and neighbor lookup
"""

import os
import time
import math
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY")

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
    source: str  # 'api', 'cache', 'neighbor'
    lat: float
    lon: float


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km"""
    R = 6371  # Earth's radius in km

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
        # Skip expired entries
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


async def fetch_weather_from_api(lat: float, lon: float) -> dict:
    """Fetch current weather from OpenWeatherMap"""
    if not OPENWEATHERMAP_API_KEY:
        raise HTTPException(status_code=500, detail="OpenWeatherMap API key not configured")

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHERMAP_API_KEY,
        "units": "metric"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()


def parse_weather_response(data: dict, lat: float, lon: float) -> dict:
    """Parse OpenWeatherMap response into our format"""
    clouds = data.get("clouds", {}).get("all", 0) / 100

    rain = data.get("rain", {}).get("1h", 0)
    snow = data.get("snow", {}).get("1h", 0)
    precipitation = rain + snow

    visibility_m = data.get("visibility", 10000)
    visibility_km = visibility_m / 1000
    fog = max(0, 1 - (visibility_km / 10)) if visibility_km < 10 else 0

    temperature = data.get("main", {}).get("temp", 20)

    return {
        "cloudCover": round(clouds, 2),
        "precipitation": round(precipitation, 2),
        "fog": round(fog, 2),
        "visibility_km": round(visibility_km, 2),
        "temperature_c": round(temperature, 2),
        "lat": lat,
        "lon": lon,
        "timestamp": time.time()
    }


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(lat: float, lon: float):
    """
    Get weather for a specific location.
    Uses in-memory cache with neighbor lookup to minimize API calls.
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

    # Cache miss - fetch from API
    try:
        raw_data = await fetch_weather_from_api(lat, lon)
        parsed = parse_weather_response(raw_data, lat, lon)

        # Store in cache
        weather_cache[key] = {
            'data': parsed,
            'timestamp': now,
            'lat': lat,
            'lon': lon
        }

        return WeatherResponse(**parsed, source='api')

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Weather API error: {str(e)}")


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
