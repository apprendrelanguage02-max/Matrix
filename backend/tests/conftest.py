import os
import pytest

API_URL = os.environ.get("TEST_API_URL", "http://localhost:8001/api")
TEST_ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL")
TEST_ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")


@pytest.fixture
def api_url():
    return API_URL


@pytest.fixture
def admin_credentials():
    if not TEST_ADMIN_EMAIL or not TEST_ADMIN_PASSWORD:
        pytest.skip("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars required")
    return {"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
