"""
Test: Geolocation Nearby Properties Feature - Iteration 24
Tests the GET /api/properties/nearby endpoint with various lat/lng/radius combinations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNearbyPropertiesAPI:
    """Tests for /api/properties/nearby endpoint"""
    
    def test_nearby_properties_with_large_radius(self):
        """Test nearby properties with 10km radius returns properties sorted by distance"""
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 10
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify response structure
        assert "properties" in data, "Response should have 'properties' key"
        assert "total" in data, "Response should have 'total' key"
        assert "radius_km" in data, "Response should have 'radius_km' key"
        assert "center" in data, "Response should have 'center' key"
        
        # Verify center coordinates
        assert data["center"]["lat"] == 9.555
        assert data["center"]["lng"] == -13.65
        assert data["radius_km"] == 10.0
        
        # Verify properties have distance_km field
        if len(data["properties"]) > 0:
            first_prop = data["properties"][0]
            assert "distance_km" in first_prop, "Properties should have distance_km field"
            assert "id" in first_prop
            assert "title" in first_prop
            assert "latitude" in first_prop
            assert "longitude" in first_prop
            
            # Verify sorting by distance
            if len(data["properties"]) > 1:
                distances = [p["distance_km"] for p in data["properties"]]
                assert distances == sorted(distances), "Properties should be sorted by distance ascending"
        
        print(f"✓ Test passed: {data['total']} properties returned within 10km radius")
    
    def test_nearby_properties_with_small_radius(self):
        """Test nearby properties with 1km radius returns fewer results"""
        # First get count with large radius
        response_large = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 10
        })
        total_large = response_large.json()["total"]
        
        # Then test with small radius
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["radius_km"] == 1.0
        # Small radius should return fewer or equal results
        assert data["total"] <= total_large, "Smaller radius should return fewer or equal properties"
        
        # All properties should be within 1km
        for prop in data["properties"]:
            assert prop["distance_km"] <= 1.0, f"Property distance {prop['distance_km']}km exceeds 1km radius"
        
        print(f"✓ Test passed: {data['total']} properties within 1km (vs {total_large} within 10km)")
    
    def test_nearby_properties_validates_required_params(self):
        """Test that lat and lng are required parameters"""
        # Missing both lat and lng
        response = requests.get(f"{BASE_URL}/api/properties/nearby")
        assert response.status_code == 422, "Should return 422 for missing required params"
        
        data = response.json()
        assert "detail" in data
        
        # Missing only lng
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={"lat": 9.555})
        assert response.status_code == 422
        
        # Missing only lat
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={"lng": -13.650})
        assert response.status_code == 422
        
        print("✓ Test passed: API properly validates required lat/lng parameters")
    
    def test_nearby_properties_distance_accuracy(self):
        """Test that distance_km is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 20
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # All properties should have distance_km within the requested radius
        for prop in data["properties"]:
            assert "distance_km" in prop, "Property should have distance_km"
            assert prop["distance_km"] <= 20.0, f"Property distance {prop['distance_km']}km exceeds 20km radius"
            assert prop["distance_km"] >= 0, "Distance should be non-negative"
        
        print(f"✓ Test passed: All {data['total']} properties have valid distance_km values")
    
    def test_nearby_properties_with_type_filter(self):
        """Test nearby properties with type filter"""
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 20,
            "type": "vente"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # All properties should be of type "vente"
        for prop in data["properties"]:
            assert prop["type"] == "vente", f"Property type should be 'vente', got '{prop['type']}'"
        
        print(f"✓ Test passed: {data['total']} 'vente' properties returned")
    
    def test_nearby_properties_default_radius(self):
        """Test that default radius is 5km when not specified"""
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Default radius should be 5
        assert data["radius_km"] == 5.0, f"Default radius should be 5km, got {data['radius_km']}km"
        
        # All properties should be within 5km
        for prop in data["properties"]:
            assert prop["distance_km"] <= 5.0
        
        print(f"✓ Test passed: Default 5km radius applied, {data['total']} properties returned")
    
    def test_nearby_properties_response_includes_price_conversion(self):
        """Test that GNF properties include price_converted field"""
        response = requests.get(f"{BASE_URL}/api/properties/nearby", params={
            "lat": 9.555,
            "lng": -13.650,
            "radius_km": 20
        })
        
        assert response.status_code == 200
        data = response.json()
        
        for prop in data["properties"]:
            if prop.get("currency", "GNF") == "GNF":
                assert "price_converted" in prop, "GNF properties should have price_converted"
                assert "usd" in prop["price_converted"]
                assert "eur" in prop["price_converted"]
        
        print(f"✓ Test passed: Price conversion included in response")


class TestMapMarkersAPI:
    """Tests for /api/properties/map/markers endpoint (regular map mode)"""
    
    def test_map_markers_returns_data(self):
        """Test map markers endpoint returns properties with coordinates"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of markers"
        
        if len(data) > 0:
            marker = data[0]
            assert "id" in marker
            assert "latitude" in marker or marker.get("latitude") is not None
            assert "longitude" in marker or marker.get("longitude") is not None
            
        print(f"✓ Test passed: {len(data)} map markers returned")
    
    def test_map_markers_with_type_filter(self):
        """Test map markers with type filter"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers", params={"type": "location"})
        
        assert response.status_code == 200
        data = response.json()
        
        for marker in data:
            assert marker["type"] == "location"
        
        print(f"✓ Test passed: {len(data)} location markers returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
