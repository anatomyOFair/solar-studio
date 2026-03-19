"""Tests for weather API endpoints."""

import time
from unittest.mock import AsyncMock, patch
from app.routers.weather import (
    haversine_distance,
    cache_key,
    find_nearest_cached,
    parse_open_meteo_response,
    weather_cache,
)


# ── Unit tests for helper functions ──────────────────────────────────────────


class TestHaversineDistance:
    def test_same_point_is_zero(self):
        assert haversine_distance(51.5, -0.12, 51.5, -0.12) == 0.0

    def test_london_to_paris(self):
        # ~340 km
        dist = haversine_distance(51.5074, -0.1278, 48.8566, 2.3522)
        assert 330 < dist < 350

    def test_symmetry(self):
        d1 = haversine_distance(0, 0, 10, 10)
        d2 = haversine_distance(10, 10, 0, 0)
        assert abs(d1 - d2) < 0.001


class TestCacheKey:
    def test_rounds_to_one_decimal(self):
        assert cache_key(51.5074, -0.1278) == "51.5,-0.1"

    def test_exact_values(self):
        assert cache_key(10.0, 20.0) == "10.0,20.0"

    def test_negative_coords(self):
        assert cache_key(-33.87, 151.21) == "-33.9,151.2"


class TestParseOpenMeteoResponse:
    def test_parses_valid_response(self):
        raw = {
            "current": {
                "cloud_cover": 75,
                "precipitation": 0.5,
                "temperature_2m": 15.3,
            },
            "hourly": {
                "visibility": [8000],
            },
        }
        result = parse_open_meteo_response(raw, 51.5, -0.12)
        assert result["cloudCover"] == 0.75
        assert result["precipitation"] == 0.5
        assert result["temperature_c"] == 15.3
        assert result["visibility_km"] == 8.0
        assert result["fog"] > 0  # visibility < 10km → fog > 0
        assert result["lat"] == 51.5
        assert result["lon"] == -0.12

    def test_clear_sky_no_fog(self):
        raw = {
            "current": {"cloud_cover": 0, "precipitation": 0, "temperature_2m": 20},
            "hourly": {"visibility": [50000]},
        }
        result = parse_open_meteo_response(raw, 0, 0)
        assert result["cloudCover"] == 0.0
        assert result["fog"] == 0

    def test_missing_visibility_defaults(self):
        raw = {
            "current": {"cloud_cover": 50, "precipitation": 0, "temperature_2m": 10},
            "hourly": {"visibility": []},
        }
        result = parse_open_meteo_response(raw, 0, 0)
        assert result["visibility_km"] == 10.0

    def test_null_temperature(self):
        raw = {
            "current": {"cloud_cover": 0, "precipitation": 0, "temperature_2m": None},
            "hourly": {"visibility": [10000]},
        }
        result = parse_open_meteo_response(raw, 0, 0)
        assert result["temperature_c"] is None


class TestFindNearestCached:
    def setup_method(self):
        weather_cache.clear()

    def test_returns_none_when_empty(self):
        assert find_nearest_cached(51.5, -0.12) is None

    def test_finds_nearby_entry(self):
        weather_cache["51.5,-0.1"] = {
            "data": {"cloudCover": 0.5, "precipitation": 0, "fog": 0,
                     "visibility_km": 10, "temperature_c": 15, "lat": 51.5, "lon": -0.1},
            "timestamp": time.time(),
            "lat": 51.5,
            "lon": -0.1,
        }
        result = find_nearest_cached(51.51, -0.11)
        assert result is not None

    def test_ignores_expired_entries(self):
        weather_cache["51.5,-0.1"] = {
            "data": {},
            "timestamp": time.time() - 7200,  # 2 hours ago (past 1h TTL)
            "lat": 51.5,
            "lon": -0.1,
        }
        assert find_nearest_cached(51.5, -0.1) is None

    def test_ignores_far_entries(self):
        weather_cache["0.0,0.0"] = {
            "data": {},
            "timestamp": time.time(),
            "lat": 0.0,
            "lon": 0.0,
        }
        # London is >5000 km from (0,0) — well outside 50km radius
        assert find_nearest_cached(51.5, -0.12) is None

    def teardown_method(self):
        weather_cache.clear()


# ── Integration tests via TestClient ─────────────────────────────────────────


class TestWeatherEndpoint:
    def test_returns_weather_data(self, client):
        """Hit the real Open-Meteo API (free, no key) and verify response shape."""
        res = client.get("/api/weather?lat=51.5&lon=-0.12")
        assert res.status_code == 200
        data = res.json()
        assert "cloudCover" in data
        assert "precipitation" in data
        assert "fog" in data
        assert "source" in data
        assert 0 <= data["cloudCover"] <= 1
        assert 0 <= data["fog"] <= 1

    def test_missing_params_422(self, client):
        res = client.get("/api/weather")
        assert res.status_code == 422

    def test_cache_stats(self, client):
        res = client.get("/api/weather/cache-stats")
        assert res.status_code == 200
        data = res.json()
        assert "total_entries" in data
        assert "valid_entries" in data
        assert "cache_ttl_seconds" in data


class TestWeatherCaching:
    def test_second_request_uses_cache(self, client):
        """First call hits API, second should come from cache."""
        res1 = client.get("/api/weather?lat=40.0&lon=-74.0")
        assert res1.status_code == 200

        res2 = client.get("/api/weather?lat=40.0&lon=-74.0")
        assert res2.status_code == 200
        assert res2.json()["source"] == "cache"

    def test_nearby_request_uses_neighbor(self, client):
        """Request within 50km should return neighbor-cached data."""
        # First call — cache miss
        res1 = client.get("/api/weather?lat=35.0&lon=139.0")
        assert res1.status_code == 200

        # Slightly offset (< 50km)
        res2 = client.get("/api/weather?lat=35.05&lon=139.05")
        assert res2.status_code == 200
        assert res2.json()["source"] in ("cache", "neighbor")
