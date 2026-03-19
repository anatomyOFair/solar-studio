"""Tests for weather forecast refresh logic (refresh_forecast.py)."""

from app.refresh_forecast import generate_land_grid, parse_forecast_rows, GRID_RESOLUTION


class TestGenerateLandGrid:
    def test_returns_non_empty(self):
        grid = generate_land_grid()
        assert len(grid) > 0

    def test_points_are_on_grid(self):
        """All points should be multiples of GRID_RESOLUTION (5 degrees)."""
        grid = generate_land_grid()
        for lat, lon in grid:
            assert lat % GRID_RESOLUTION == 0, f"lat {lat} not on grid"
            assert lon % GRID_RESOLUTION == 0, f"lon {lon} not on grid"

    def test_covers_major_continents(self):
        grid = generate_land_grid()
        lats = {p[0] for p in grid}
        lons = {p[1] for p in grid}
        # North America
        assert any(30 <= lat <= 50 for lat in lats)
        assert any(-120 <= lon <= -80 for lon in lons)
        # Europe
        assert any(40 <= lat <= 55 for lat in lats)
        assert any(0 <= lon <= 25 for lon in lons)
        # Australia
        assert any(-35 <= lat <= -15 for lat in lats)

    def test_no_duplicates(self):
        grid = generate_land_grid()
        assert len(grid) == len(set(grid))

    def test_reasonable_count(self):
        """Should have a reasonable number of points (not too few, not millions)."""
        grid = generate_land_grid()
        assert 100 < len(grid) < 2000


class TestParseForecastRows:
    def test_parses_valid_response(self):
        data = {
            "hourly": {
                "time": ["2025-03-15T00:00", "2025-03-15T01:00", "2025-03-15T02:00"],
                "cloud_cover": [50.0, 75.0, 25.0],
                "precipitation": [0.0, 1.2, 0.0],
                "visibility": [10000, 5000, 20000],
            }
        }
        rows = parse_forecast_rows(data, 50, 0)
        assert len(rows) == 3

        assert rows[0]["lat_grid"] == 50
        assert rows[0]["lon_grid"] == 0
        assert rows[0]["cloud_cover"] == 50.0
        assert rows[0]["precipitation"] == 0.0
        assert rows[0]["visibility_km"] == 10.0

        assert rows[1]["precipitation"] == 1.2
        assert rows[1]["visibility_km"] == 5.0

    def test_handles_none_values(self):
        data = {
            "hourly": {
                "time": ["2025-03-15T00:00"],
                "cloud_cover": [None],
                "precipitation": [None],
                "visibility": [None],
            }
        }
        rows = parse_forecast_rows(data, 0, 0)
        assert len(rows) == 1
        assert rows[0]["cloud_cover"] is None
        assert rows[0]["precipitation"] is None
        assert rows[0]["visibility_km"] is None

    def test_handles_empty_hourly(self):
        data = {"hourly": {"time": [], "cloud_cover": [], "precipitation": [], "visibility": []}}
        rows = parse_forecast_rows(data, 0, 0)
        assert rows == []

    def test_handles_missing_arrays(self):
        """If visibility array is shorter than time array, use None."""
        data = {
            "hourly": {
                "time": ["2025-03-15T00:00", "2025-03-15T01:00"],
                "cloud_cover": [50.0],
                "precipitation": [0.0],
                "visibility": [10000],
            }
        }
        rows = parse_forecast_rows(data, 0, 0)
        assert len(rows) == 2
        # Second row should have None for missing values
        assert rows[1]["cloud_cover"] is None
        assert rows[1]["visibility_km"] is None

    def test_forecast_time_format(self):
        data = {
            "hourly": {
                "time": ["2025-03-15T00:00"],
                "cloud_cover": [50],
                "precipitation": [0],
                "visibility": [10000],
            }
        }
        rows = parse_forecast_rows(data, 0, 0)
        # Should append timezone info
        assert "+00:00" in rows[0]["forecast_time"]

    def test_updated_at_present(self):
        data = {
            "hourly": {
                "time": ["2025-03-15T00:00"],
                "cloud_cover": [50],
                "precipitation": [0],
                "visibility": [10000],
            }
        }
        rows = parse_forecast_rows(data, 0, 0)
        assert "updated_at" in rows[0]
