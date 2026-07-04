import os
import tempfile
import uuid

# Configure an isolated DB and fixed secret before importing the app.
os.environ.setdefault("DB_PATH", os.path.join(tempfile.gettempdir(), f"cl_test_{uuid.uuid4().hex}.db"))
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.main import app, _rate_buckets
from app.db import init_db


@pytest.fixture(scope="session", autouse=True)
def _init_db():
    init_db()
    yield


@pytest.fixture()
def client():
    _rate_buckets.clear()
    return TestClient(app)


@pytest.fixture()
def auth(client):
    """Return (headers, user) for a freshly registered user."""
    email = f"{uuid.uuid4().hex}@test.com"
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "nickname": "Tester"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]
