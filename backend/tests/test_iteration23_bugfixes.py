"""
Test suite for Iteration 23 bug fixes:
1. Backend: POST /api/properties with bedrooms=0 bathrooms=0 surface_area=0 succeeds
2. Backend: POST /api/properties with short seller_phone (3 chars) succeeds  
3. Backend: Validate property creation with minimal data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_AGENT_EMAIL = "testagent@test.com"
TEST_AGENT_PASSWORD = "TestAgent123!"


class TestAuthentication:
    """Test login flow to get agent token"""
    
    def test_agent_login(self):
        """Login as test agent to get token for property tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": TEST_AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "agent"
        print(f"✓ Agent login successful, role: {data['user']['role']}")
        return data["token"]


class TestPropertyCreationBugFixes:
    """Test bug fixes for property creation - empty strings and short phone numbers"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": TEST_AGENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Cannot login as agent: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, agent_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {agent_token}"}
    
    def test_property_creation_with_zero_values(self, auth_headers):
        """BUG FIX: bedrooms=0, bathrooms=0, surface_area=0 should succeed (not empty strings)"""
        payload = {
            "title": "TEST_ZeroValues Property",
            "type": "vente",
            "price": 100000000,
            "currency": "GNF",
            "description": "Test property with zero values for bedrooms/bathrooms/surface_area",
            "city": "Conakry",
            "neighborhood": "Kipé",
            "address": "Avenue de la République",
            "seller_name": "Test Agent",
            "seller_phone": "123",  # Short phone (min_length=3)
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "villa",
            "bedrooms": 0,  # Should be accepted as integer 0, not empty string
            "bathrooms": 0,  # Should be accepted as integer 0, not empty string
            "surface_area": 0  # Should be accepted as float 0, not empty string
        }
        
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=auth_headers)
        
        assert response.status_code in [200, 201], f"Property creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["bedrooms"] == 0
        assert data["bathrooms"] == 0
        assert data["surface_area"] == 0
        print(f"✓ Property created with zero values - ID: {data['id']}")
        
        # Cleanup
        property_id = data["id"]
        requests.delete(f"{BASE_URL}/api/properties/{property_id}", headers=auth_headers)
        print(f"✓ Cleaned up test property: {property_id}")
    
    def test_property_creation_with_short_phone(self, auth_headers):
        """BUG FIX: seller_phone with 3 characters should succeed (min_length reduced from 8 to 3)"""
        payload = {
            "title": "TEST_ShortPhone Property",
            "type": "location",
            "price": 50000000,
            "currency": "GNF",
            "description": "Test short phone number (3 chars)",
            "city": "Kindia",
            "neighborhood": "",
            "address": "",
            "seller_name": "Agent Test",
            "seller_phone": "123",  # Only 3 characters - should work now
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "appartement",
            "bedrooms": 2,
            "bathrooms": 1,
            "surface_area": 80.5
        }
        
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=auth_headers)
        
        assert response.status_code in [200, 201], f"Property with short phone failed: {response.text}"
        data = response.json()
        assert data["seller_phone"] == "123"
        print(f"✓ Property created with 3-char phone - ID: {data['id']}")
        
        # Cleanup
        property_id = data["id"]
        requests.delete(f"{BASE_URL}/api/properties/{property_id}", headers=auth_headers)
        print(f"✓ Cleaned up test property: {property_id}")
    
    def test_property_creation_with_short_description(self, auth_headers):
        """BUG FIX: description with 3 characters should succeed (min_length reduced from 10 to 3)"""
        payload = {
            "title": "TEST_ShortDesc Property",
            "type": "achat",
            "price": 200000000,
            "currency": "GNF",
            "description": "abc",  # Only 3 characters - should work now
            "city": "Conakry",
            "neighborhood": "Ratoma",
            "address": "",
            "seller_name": "Test",
            "seller_phone": "6281234567",
            "seller_email": "",
            "seller_whatsapp": "",
            "images": [],
            "video_url": "",
            "property_category": "terrain",
            "bedrooms": 0,
            "bathrooms": 0,
            "surface_area": 500
        }
        
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=auth_headers)
        
        assert response.status_code in [200, 201], f"Property with short description failed: {response.text}"
        data = response.json()
        assert data["description"] == "abc"
        print(f"✓ Property created with 3-char description - ID: {data['id']}")
        
        # Cleanup
        property_id = data["id"]
        requests.delete(f"{BASE_URL}/api/properties/{property_id}", headers=auth_headers)
        print(f"✓ Cleaned up test property: {property_id}")
    
    def test_property_creation_validation_error_format(self, auth_headers):
        """Verify validation errors return proper format (array of objects with msg field)"""
        # Send invalid data to trigger Pydantic validation
        payload = {
            "title": "",  # Too short - min_length=3
            "type": "invalid_type",  # Invalid enum
            "price": -100,  # Should be > 0
            "currency": "GNF",
            "description": "",  # Too short
            "city": "",  # Too short
            "seller_name": "",  # Too short
            "seller_phone": "12",  # Too short (min=3)
        }
        
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=auth_headers)
        
        # Should return 422 for validation errors
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        
        # Detail should be an array (this is what caused the React crash when toast.error tried to render it)
        detail = data["detail"]
        if isinstance(detail, list):
            # Each item should have 'msg' field that frontend can extract
            for item in detail:
                assert "msg" in item, f"Validation error missing 'msg' field: {item}"
            print(f"✓ Validation errors return array format with {len(detail)} errors")
        else:
            print(f"✓ Validation error format: {type(detail)}")


class TestPropertyListingAndFilters:
    """Test property listing works correctly"""
    
    def test_get_properties_list(self):
        """Verify GET /api/properties returns valid structure"""
        response = requests.get(f"{BASE_URL}/api/properties", params={"limit": 5})
        
        assert response.status_code == 200, f"Failed to get properties: {response.text}"
        data = response.json()
        
        assert "properties" in data
        assert "total" in data
        assert "pages" in data
        assert isinstance(data["properties"], list)
        print(f"✓ GET /api/properties - Total: {data['total']}, Pages: {data['pages']}")


class TestCleanup:
    """Cleanup any TEST_ prefixed properties"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": TEST_AGENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot login")
        return response.json()["token"]
    
    def test_cleanup_test_properties(self, agent_token):
        """Remove any leftover TEST_ properties"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        # Get all properties
        response = requests.get(f"{BASE_URL}/api/properties", params={"limit": 100})
        if response.status_code != 200:
            print("Could not fetch properties for cleanup")
            return
        
        properties = response.json().get("properties", [])
        cleaned = 0
        
        for p in properties:
            if p.get("title", "").startswith("TEST_"):
                del_resp = requests.delete(f"{BASE_URL}/api/properties/{p['id']}", headers=headers)
                if del_resp.status_code in [200, 204]:
                    cleaned += 1
        
        print(f"✓ Cleanup complete - removed {cleaned} test properties")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
