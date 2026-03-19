import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client — runs requests in-process, no server needed."""
    with TestClient(app) as c:
        yield c
