"""
Weather cache refresh script
Fetches weather data from OpenWeatherMap and stores in Supabase
Run via Heroku Scheduler every 6-12 hours
"""

import os
import time
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone

load_dotenv()

# Config
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")  # Use service role key for writes
OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY")
GRID_RESOLUTION = 10  # degrees (10° = ~300 points, fits in free tier)

# Validate config
if not all([SUPABASE_URL, SUPABASE_KEY, OPENWEATHERMAP_API_KEY]):
    print("Error: Missing required environment variables")
    print(f"  SUPABASE_URL: {'set' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_SERVICE_KEY: {'set' if SUPABASE_KEY else 'MISSING'}")
    print(f"  OPENWEATHERMAP_API_KEY: {'set' if OPENWEATHERMAP_API_KEY else 'MISSING'}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_land_grid():
    """
    Generate grid points covering major land masses
    Uses 5-degree resolution, filtered to approximate land areas
    """
    grid_points = []

    # Approximate bounding boxes for populated land areas
    # Format: (lat_min, lat_max, lon_min, lon_max)
    # Focused on populated regions, skipping remote/ocean areas
    land_regions = [
        # North America (continental US, Mexico, southern Canada)
        (25, 55, -130, -70),
        # Central America & Caribbean
        (10, 25, -110, -60),
        # South America (main populated areas)
        (-40, 10, -80, -35),
        # Western Europe
        (35, 60, -10, 25),
        # Eastern Europe
        (40, 60, 20, 45),
        # Africa (northern & sub-saharan)
        (-35, 35, -20, 45),
        # Middle East
        (20, 40, 30, 60),
        # South Asia (India, SE Asia)
        (5, 35, 65, 105),
        # East Asia (China, Japan, Korea)
        (20, 50, 100, 145),
        # Australia (populated coast)
        (-40, -15, 115, 155),
    ]

    for lat_min, lat_max, lon_min, lon_max in land_regions:
        lat = lat_min
        while lat <= lat_max:
            lon = lon_min
            while lon <= lon_max:
                # Round to grid
                lat_grid = round(lat / GRID_RESOLUTION) * GRID_RESOLUTION
                lon_grid = round(lon / GRID_RESOLUTION) * GRID_RESOLUTION

                point = (lat_grid, lon_grid)
                if point not in grid_points:
                    grid_points.append(point)

                lon += GRID_RESOLUTION
            lat += GRID_RESOLUTION

    return grid_points


def fetch_weather(lat: float, lon: float) -> dict | None:
    """Fetch weather from OpenWeatherMap API"""
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": OPENWEATHERMAP_API_KEY,
        "units": "metric"
    }

    try:
        response = httpx.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"  Error fetching weather for ({lat}, {lon}): {e}")
        return None


def parse_weather_data(data: dict) -> dict:
    """Parse OpenWeatherMap response into our cache format"""
    clouds = data.get("clouds", {}).get("all", 0) / 100  # Convert to 0-1

    # Precipitation (rain or snow in last hour)
    rain = data.get("rain", {}).get("1h", 0)
    snow = data.get("snow", {}).get("1h", 0)
    precipitation = rain + snow

    # Visibility (meters to km, estimate fog from low visibility)
    visibility_m = data.get("visibility", 10000)
    visibility_km = visibility_m / 1000
    fog = max(0, 1 - (visibility_km / 10)) if visibility_km < 10 else 0

    # Temperature and humidity
    main = data.get("main", {})
    temperature = main.get("temp", 20)
    humidity = main.get("humidity", 50) / 100

    return {
        "cloud_cover": round(clouds, 2),
        "precipitation": round(precipitation, 2),
        "fog": round(fog, 2),
        "visibility_km": round(visibility_km, 2),
        "temperature_c": round(temperature, 2),
        "humidity": round(humidity, 2),
        "raw_data": data
    }


def upsert_weather(lat_grid: float, lon_grid: float, weather_data: dict):
    """Upsert weather data into Supabase"""
    record = {
        "lat_grid": lat_grid,
        "lon_grid": lon_grid,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **weather_data
    }

    try:
        supabase.table("weather_cache").upsert(
            record,
            on_conflict="lat_grid,lon_grid"
        ).execute()
        return True
    except Exception as e:
        print(f"  Error upserting weather for ({lat_grid}, {lon_grid}): {e}")
        return False


def refresh_weather_cache():
    """Main refresh function"""
    print(f"Starting weather cache refresh at {datetime.now(timezone.utc).isoformat()}")

    grid_points = generate_land_grid()
    print(f"Generated {len(grid_points)} grid points to refresh")

    success_count = 0
    error_count = 0

    for i, (lat, lon) in enumerate(grid_points):
        print(f"[{i+1}/{len(grid_points)}] Fetching weather for ({lat}, {lon})...")

        weather_raw = fetch_weather(lat, lon)
        if weather_raw:
            weather_data = parse_weather_data(weather_raw)
            if upsert_weather(lat, lon, weather_data):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1

        # Rate limiting: OpenWeatherMap free tier allows 60 calls/min
        time.sleep(1.1)  # ~54 calls/min to be safe

    print(f"\nRefresh complete!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total: {len(grid_points)}")


if __name__ == "__main__":
    refresh_weather_cache()
