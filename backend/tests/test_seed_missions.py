"""Tests for mission seeding logic (seed_missions.py)."""

from app.seed_missions import apply_flyby_labels, MISSIONS


class TestApplyFlybyLabels:
    def test_assigns_label_to_nearest_waypoint(self):
        waypoints = [
            {"epoch": "1977-09-06", "label": None, "object_id": None},
            {"epoch": "1979-01-01", "label": None, "object_id": None},
            {"epoch": "1979-07-01", "label": None, "object_id": None},
            {"epoch": "1980-01-01", "label": None, "object_id": None},
        ]
        flybys = {"1979-03-05": ("Jupiter flyby", "jupiter")}
        result = apply_flyby_labels(waypoints, flybys)

        # 1979-03-05 is closest to 1979-01-01
        labeled = [w for w in result if w["label"] == "Jupiter flyby"]
        assert len(labeled) == 1
        assert labeled[0]["object_id"] == "jupiter"

    def test_labels_launch_when_unlabeled(self):
        waypoints = [
            {"epoch": "2020-01-01", "label": None, "object_id": None},
            {"epoch": "2020-06-01", "label": None, "object_id": None},
        ]
        result = apply_flyby_labels(waypoints, {})
        assert result[0]["label"] == "Launch"
        assert result[0]["object_id"] == "earth"

    def test_does_not_overwrite_launch_with_flyby(self):
        """If a flyby is assigned to the first waypoint, keep the flyby label."""
        waypoints = [
            {"epoch": "2020-01-01", "label": None, "object_id": None},
            {"epoch": "2021-01-01", "label": None, "object_id": None},
        ]
        flybys = {"2020-01-01": ("Earth departure", "earth")}
        result = apply_flyby_labels(waypoints, flybys)
        # Flyby was assigned to first waypoint, then Launch check sees it's already labeled
        assert result[0]["label"] == "Earth departure"

    def test_multiple_flybys(self):
        waypoints = [
            {"epoch": "1977-09-06", "label": None, "object_id": None},
            {"epoch": "1979-03-01", "label": None, "object_id": None},
            {"epoch": "1980-11-01", "label": None, "object_id": None},
            {"epoch": "2012-08-01", "label": None, "object_id": None},
        ]
        flybys = {
            "1979-03-05": ("Jupiter flyby", "jupiter"),
            "1980-11-12": ("Saturn flyby", "saturn"),
            "2012-08-25": ("Interstellar", None),
        }
        result = apply_flyby_labels(waypoints, flybys)
        labels = [w["label"] for w in result if w["label"]]
        assert "Jupiter flyby" in labels
        assert "Saturn flyby" in labels
        assert "Interstellar" in labels

    def test_empty_waypoints(self):
        result = apply_flyby_labels([], {})
        assert result == []


class TestMissionConfig:
    def test_all_missions_have_required_fields(self):
        for m in MISSIONS:
            assert "id" in m
            assert "naif" in m
            assert "start" in m
            assert "stop" in m
            assert "step" in m
            assert "meta" in m
            assert "name" in m["meta"]
            assert "description" in m["meta"]

    def test_unique_ids(self):
        ids = [m["id"] for m in MISSIONS]
        assert len(ids) == len(set(ids))

    def test_unique_sort_orders(self):
        orders = [m["sort_order"] for m in MISSIONS]
        assert len(orders) == len(set(orders))

    def test_naif_ids_are_negative(self):
        """NAIF IDs for spacecraft are negative numbers."""
        for m in MISSIONS:
            assert m["naif"].startswith("-"), f"{m['id']} has non-negative NAIF ID"

    def test_date_format(self):
        """Start/stop dates should be YYYY-MM-DD format."""
        import re
        date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        for m in MISSIONS:
            assert date_re.match(m["start"]), f"{m['id']} start date invalid"
            assert date_re.match(m["stop"]), f"{m['id']} stop date invalid"

    def test_mission_count(self):
        """Should have a decent number of missions."""
        assert len(MISSIONS) >= 20
