"""
Iteration 21: Test suite for Immobilier Refonte (P1 features)
Tests: Property endpoints, map markers, neighborhoods, heatmap, price estimation,
saved properties, search alerts, agent profiles
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_AUTHOR_EMAIL = "testauthor@test.com"
TEST_AUTHOR_PASSWORD = "TestAuthor123!"
AGENT_ID = "3ca91c7c-7400-4c1d-8529-8269973019a4"  # Gui, role=agent
ADMIN_ID = "acc21120-fe47-4e5f-a910-10dab816f9cb"  # Matrix224, role=admin
EXISTING_PROPERTY_ID = "438115d8-e44d-4559-9c1d-abc0663827ef"


@pytest.fixture(scope="module")
def api_client():
    """Base requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get auth token for test author"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_AUTHOR_EMAIL,
        "password": TEST_AUTHOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# =============================================================================
# PROPERTIES ENDPOINTS - Core listing with enriched data
# =============================================================================

class TestPropertiesEndpoint:
    """Test GET /api/properties with new fields"""

    def test_get_properties_returns_enriched_data(self, api_client):
        """GET /api/properties should return properties with price_converted, property_category, etc."""
        response = api_client.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "properties" in data
        assert "total" in data
        assert "pages" in data
        
        if data["properties"]:
            prop = data["properties"][0]
            # Check new enriched fields exist
            assert "price_converted" in prop, "Missing price_converted field"
            assert "property_category" in prop, "Missing property_category field"
            assert "bedrooms" in prop, "Missing bedrooms field"
            assert "bathrooms" in prop, "Missing bathrooms field"
            assert "surface_area" in prop, "Missing surface_area field"
            print(f"✓ Properties endpoint returns enriched data with {len(data['properties'])} properties")

    def test_filter_by_neighborhood(self, api_client):
        """GET /api/properties?neighborhood=X should filter by neighborhood"""
        response = api_client.get(f"{BASE_URL}/api/properties", params={"neighborhood": "Enco5"})
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Neighborhood filter returned {data['total']} results")

    def test_filter_by_property_category(self, api_client):
        """GET /api/properties?property_category=villa should filter by category"""
        response = api_client.get(f"{BASE_URL}/api/properties", params={"property_category": "villa"})
        assert response.status_code == 200
        data = response.json()
        # All returned properties should be villas or empty
        for prop in data["properties"]:
            assert prop.get("property_category") == "villa", f"Expected villa, got {prop.get('property_category')}"
        print(f"✓ Property category filter (villa) returned {data['total']} results")

    def test_filter_by_bedrooms(self, api_client):
        """GET /api/properties?bedrooms=2 should filter by minimum bedrooms"""
        response = api_client.get(f"{BASE_URL}/api/properties", params={"bedrooms": 2})
        assert response.status_code == 200
        data = response.json()
        # All returned properties should have >= 2 bedrooms
        for prop in data["properties"]:
            assert prop.get("bedrooms", 0) >= 2, f"Expected bedrooms >= 2, got {prop.get('bedrooms')}"
        print(f"✓ Bedrooms filter (>=2) returned {data['total']} results")

    def test_get_single_property_enriched(self, api_client):
        """GET /api/properties/{id} should return enriched property data"""
        response = api_client.get(f"{BASE_URL}/api/properties/{EXISTING_PROPERTY_ID}")
        if response.status_code == 404:
            pytest.skip("Test property not found in database")
        assert response.status_code == 200
        
        prop = response.json()
        assert prop["id"] == EXISTING_PROPERTY_ID
        assert "price_converted" in prop
        assert "property_category" in prop
        print(f"✓ Single property {EXISTING_PROPERTY_ID} has enriched data")


# =============================================================================
# MAP MARKERS ENDPOINT
# =============================================================================

class TestMapMarkers:
    """Test GET /api/properties/map/markers"""

    def test_get_map_markers(self, api_client):
        """GET /api/properties/map/markers should return markers with coordinates"""
        response = api_client.get(f"{BASE_URL}/api/properties/map/markers")
        assert response.status_code == 200
        
        markers = response.json()
        assert isinstance(markers, list)
        
        if markers:
            m = markers[0]
            assert "id" in m
            assert "latitude" in m
            assert "longitude" in m
            assert "title" in m
            assert "price" in m
            print(f"✓ Map markers endpoint returned {len(markers)} markers")
        else:
            print("✓ Map markers endpoint returned empty list (no properties with coordinates)")

    def test_map_markers_with_filters(self, api_client):
        """GET /api/properties/map/markers supports filtering"""
        response = api_client.get(f"{BASE_URL}/api/properties/map/markers", params={
            "type": "vente",
            "city": "Conakry"
        })
        assert response.status_code == 200
        markers = response.json()
        print(f"✓ Map markers with filters returned {len(markers)} markers")


# =============================================================================
# NEIGHBORHOODS ENDPOINT
# =============================================================================

class TestNeighborhoods:
    """Test GET /api/properties/neighborhoods"""

    def test_get_neighborhoods(self, api_client):
        """GET /api/properties/neighborhoods should return distinct neighborhoods"""
        response = api_client.get(f"{BASE_URL}/api/properties/neighborhoods")
        assert response.status_code == 200
        
        neighborhoods = response.json()
        assert isinstance(neighborhoods, list)
        print(f"✓ Neighborhoods endpoint returned {len(neighborhoods)} distinct neighborhoods")

    def test_get_neighborhoods_filtered_by_city(self, api_client):
        """GET /api/properties/neighborhoods?city=Conakry should filter by city"""
        response = api_client.get(f"{BASE_URL}/api/properties/neighborhoods", params={"city": "Conakry"})
        assert response.status_code == 200
        neighborhoods = response.json()
        print(f"✓ Neighborhoods in Conakry: {len(neighborhoods)} found")


# =============================================================================
# HEATMAP DATA ENDPOINT
# =============================================================================

class TestHeatmap:
    """Test GET /api/properties/heatmap"""

    def test_get_heatmap_data(self, api_client):
        """GET /api/properties/heatmap should return lat/lng/price data"""
        response = api_client.get(f"{BASE_URL}/api/properties/heatmap")
        assert response.status_code == 200
        
        heatmap_data = response.json()
        assert isinstance(heatmap_data, list)
        
        if heatmap_data:
            point = heatmap_data[0]
            assert "lat" in point
            assert "lng" in point
            assert "price" in point
            assert "intensity" in point
            print(f"✓ Heatmap endpoint returned {len(heatmap_data)} data points")
        else:
            print("✓ Heatmap endpoint returned empty list")


# =============================================================================
# PRICE ESTIMATION ENDPOINT
# =============================================================================

class TestPriceEstimation:
    """Test GET /api/properties/estimate"""

    def test_price_estimation_basic(self, api_client):
        """GET /api/properties/estimate?city=Conakry should return estimation"""
        response = api_client.get(f"{BASE_URL}/api/properties/estimate", params={"city": "Conakry"})
        assert response.status_code == 200
        
        data = response.json()
        assert "estimated_price" in data
        assert "sample_count" in data
        assert "confidence" in data
        assert "price_range" in data
        
        # If we have estimates, check price_converted
        if data["estimated_price"] > 0:
            assert "price_converted" in data
            assert "gnf" in data["price_converted"]
            assert "usd" in data["price_converted"]
            assert "eur" in data["price_converted"]
        print(f"✓ Price estimation: {data['estimated_price']} GNF (confidence: {data['confidence']}, samples: {data['sample_count']})")

    def test_price_estimation_with_filters(self, api_client):
        """GET /api/properties/estimate with additional params"""
        response = api_client.get(f"{BASE_URL}/api/properties/estimate", params={
            "city": "Conakry",
            "property_category": "villa",
            "bedrooms": 3
        })
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Price estimation for villa with 3 bedrooms: {data['estimated_price']} GNF")

    def test_price_estimation_requires_city(self, api_client):
        """GET /api/properties/estimate without city should fail"""
        response = api_client.get(f"{BASE_URL}/api/properties/estimate")
        assert response.status_code == 422, "Expected 422 validation error without city param"
        print("✓ Price estimation correctly requires city parameter")


# =============================================================================
# SAVED PROPERTIES (FAVORITES) - Requires Auth
# =============================================================================

class TestSavedProperties:
    """Test saved properties (favorites) endpoints"""

    def test_get_saved_properties_requires_auth(self, api_client):
        """GET /api/saved-properties without auth should fail"""
        # Remove auth header if present
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        response = client.get(f"{BASE_URL}/api/saved-properties")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Saved properties requires authentication")

    def test_get_saved_properties(self, authenticated_client):
        """GET /api/saved-properties should return user's saved properties"""
        response = authenticated_client.get(f"{BASE_URL}/api/saved-properties")
        assert response.status_code == 200
        
        saved = response.json()
        assert isinstance(saved, list)
        print(f"✓ User has {len(saved)} saved properties")

    def test_toggle_save_property(self, authenticated_client):
        """POST /api/saved-properties/{id} should toggle save status"""
        # First, get current status
        status_resp = authenticated_client.get(f"{BASE_URL}/api/saved-properties/{EXISTING_PROPERTY_ID}/status")
        if status_resp.status_code == 404:
            pytest.skip("Test property not found")
        assert status_resp.status_code == 200
        initial_saved = status_resp.json().get("is_saved", False)
        
        # Toggle save
        toggle_resp = authenticated_client.post(f"{BASE_URL}/api/saved-properties/{EXISTING_PROPERTY_ID}")
        assert toggle_resp.status_code == 200
        action = toggle_resp.json().get("action")
        assert action in ["saved", "unsaved"]
        
        # Verify toggle worked
        if initial_saved:
            assert action == "unsaved"
        else:
            assert action == "saved"
        
        # Toggle back to original state
        authenticated_client.post(f"{BASE_URL}/api/saved-properties/{EXISTING_PROPERTY_ID}")
        print(f"✓ Toggle save property: {action}")

    def test_get_saved_property_status(self, authenticated_client):
        """GET /api/saved-properties/{id}/status should return is_saved boolean"""
        response = authenticated_client.get(f"{BASE_URL}/api/saved-properties/{EXISTING_PROPERTY_ID}/status")
        if response.status_code == 404:
            pytest.skip("Test property not found")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_saved" in data
        assert isinstance(data["is_saved"], bool)
        print(f"✓ Saved status for property: is_saved={data['is_saved']}")


# =============================================================================
# SEARCH ALERTS - Requires Auth
# =============================================================================

class TestSearchAlerts:
    """Test search alerts endpoints"""
    
    created_alert_id = None

    def test_get_search_alerts_requires_auth(self, api_client):
        """GET /api/search-alerts without auth should fail"""
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        response = client.get(f"{BASE_URL}/api/search-alerts")
        assert response.status_code in [401, 403]
        print("✓ Search alerts requires authentication")

    def test_create_search_alert(self, authenticated_client):
        """POST /api/search-alerts should create a new alert"""
        response = authenticated_client.post(f"{BASE_URL}/api/search-alerts", json={
            "city": "Conakry",
            "neighborhood": "TEST_Kipe",
            "type": "vente",
            "property_category": "villa",
            "min_price": 100000000,
            "max_price": 500000000,
            "min_bedrooms": 2
        })
        assert response.status_code == 200, f"Create alert failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["city"] == "Conakry"
        TestSearchAlerts.created_alert_id = data["id"]
        print(f"✓ Created search alert: {data['id']}")

    def test_get_search_alerts(self, authenticated_client):
        """GET /api/search-alerts should return user's alerts"""
        response = authenticated_client.get(f"{BASE_URL}/api/search-alerts")
        assert response.status_code == 200
        
        alerts = response.json()
        assert isinstance(alerts, list)
        print(f"✓ User has {len(alerts)} search alerts")

    def test_delete_search_alert(self, authenticated_client):
        """DELETE /api/search-alerts/{id} should delete the alert"""
        if not TestSearchAlerts.created_alert_id:
            pytest.skip("No alert to delete")
        
        response = authenticated_client.delete(f"{BASE_URL}/api/search-alerts/{TestSearchAlerts.created_alert_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_resp = authenticated_client.get(f"{BASE_URL}/api/search-alerts")
        alerts = get_resp.json()
        assert not any(a["id"] == TestSearchAlerts.created_alert_id for a in alerts)
        print(f"✓ Deleted search alert: {TestSearchAlerts.created_alert_id}")


# =============================================================================
# AGENT PROFILE ENDPOINTS
# =============================================================================

class TestAgentProfile:
    """Test agent profile endpoints"""

    def test_get_agent_profile(self, api_client):
        """GET /api/agents/{agent_id}/profile should return agent info with stats"""
        response = api_client.get(f"{BASE_URL}/api/agents/{AGENT_ID}/profile")
        if response.status_code == 404:
            # Try admin ID
            response = api_client.get(f"{BASE_URL}/api/agents/{ADMIN_ID}/profile")
        
        if response.status_code == 404:
            pytest.skip("Neither agent nor admin found in database")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "username" in data
        assert "role" in data
        assert "stats" in data
        assert "total_properties" in data["stats"]
        assert "available_properties" in data["stats"]
        assert "total_views" in data["stats"]
        print(f"✓ Agent profile: {data['username']} ({data['role']}) - {data['stats']['total_properties']} properties")

    def test_get_agent_properties(self, api_client):
        """GET /api/agents/{agent_id}/properties should return agent's available properties"""
        response = api_client.get(f"{BASE_URL}/api/agents/{AGENT_ID}/properties")
        if response.status_code == 404:
            response = api_client.get(f"{BASE_URL}/api/agents/{ADMIN_ID}/properties")
        
        if response.status_code == 404:
            pytest.skip("Agent not found")
        
        assert response.status_code == 200
        
        properties = response.json()
        assert isinstance(properties, list)
        
        # Verify enriched data
        if properties:
            prop = properties[0]
            assert "price_converted" in prop
            assert "property_category" in prop
        print(f"✓ Agent has {len(properties)} available properties")

    def test_get_nonexistent_agent_returns_404(self, api_client):
        """GET /api/agents/{invalid_id}/profile should return 404"""
        response = api_client.get(f"{BASE_URL}/api/agents/nonexistent-id/profile")
        assert response.status_code == 404
        print("✓ Nonexistent agent returns 404")


# =============================================================================
# Cleanup
# =============================================================================

@pytest.fixture(scope="module", autouse=True)
def cleanup(authenticated_client):
    """Cleanup any TEST_ prefixed data after tests"""
    yield
    # Cleanup search alerts with TEST_ prefix in neighborhood
    try:
        alerts_resp = authenticated_client.get(f"{BASE_URL}/api/search-alerts")
        if alerts_resp.status_code == 200:
            for alert in alerts_resp.json():
                if alert.get("neighborhood", "").startswith("TEST_"):
                    authenticated_client.delete(f"{BASE_URL}/api/search-alerts/{alert['id']}")
    except:
        pass
