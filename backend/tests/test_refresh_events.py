"""Tests for celestial event refresh logic (refresh_events.py)."""

from app.refresh_events import (
    get_meteor_shower_rows,
    get_lunar_eclipse_rows,
    fetch_usno_moon_phases,
    fetch_usno_solar_eclipses,
    fetch_noaa_aurora_forecast,
    METEOR_SHOWERS,
    LUNAR_ECLIPSES,
    STORM_LABELS,
    PHASE_DESCRIPTIONS,
)
from unittest.mock import patch, MagicMock


class TestMeteorShowers:
    def test_generates_current_and_next_year(self):
        rows = get_meteor_shower_rows(2025)
        years = {r["event_date"][:4] for r in rows}
        assert "2025" in years
        assert "2026" in years

    def test_row_count_matches_showers(self):
        rows = get_meteor_shower_rows(2025)
        # Each shower generates 2 rows (current + next year)
        assert len(rows) == len(METEOR_SHOWERS) * 2

    def test_row_structure(self):
        rows = get_meteor_shower_rows(2025)
        row = rows[0]
        assert "id" in row
        assert "name" in row
        assert "type" in row
        assert "event_date" in row
        assert "description" in row
        assert "source" in row
        assert row["type"] == "meteor_shower"
        assert row["source"] == "computed"

    def test_id_format(self):
        rows = get_meteor_shower_rows(2025)
        for r in rows:
            assert r["id"].startswith("meteor-")
            assert r["event_date"][:4] in r["id"]

    def test_description_contains_zhr(self):
        rows = get_meteor_shower_rows(2025)
        for r in rows:
            assert "meteors/hr" in r["description"]

    def test_perseids_date(self):
        rows = get_meteor_shower_rows(2025)
        perseids = [r for r in rows if "perseids" in r["id"] and "2025" in r["id"]]
        assert len(perseids) == 1
        assert perseids[0]["event_date"] == "2025-08-12"


class TestLunarEclipses:
    def test_returns_all_eclipses(self):
        rows = get_lunar_eclipse_rows()
        assert len(rows) == len(LUNAR_ECLIPSES)

    def test_row_structure(self):
        rows = get_lunar_eclipse_rows()
        for r in rows:
            assert r["type"] == "eclipse"
            assert r["source"] == "computed"
            assert r["id"].startswith("eclipse-lunar-")

    def test_dates_are_valid(self):
        rows = get_lunar_eclipse_rows()
        for r in rows:
            parts = r["event_date"].split("-")
            assert len(parts) == 3
            assert len(parts[0]) == 4  # year
            assert 1 <= int(parts[1]) <= 12
            assert 1 <= int(parts[2]) <= 31


class TestUSNOMoonPhases:
    @patch("app.refresh_events.httpx.get")
    def test_parses_valid_response(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "phasedata": [
                {"year": 2025, "month": 1, "day": 6, "phase": "Full Moon", "time": "23:56"},
                {"year": 2025, "month": 1, "day": 13, "phase": "Last Quarter", "time": "22:27"},
            ]
        }
        mock_get.return_value = mock_resp

        rows = fetch_usno_moon_phases(2025)
        assert len(rows) == 2
        assert rows[0]["type"] == "lunar_phase"
        assert rows[0]["event_date"] == "2025-01-06"
        assert rows[0]["name"] == "Full Moon"
        assert "23:56 UTC" in rows[0]["description"]

    @patch("app.refresh_events.httpx.get")
    def test_handles_api_error(self, mock_get):
        mock_get.side_effect = Exception("Connection failed")
        rows = fetch_usno_moon_phases(2025)
        assert rows == []

    def test_phase_descriptions_complete(self):
        expected = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"]
        for phase in expected:
            assert phase in PHASE_DESCRIPTIONS


class TestUSNOSolarEclipses:
    @patch("app.refresh_events.httpx.get")
    def test_parses_valid_response(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "eclipses_in_year": [
                {"year": 2025, "month": 3, "day": 29, "event": "Partial Solar Eclipse"},
                {"year": 2025, "month": 9, "day": 21, "event": "Annular Solar Eclipse"},
            ]
        }
        mock_get.return_value = mock_resp

        rows = fetch_usno_solar_eclipses(2025)
        assert len(rows) == 2
        assert rows[0]["type"] == "eclipse"
        assert rows[0]["source"] == "usno"
        assert rows[0]["event_date"] == "2025-03-29"

    @patch("app.refresh_events.httpx.get")
    def test_handles_empty_response(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"eclipses_in_year": []}
        mock_get.return_value = mock_resp

        rows = fetch_usno_solar_eclipses(2025)
        assert rows == []


class TestNOAAAuroraForecast:
    @patch("app.refresh_events.httpx.get")
    def test_filters_below_g1(self, mock_get):
        """Only Kp >= 5 (G1+) should create events."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            ["time_tag", "kp", "observed", "noaa_scale"],  # header
            ["2025-03-15 00:00:00", "3.00", "observed", ""],
            ["2025-03-15 03:00:00", "4.00", "observed", ""],
        ]
        mock_get.return_value = mock_resp

        rows = fetch_noaa_aurora_forecast()
        assert len(rows) == 0

    @patch("app.refresh_events.httpx.get")
    def test_creates_event_for_g1_storm(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            ["time_tag", "kp", "observed", "noaa_scale"],
            ["2025-03-15 00:00:00", "5.33", "predicted", "G1"],
        ]
        mock_get.return_value = mock_resp

        rows = fetch_noaa_aurora_forecast()
        assert len(rows) == 1
        assert rows[0]["type"] == "aurora"
        assert "G1" in rows[0]["name"]
        assert rows[0]["event_date"] == "2025-03-15"

    @patch("app.refresh_events.httpx.get")
    def test_picks_peak_kp_per_day(self, mock_get):
        """Multiple readings on same day → use highest Kp."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            ["time_tag", "kp", "observed", "noaa_scale"],
            ["2025-03-15 00:00:00", "5.00", "predicted", "G1"],
            ["2025-03-15 06:00:00", "7.00", "predicted", "G3"],
            ["2025-03-15 12:00:00", "4.00", "predicted", ""],
        ]
        mock_get.return_value = mock_resp

        rows = fetch_noaa_aurora_forecast()
        assert len(rows) == 1
        assert "G3" in rows[0]["name"]
        assert "7.0" in rows[0]["description"]

    @patch("app.refresh_events.httpx.get")
    def test_infers_scale_when_missing(self, mock_get):
        """If NOAA scale field is empty, infer from Kp value."""
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            ["time_tag", "kp", "observed", "noaa_scale"],
            ["2025-03-15 00:00:00", "6.33", "predicted", ""],
        ]
        mock_get.return_value = mock_resp

        rows = fetch_noaa_aurora_forecast()
        assert len(rows) == 1
        assert "G2" in rows[0]["name"]

    @patch("app.refresh_events.httpx.get")
    def test_handles_api_error(self, mock_get):
        mock_get.side_effect = Exception("Timeout")
        rows = fetch_noaa_aurora_forecast()
        assert rows == []

    def test_storm_labels_complete(self):
        for scale in ["G1", "G2", "G3", "G4", "G5"]:
            assert scale in STORM_LABELS
