"""
Iteration 27 - Admin Procedures Dashboard Testing
Tests: Stats endpoint, sidebar tabs, chat actions CRUD, documents, configuration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Admin login failed: {resp.status_code}")
    return resp.json().get("access_token") or resp.json().get("token")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestProceduresStats:
    """Test /api/procedures/stats endpoint"""

    def test_stats_returns_correct_structure(self, admin_headers):
        """Stats endpoint returns all required fields without null categories"""
        resp = requests.get(f"{BASE_URL}/api/procedures/stats", headers=admin_headers)
        assert resp.status_code == 200, f"Stats failed: {resp.text}"
        data = resp.json()
        
        # Check required fields exist
        required_fields = ["total", "published", "drafts", "active", "total_files", 
                         "total_chat_actions", "total_views", "by_category", "by_country"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check no null categories in by_category
        if data["by_category"]:
            for cat_id in data["by_category"].keys():
                assert cat_id is not None, "Found null category in by_category"
                assert cat_id != "null", "Found 'null' string category in by_category"
        
        # Check no null countries in by_country
        if data["by_country"]:
            for country_id in data["by_country"].keys():
                assert country_id is not None, "Found null country in by_country"
        
        print(f"Stats: total={data['total']}, published={data['published']}, drafts={data['drafts']}")
        print(f"by_category: {data['by_category']}")
        print(f"by_country: {data['by_country']}")

    def test_stats_requires_admin(self):
        """Stats endpoint requires admin authentication"""
        resp = requests.get(f"{BASE_URL}/api/procedures/stats")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"


class TestChatActions:
    """Test Chat Actions CRUD"""

    def test_list_chat_actions(self, admin_headers):
        """GET /api/chat-actions returns list with country info"""
        resp = requests.get(f"{BASE_URL}/api/chat-actions", headers=admin_headers)
        assert resp.status_code == 200, f"List chat actions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list of chat actions"
        if data:
            action = data[0]
            assert "id" in action
            assert "title" in action
            assert "country" in action
            assert "country_name" in action
            assert "country_flag" in action
            print(f"Found {len(data)} chat actions")

    def test_create_chat_action(self, admin_headers):
        """POST /api/chat-actions creates new action"""
        payload = {"title": "TEST_Action_Iteration27", "country": "canada"}
        resp = requests.post(f"{BASE_URL}/api/chat-actions", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        assert data["title"] == "TEST_Action_Iteration27"
        assert data["country"] == "canada"
        assert "id" in data
        assert data["country_name"] == "Canada"
        print(f"Created chat action: {data['id']}")
        return data["id"]

    def test_update_chat_action(self, admin_headers):
        """PUT /api/chat-actions/{id} updates action"""
        # Create first
        payload = {"title": "TEST_Update_Original", "country": "france"}
        resp = requests.post(f"{BASE_URL}/api/chat-actions", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        action_id = resp.json()["id"]
        
        # Update
        update_payload = {"title": "TEST_Update_Modified", "country": "senegal", "procedure_id": None}
        resp = requests.put(f"{BASE_URL}/api/chat-actions/{action_id}", json=update_payload, headers=admin_headers)
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data["title"] == "TEST_Update_Modified"
        assert data["country"] == "senegal"
        print(f"Updated chat action: {action_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat-actions/{action_id}", headers=admin_headers)

    def test_delete_chat_action(self, admin_headers):
        """DELETE /api/chat-actions/{id} removes action"""
        # Create first
        payload = {"title": "TEST_Delete_Me", "country": "guinee"}
        resp = requests.post(f"{BASE_URL}/api/chat-actions", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        action_id = resp.json()["id"]
        
        # Delete
        resp = requests.delete(f"{BASE_URL}/api/chat-actions/{action_id}", headers=admin_headers)
        assert resp.status_code == 200, f"Delete failed: {resp.text}"
        print(f"Deleted chat action: {action_id}")


class TestProceduresReferenceData:
    """Test reference data endpoints used by dashboard"""

    def test_get_categories(self):
        """GET /api/procedures/categories returns list"""
        resp = requests.get(f"{BASE_URL}/api/procedures/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert all("id" in c and "name" in c for c in data)
        print(f"Categories: {[c['id'] for c in data]}")

    def test_get_countries(self):
        """GET /api/procedures/countries returns list with flags"""
        resp = requests.get(f"{BASE_URL}/api/procedures/countries")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert all("id" in c and "name" in c and "flag" in c for c in data)
        print(f"Countries: {[c['id'] for c in data]}")


class TestProceduresListWithFilters:
    """Test procedures list with category and country filters"""

    def test_list_procedures(self, admin_headers):
        """GET /api/procedures returns paginated list"""
        resp = requests.get(f"{BASE_URL}/api/procedures", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "procedures" in data
        assert "total" in data
        assert "pages" in data
        print(f"Total procedures: {data['total']}, pages: {data['pages']}")

    def test_filter_by_category(self, admin_headers):
        """GET /api/procedures?category=visa_immigration filters correctly"""
        resp = requests.get(f"{BASE_URL}/api/procedures?category=visa_immigration", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        for proc in data["procedures"]:
            assert proc["category"] == "visa_immigration", f"Expected visa_immigration, got {proc['category']}"
        print(f"Filtered by category: {len(data['procedures'])} procedures")

    def test_filter_by_country(self, admin_headers):
        """GET /api/procedures?country=canada filters correctly"""
        resp = requests.get(f"{BASE_URL}/api/procedures?country=canada", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        for proc in data["procedures"]:
            assert proc["country"] == "canada" or proc.get("subcategory") == "canada", f"Expected canada, got {proc['country']}"
        print(f"Filtered by country: {len(data['procedures'])} procedures")


class TestProcedureFiles:
    """Test procedure files endpoints for Documents tab"""

    def test_list_procedure_files(self, admin_headers):
        """GET /api/procedures/{id}/files returns file list"""
        # Get a procedure with files
        resp = requests.get(f"{BASE_URL}/api/procedures?limit=10", headers=admin_headers)
        assert resp.status_code == 200
        procedures = resp.json()["procedures"]
        
        for proc in procedures:
            if proc.get("files") and len(proc["files"]) > 0:
                proc_id = proc["id"]
                resp = requests.get(f"{BASE_URL}/api/procedures/{proc_id}/files", headers=admin_headers)
                assert resp.status_code == 200
                files = resp.json()
                assert isinstance(files, list)
                if files:
                    assert all("id" in f and "file_name" in f for f in files)
                    print(f"Procedure {proc_id} has {len(files)} files")
                return
        
        print("No procedures with files found - testing with empty response")
        # Test with first procedure anyway
        if procedures:
            resp = requests.get(f"{BASE_URL}/api/procedures/{procedures[0]['id']}/files", headers=admin_headers)
            assert resp.status_code == 200


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_chat_actions(self, admin_headers):
        """Remove TEST_ prefixed chat actions"""
        resp = requests.get(f"{BASE_URL}/api/chat-actions", headers=admin_headers)
        if resp.status_code == 200:
            actions = resp.json()
            deleted = 0
            for action in actions:
                if action.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/chat-actions/{action['id']}", headers=admin_headers)
                    deleted += 1
            print(f"Cleaned up {deleted} test chat actions")
