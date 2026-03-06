"""
Iteration 22 Bug Fixes Backend Tests

Testing:
1. POST /api/properties - clean payload (no extra fields)
2. PUT /api/properties/:id - clean payload update
3. POST /api/saved-procedures/:id - toggle save (auth required)
4. GET /api/saved-procedures/:id/status - returns is_saved (auth required)
5. GET /api/saved-procedures - returns list (auth required)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_AGENT_EMAIL = "testagent@test.com"
TEST_AGENT_PASSWORD = "TestAgent123!"
TEST_AUTHOR_EMAIL = "testauthor@test.com"
TEST_AUTHOR_PASSWORD = "TestAuthor123!"


@pytest.fixture(scope="module")
def agent_token():
    """Get auth token for agent user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_AGENT_EMAIL,
        "password": TEST_AGENT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Agent login failed: {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def author_token():
    """Get auth token for author user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_AUTHOR_EMAIL,
        "password": TEST_AUTHOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Author login failed: {response.text}")
    return response.json().get("token")


@pytest.fixture
def api_client():
    """Simple requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPropertyCreationCleanPayload:
    """Test that POST /api/properties works with clean payload (no extra fields)."""

    def test_create_property_clean_payload(self, api_client, agent_token):
        """Test creating property with only expected fields - no extra fields like id, author_id, price_converted etc."""
        # Clean payload - only fields the API expects
        clean_payload = {
            "title": f"TEST_Property_{uuid.uuid4().hex[:8]}",
            "type": "vente",
            "price": 500000000,
            "currency": "GNF",
            "description": "Description de test pour la propriete.",
            "city": "Conakry",
            "neighborhood": "Kipé",
            "address": "Rue de test 123",
            "latitude": 9.5370,
            "longitude": -13.6785,
            "seller_name": "Test Seller",
            "seller_phone": "+224620000001",
            "seller_email": "seller@test.com",
            "seller_whatsapp": "+224620000001",
            "images": [],
            "video_url": "",
            "property_category": "villa",
            "bedrooms": 3,
            "bathrooms": 2,
            "surface_area": 150.0
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/properties",
            json=clean_payload,
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify response has expected fields
        assert "id" in data
        assert data["title"] == clean_payload["title"]
        assert data["type"] == "vente"
        assert data["price"] == 500000000
        assert data["city"] == "Conakry"
        assert data["property_category"] == "villa"
        assert data["bedrooms"] == 3
        assert data["bathrooms"] == 2
        
        # Clean up
        property_id = data["id"]
        api_client.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        print(f"✓ Property created successfully with clean payload: {property_id}")

    def test_create_property_requires_agent_role(self, api_client, author_token):
        """Test that author (non-agent) cannot create property."""
        payload = {
            "title": "TEST_Should_Fail",
            "type": "vente",
            "price": 100000,
            "currency": "GNF",
            "description": "Test",
            "city": "Conakry",
            "neighborhood": "",
            "address": "",
            "seller_name": "Test",
            "seller_phone": "+224620000000",
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "autre",
            "bedrooms": 0,
            "bathrooms": 0,
            "surface_area": 0
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        # Should be 403 Forbidden - author cannot create properties
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Author correctly blocked from creating property")

    def test_create_property_without_auth(self, api_client):
        """Test that unauthenticated users cannot create property."""
        payload = {
            "title": "TEST_No_Auth",
            "type": "vente",
            "price": 100000,
            "currency": "GNF",
            "description": "Test",
            "city": "Conakry",
            "neighborhood": "",
            "address": "",
            "seller_name": "Test",
            "seller_phone": "+224620000000",
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "autre",
            "bedrooms": 0,
            "bathrooms": 0,
            "surface_area": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/properties", json=payload)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthenticated request correctly rejected")


class TestPropertyUpdateCleanPayload:
    """Test that PUT /api/properties/:id works with clean payload."""

    def test_update_property_clean_payload(self, api_client, agent_token):
        """Test updating property with clean payload."""
        # First create a property
        create_payload = {
            "title": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "type": "vente",
            "price": 300000000,
            "currency": "GNF",
            "description": "Original description",
            "city": "Conakry",
            "neighborhood": "Kipé",
            "address": "",
            "latitude": None,
            "longitude": None,
            "seller_name": "Test Seller",
            "seller_phone": "+224620000002",
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "appartement",
            "bedrooms": 2,
            "bathrooms": 1,
            "surface_area": 80.0
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/properties",
            json=create_payload,
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        property_id = create_response.json()["id"]
        
        # Update with clean payload - only allowed fields
        update_payload = {
            "title": "TEST_Updated_Title",
            "price": 350000000,
            "bedrooms": 3,
            "status": "disponible"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/properties/{property_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        
        # Verify updates applied
        assert updated_data["title"] == "TEST_Updated_Title"
        assert updated_data["price"] == 350000000
        assert updated_data["bedrooms"] == 3
        
        # Clean up
        api_client.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        print(f"✓ Property updated successfully with clean payload: {property_id}")


class TestSavedProcedures:
    """Test saved-procedures endpoints."""

    def test_saved_procedures_requires_auth(self, api_client):
        """Test that saved-procedures endpoints require authentication."""
        # GET list
        response = api_client.get(f"{BASE_URL}/api/saved-procedures")
        assert response.status_code in [401, 403], f"Expected 401/403 for GET list, got {response.status_code}"
        
        # POST toggle
        response = api_client.post(f"{BASE_URL}/api/saved-procedures/some-id")
        assert response.status_code in [401, 403], f"Expected 401/403 for POST toggle, got {response.status_code}"
        
        # GET status
        response = api_client.get(f"{BASE_URL}/api/saved-procedures/some-id/status")
        assert response.status_code in [401, 403], f"Expected 401/403 for GET status, got {response.status_code}"
        
        print("✓ All saved-procedures endpoints correctly require auth")

    def test_saved_procedures_toggle_and_status(self, api_client, author_token):
        """Test toggling save on a procedure and checking status."""
        # First get a procedure to save
        procedures_response = api_client.get(f"{BASE_URL}/api/procedures?limit=1")
        assert procedures_response.status_code == 200
        
        procedures_data = procedures_response.json()
        if not procedures_data.get("procedures"):
            pytest.skip("No procedures available to test saving")
        
        procedure_id = procedures_data["procedures"][0]["id"]
        
        # Check initial status
        status_response = api_client.get(
            f"{BASE_URL}/api/saved-procedures/{procedure_id}/status",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert status_response.status_code == 200
        initial_saved = status_response.json().get("is_saved", False)
        
        # Toggle save
        toggle_response = api_client.post(
            f"{BASE_URL}/api/saved-procedures/{procedure_id}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert toggle_response.status_code == 200
        toggle_action = toggle_response.json().get("action")
        expected_action = "unsaved" if initial_saved else "saved"
        assert toggle_action == expected_action, f"Expected {expected_action}, got {toggle_action}"
        
        # Check status changed
        status_response2 = api_client.get(
            f"{BASE_URL}/api/saved-procedures/{procedure_id}/status",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert status_response2.status_code == 200
        new_saved = status_response2.json().get("is_saved")
        assert new_saved != initial_saved, "Status should have toggled"
        
        # Toggle back to restore original state
        api_client.post(
            f"{BASE_URL}/api/saved-procedures/{procedure_id}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        print(f"✓ Procedure save toggle works correctly: {procedure_id}")

    def test_get_saved_procedures_list(self, api_client, author_token):
        """Test getting the list of saved procedures."""
        response = api_client.get(
            f"{BASE_URL}/api/saved-procedures",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ Got saved procedures list: {len(data)} items")

    def test_toggle_nonexistent_procedure(self, api_client, author_token):
        """Test toggling save on non-existent procedure returns 404."""
        fake_id = f"nonexistent-{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/saved-procedures/{fake_id}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent procedure correctly returns 404")


class TestSavedProperties:
    """Test saved-properties endpoints."""

    def test_saved_properties_toggle_and_status(self, api_client, author_token):
        """Test toggling save on a property and checking status."""
        # Get a property to save
        properties_response = api_client.get(f"{BASE_URL}/api/properties?limit=1")
        assert properties_response.status_code == 200
        
        properties_data = properties_response.json()
        if not properties_data.get("properties"):
            pytest.skip("No properties available to test saving")
        
        property_id = properties_data["properties"][0]["id"]
        
        # Check initial status
        status_response = api_client.get(
            f"{BASE_URL}/api/saved-properties/{property_id}/status",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert status_response.status_code == 200
        initial_saved = status_response.json().get("is_saved", False)
        
        # Toggle save
        toggle_response = api_client.post(
            f"{BASE_URL}/api/saved-properties/{property_id}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert toggle_response.status_code == 200
        toggle_action = toggle_response.json().get("action")
        
        # Verify status changed
        status_response2 = api_client.get(
            f"{BASE_URL}/api/saved-properties/{property_id}/status",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        assert status_response2.status_code == 200
        new_saved = status_response2.json().get("is_saved")
        assert new_saved != initial_saved, "Status should have toggled"
        
        # Toggle back to restore
        api_client.post(
            f"{BASE_URL}/api/saved-properties/{property_id}",
            headers={"Authorization": f"Bearer {author_token}"}
        )
        
        print(f"✓ Property save toggle works correctly: {property_id}")


class TestPropertiesEndpoint:
    """Additional tests for properties endpoint."""

    def test_get_properties_list(self, api_client):
        """Test getting properties list."""
        response = api_client.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "total" in data
        assert "pages" in data
        print(f"✓ Got properties list: {data['total']} total")

    def test_get_properties_with_filters(self, api_client):
        """Test filtering properties."""
        response = api_client.get(f"{BASE_URL}/api/properties?city=Conakry&property_category=villa")
        assert response.status_code == 200
        print("✓ Properties filtering works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
