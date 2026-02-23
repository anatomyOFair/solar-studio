"""
Weather forecast refresh script
Fetches hourly forecast data from Open-Meteo (free, no API key) and stores in Supabase
Run via Heroku Scheduler daily
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
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
GRID_RESOLUTION = 5  # degrees
FORECAST_DAYS = 5

# Validate config
if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing required environment variables")
    print(f"  SUPABASE_URL: {'set' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_SERVICE_KEY: {'set' if SUPABASE_KEY else 'MISSING'}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_land_grid():
    """
    Generate grid points covering major land masses at 5-degree resolution.
    """
    grid_points = set()

    land_regions = [
        (20, 60, -130, -70),    # North America
        (10, 30, -110, -60),    # Central America & Caribbean
        (-40, 10, -80, -30),    # South America
        (30, 60, -10, 30),      # Western Europe
        (40, 60, 20, 50),       # Eastern Europe
        (-40, 40, -20, 50),     # Africa
        (20, 40, 30, 60),       # Middle East
        (0, 40, 60, 110),       # South Asia
        (20, 50, 100, 150),     # East Asia
        (-40, -10, 110, 160),   # Australia
    ]

    for lat_min, lat_max, lon_min, lon_max in land_regions:
        lat_start = (lat_min // GRID_RESOLUTION) * GRID_RESOLUTION
        if lat_start < lat_min:
            lat_start += GRID_RESOLUTION

        lon_start = (lon_min // GRID_RESOLUTION) * GRID_RESOLUTION
        if lon_start < lon_min:
            lon_start += GRID_RESOLUTION

        lat = lat_start
        while lat <= lat_max:
            lon = lon_start
            while lon <= lon_max:
                grid_points.add((int(lat), int(lon)))
                lon += GRID_RESOLUTION
            lat += GRID_RESOLUTION

    return list(grid_points)


def fetch_forecast(lat: float, lon: float) -> dict | None:
    """Fetch hourly forecast from Open-Meteo (free, no API key required)"""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "cloud_cover,precipitation,visibility",
        "forecast_days": FORECAST_DAYS,
        "timezone": "UTC",
    }

    try:
        response = httpx.get(url, params=params, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"  Error fetching forecast for ({lat}, {lon}): {e}")
        return None


def parse_forecast_rows(data: dict, lat_grid: int, lon_grid: int) -> list[dict]:
    """Parse Open-Meteo hourly response into rows for upsert"""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    cloud_cover = hourly.get("cloud_cover", [])
    precipitation = hourly.get("precipitation", [])
    visibility = hourly.get("visibility", [])

    rows = []
    now = datetime.now(timezone.utc).isoformat()

    for i, time_str in enumerate(times):
        # Open-Meteo returns times like "2024-01-15T00:00"
        forecast_time = time_str + ":00+00:00" if "+" not in time_str else time_str

        cc = cloud_cover[i] if i < len(cloud_cover) else None
        pr = precipitation[i] if i < len(precipitation) else None
        vis_m = visibility[i] if i < len(visibility) else None
        vis_km = round(vis_m / 1000, 2) if vis_m is not None else None

        rows.append({
            "lat_grid": lat_grid,
            "lon_grid": lon_grid,
            "forecast_time": forecast_time,
            "cloud_cover": round(cc, 2) if cc is not None else None,
            "precipitation": round(pr, 2) if pr is not None else None,
            "visibility_km": vis_km,
            "updated_at": now,
        })

    return rows


def upsert_forecast_batch(rows: list[dict]) -> bool:
    """Bulk upsert forecast rows into Supabase"""
    if not rows:
        return True

    try:
        supabase.table("weather_forecast").upsert(
            rows,
            on_conflict="lat_grid,lon_grid,forecast_time"
        ).execute()
        return True
    except Exception as e:
        print(f"  Error upserting forecast batch: {e}")
        return False


def cleanup_old_forecasts():
    """Delete forecast rows older than 24 hours in the past"""
    try:
        cutoff = datetime.now(timezone.utc).isoformat()
        supabase.table("weather_forecast").delete().lt(
            "forecast_time", cutoff
        ).execute()
        print("Cleaned up past forecast entries")
    except Exception as e:
        print(f"  Error cleaning up old forecasts: {e}")


def refresh_forecast():
    """Main refresh function"""
    print(f"Starting forecast refresh at {datetime.now(timezone.utc).isoformat()}")
    print(f"Forecast days: {FORECAST_DAYS}")

    grid_points = generate_land_grid()
    print(f"Generated {len(grid_points)} grid points to refresh")

    # Clean up old data first
    cleanup_old_forecasts()

    success_count = 0
    error_count = 0

    for i, (lat, lon) in enumerate(grid_points):
        print(f"[{i+1}/{len(grid_points)}] Fetching forecast for ({lat}, {lon})...")

        forecast_raw = fetch_forecast(lat, lon)
        if forecast_raw:
            rows = parse_forecast_rows(forecast_raw, lat, lon)
            if upsert_forecast_batch(rows):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1

        # Be polite — Open-Meteo is free, no strict rate limit but don't hammer it
        time.sleep(0.5)

    print(f"\nForecast refresh complete!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total: {len(grid_points)}")


if __name__ == "__main__":
    refresh_forecast()
