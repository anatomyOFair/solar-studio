"""Tests for root and health endpoints."""


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "running"
    assert "Solar Studio" in data["message"]


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
