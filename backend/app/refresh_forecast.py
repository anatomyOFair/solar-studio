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
from datetime import datetime, timezone, timedelta

load_dotenv()

# Config
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
GRID_RESOLUTION = 3  # degrees
BATCH_SIZE = 50  # locations per API call
FORECAST_DAYS = 5

# Validate config
if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing required environment variables")
    print(f"  SUPABASE_URL: {'set' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_SERVICE_KEY: {'set' if SUPABASE_KEY else 'MISSING'}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_global_grid():
    """
    Generate grid points covering the entire globe at GRID_RESOLUTION spacing.
    """
    grid_points = []
    lat = -84  # Leaflet Mercator clips at ~85°, skip poles
    while lat <= 84:
        lon = -180
        while lon <= 180:
            grid_points.append((lat, lon))
            lon += GRID_RESOLUTION
        lat += GRID_RESOLUTION
    return grid_points


def fetch_forecast_batch(points: list[tuple[int, int]], max_retries: int = 5) -> list[tuple[tuple[int, int], dict]] | None:
    """Fetch hourly forecast for multiple locations in one API call, with retry on 429"""
    url = "https://api.open-meteo.com/v1/forecast"
    lats = ",".join(str(p[0]) for p in points)
    lons = ",".join(str(p[1]) for p in points)
    params = {
        "latitude": lats,
        "longitude": lons,
        "hourly": "cloud_cover,precipitation,visibility",
        "forecast_days": FORECAST_DAYS,
        "timezone": "UTC",
    }

    # Aggressive backoff: 30s, 60s, 120s, 240s, 480s — survives hourly limit resets
    RETRY_WAITS = [30, 60, 120, 240, 480]

    for attempt in range(max_retries):
        try:
            response = httpx.get(url, params=params, timeout=30)
            if response.status_code == 429:
                wait = RETRY_WAITS[min(attempt, len(RETRY_WAITS) - 1)]
                print(f"  Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()

            if isinstance(data, dict):
                return [(points[0], data)]

            return [(points[i], d) for i, d in enumerate(data)]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < max_retries - 1:
                wait = RETRY_WAITS[min(attempt, len(RETRY_WAITS) - 1)]
                print(f"  Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait)
                continue
            print(f"  Error fetching batch of {len(points)} points: {e}")
            return None
        except Exception as e:
            print(f"  Error fetching batch of {len(points)} points: {e}")
            return None

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


def upsert_forecast_batch(rows: list[dict], max_retries: int = 3) -> bool:
    """Bulk upsert forecast rows into Supabase, with retry on transient errors"""
    if not rows:
        return True

    for attempt in range(max_retries):
        try:
            supabase.table("weather_forecast").upsert(
                rows,
                on_conflict="lat_grid,lon_grid,forecast_time"
            ).execute()
            return True
        except Exception as e:
            err_str = str(e).lower()
            is_transient = "ssl" in err_str or "connection" in err_str or "timeout" in err_str
            if is_transient and attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  Transient error upserting, retrying in {wait}s (attempt {attempt+1}/{max_retries}): {e}")
                time.sleep(wait)
                continue
            print(f"  Error upserting forecast batch: {e}")
            return False
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


def get_fresh_grid_points() -> set[tuple[float, float]]:
    """Query Supabase for grid points that already have forecast data 2+ days out."""
    fresh = set()
    cutoff = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    try:
        # Grid points with at least one forecast row beyond 2 days from now
        offset = 0
        page_size = 1000
        while True:
            result = supabase.table("weather_forecast") \
                .select("lat_grid, lon_grid") \
                .gte("forecast_time", cutoff) \
                .range(offset, offset + page_size - 1) \
                .execute()
            if not result.data:
                break
            for row in result.data:
                fresh.add((float(row["lat_grid"]), float(row["lon_grid"])))
            if len(result.data) < page_size:
                break
            offset += page_size
    except Exception as e:
        print(f"  Warning: could not check fresh grid points: {e}")
    return fresh


def refresh_forecast():
    """Main refresh function"""
    print(f"Starting forecast refresh at {datetime.now(timezone.utc).isoformat()}")
    print(f"Forecast days: {FORECAST_DAYS}")

    grid_points = generate_global_grid()
    print(f"Generated {len(grid_points)} total grid points")

    # Clean up old data first
    cleanup_old_forecasts()

    # Skip locations that already have fresh forecast data (2+ days out)
    fresh = get_fresh_grid_points()
    if fresh:
        grid_points = [p for p in grid_points if p not in fresh]
        print(f"Skipping {len(fresh)} grid points with fresh data, {len(grid_points)} to fetch")

    success_count = 0
    error_count = 0

    # Batch into chunks of BATCH_SIZE
    batches = [grid_points[i:i + BATCH_SIZE] for i in range(0, len(grid_points), BATCH_SIZE)]
    print(f"Split into {len(batches)} batches of up to {BATCH_SIZE} locations each")

    # Open-Meteo free limits: 10k/day, 5k/hour, 600/min
    # Each location in a batch = 1 API call. ~6897 pts = 138 batches × 50.
    # At 1 batch/75s → 48 batches/hour → 2400 calls/hour (well under 5k).
    # Total runtime: 138 × 75s ≈ 2.9 hours.
    BATCH_DELAY = 75  # seconds between batches

    for batch_idx, batch in enumerate(batches):
        print(f"[{batch_idx+1}/{len(batches)}] Fetching batch of {len(batch)} points...")

        results = fetch_forecast_batch(batch)
        if results:
            for (lat, lon), forecast_data in results:
                rows = parse_forecast_rows(forecast_data, lat, lon)
                if upsert_forecast_batch(rows):
                    success_count += 1
                else:
                    error_count += 1
        else:
            error_count += len(batch)

        if batch_idx < len(batches) - 1:
            time.sleep(BATCH_DELAY)

    print(f"\nForecast refresh complete!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total: {len(grid_points)}")
    print(f"  API calls: {len(batches)}")


if __name__ == "__main__":
    refresh_forecast()
