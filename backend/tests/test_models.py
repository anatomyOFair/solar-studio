"""Tests for Pydantic model validation (models/schemas.py)."""

import pytest
from pydantic import ValidationError
from app.models.schemas import Position, CelestialObject, WeatherConditions, VisibilityData


class TestPosition:
    def test_valid_position(self):
        p = Position(lat=51.5, lon=-0.12, altitude=100)
        assert p.lat == 51.5
        assert p.lon == -0.12
        assert p.altitude == 100

    def test_lat_bounds(self):
        Position(lat=90, lon=0, altitude=0)
        Position(lat=-90, lon=0, altitude=0)
        with pytest.raises(ValidationError):
            Position(lat=91, lon=0, altitude=0)
        with pytest.raises(ValidationError):
            Position(lat=-91, lon=0, altitude=0)

    def test_lon_bounds(self):
        Position(lat=0, lon=180, altitude=0)
        Position(lat=0, lon=-180, altitude=0)
        with pytest.raises(ValidationError):
            Position(lat=0, lon=181, altitude=0)
        with pytest.raises(ValidationError):
            Position(lat=0, lon=-181, altitude=0)

    def test_altitude_must_be_positive(self):
        Position(lat=0, lon=0, altitude=0)
        with pytest.raises(ValidationError):
            Position(lat=0, lon=0, altitude=-1)


class TestCelestialObject:
    def test_valid_object(self):
        obj = CelestialObject(
            name="Mars",
            type="planet",
            position=Position(lat=0, lon=0, altitude=225000000),
        )
        assert obj.name == "Mars"
        assert obj.type == "planet"

    def test_valid_types(self):
        valid_types = ["moon", "planet", "satellite", "star", "asteroid", "spacecraft"]
        for t in valid_types:
            obj = CelestialObject(
                name="Test", type=t,
                position=Position(lat=0, lon=0, altitude=0),
            )
            assert obj.type == t

    def test_invalid_type_rejected(self):
        with pytest.raises(ValidationError):
            CelestialObject(
                name="Test", type="comet",
                position=Position(lat=0, lon=0, altitude=0),
            )

    def test_optional_id(self):
        obj = CelestialObject(
            name="Test", type="star",
            position=Position(lat=0, lon=0, altitude=0),
        )
        assert obj.id is None


class TestWeatherConditions:
    def test_valid_conditions(self):
        w = WeatherConditions(
            cloud_cover=0.5, precipitation=1.2,
            fog=0.1, extinction_coeff=0.3,
        )
        assert w.cloud_cover == 0.5

    def test_cloud_cover_bounds(self):
        WeatherConditions(cloud_cover=0, precipitation=0, fog=0, extinction_coeff=0)
        WeatherConditions(cloud_cover=1, precipitation=0, fog=0, extinction_coeff=0)
        with pytest.raises(ValidationError):
            WeatherConditions(cloud_cover=1.1, precipitation=0, fog=0, extinction_coeff=0)
        with pytest.raises(ValidationError):
            WeatherConditions(cloud_cover=-0.1, precipitation=0, fog=0, extinction_coeff=0)

    def test_fog_bounds(self):
        with pytest.raises(ValidationError):
            WeatherConditions(cloud_cover=0, precipitation=0, fog=1.1, extinction_coeff=0)


class TestVisibilityData:
    def test_valid_data(self):
        v = VisibilityData(percentage=75.5, weather_rating=8, time_rating=6)
        assert v.percentage == 75.5

    def test_percentage_bounds(self):
        with pytest.raises(ValidationError):
            VisibilityData(percentage=101, weather_rating=5, time_rating=5)
        with pytest.raises(ValidationError):
            VisibilityData(percentage=-1, weather_rating=5, time_rating=5)

    def test_rating_bounds(self):
        with pytest.raises(ValidationError):
            VisibilityData(percentage=50, weather_rating=0, time_rating=5)
        with pytest.raises(ValidationError):
            VisibilityData(percentage=50, weather_rating=11, time_rating=5)
