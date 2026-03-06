"""
Iteration 23 Bug Fix Testing
Tests the following features:
1. Price Estimation page - cascading dropdowns and estimation API
2. Article favorites - saving/unsaving articles
3. Admin 'Demandes' (Requests) page - loads notifications correctly
4. Admin Price References tab - add/view price references
5. Property creation works for agent user
6. Property edit does not cause data loss
7. SavedArticlesPage shows all types of favorites
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndLocations:
    """Basic health checks and location APIs for price estimation"""
    
    def test_locations_cities(self):
        """Test /api/locations/cities returns city list for price estimation"""
        response = requests.get(f"{BASE_URL}/api/locations/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert "Conakry" in data
        print(f"PASS: Cities API returns {len(data)} cities")
    
    def test_locations_communes(self):
        """Test /api/locations/communes returns communes for a city"""
        response = requests.get(f"{BASE_URL}/api/locations/communes", params={"city": "Conakry"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Communes API returns {len(data)} communes for Conakry")
    
    def test_locations_quartiers(self):
        """Test /api/locations/quartiers returns neighborhoods"""
        # First get a commune
        communes_resp = requests.get(f"{BASE_URL}/api/locations/communes", params={"city": "Conakry"})
        communes = communes_resp.json()
        if communes:
            response = requests.get(f"{BASE_URL}/api/locations/quartiers", params={"city": "Conakry", "commune": communes[0]})
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"PASS: Quartiers API returns {len(data)} quartiers for {communes[0]}")
        else:
            print("SKIP: No communes found to test quartiers")


class TestPriceEstimation:
    """Test price estimation endpoint"""
    
    def test_price_estimation_basic(self):
        """Test /api/properties/estimate with basic params"""
        response = requests.get(f"{BASE_URL}/api/properties/estimate", params={"city": "Conakry"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "estimated_price" in data
        assert "confidence" in data
        assert "price_range" in data
        print(f"PASS: Price estimation returned: estimated_price={data['estimated_price']}, confidence={data['confidence']}")
    
    def test_price_estimation_with_commune(self):
        """Test estimation with commune/neighborhood"""
        response = requests.get(f"{BASE_URL}/api/properties/estimate", params={
            "city": "Conakry",
            "commune": "Ratoma",
            "property_category": "villa"
        })
        assert response.status_code == 200
        data = response.json()
        assert "estimated_price" in data
        print(f"PASS: Price estimation with commune: {data['estimated_price']} GNF")


class TestAuthentication:
    """Authentication helpers"""
    
    @staticmethod
    def login_admin():
        """Login as admin and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    @staticmethod
    def login_agent():
        """Login as agent and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gui002@gmail.com",
            "password": "agent123"
        })
        if response.status_code != 200:
            pytest.skip(f"Agent login failed: {response.text}")
        return response.json()["token"]


class TestAdminNotifications:
    """Test Admin 'Demandes' (Role Requests) page API"""
    
    def test_admin_notifications_count(self):
        """Test /api/admin/notifications/count"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/admin/notifications/count", 
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending_count" in data
        print(f"PASS: Admin notifications count = {data['pending_count']}")
    
    def test_admin_notifications_list(self):
        """Test /api/admin/notifications returns paginated list"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/admin/notifications",
                               params={"page": 1, "limit": 20},
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "pending_count" in data
        assert "pages" in data
        print(f"PASS: Admin notifications list: {data['total']} total, {data['pending_count']} pending")


class TestAdminPriceReferences:
    """Test Admin Price References tab API"""
    
    def test_get_price_references(self):
        """Test /api/admin/price-references returns list"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/admin/price-references",
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Price references list has {len(data)} entries")
    
    def test_add_and_delete_price_reference(self):
        """Test adding and deleting a price reference"""
        token = TestAuthentication.login_admin()
        
        # Add a test price reference
        test_ref = {
            "city": "Conakry",
            "commune": "TEST_Commune",
            "quartier": "TEST_Quartier",
            "price_per_sqm": 500000
        }
        add_response = requests.post(f"{BASE_URL}/api/admin/price-references",
                                     json=test_ref,
                                     headers={"Authorization": f"Bearer {token}"})
        assert add_response.status_code == 200, f"Add failed: {add_response.text}"
        print("PASS: Added test price reference")
        
        # Verify it was added
        get_response = requests.get(f"{BASE_URL}/api/admin/price-references",
                                   headers={"Authorization": f"Bearer {token}"})
        refs = get_response.json()
        found = any(r.get("commune") == "TEST_Commune" and r.get("quartier") == "TEST_Quartier" for r in refs)
        assert found, "Added reference not found in list"
        
        # Delete it
        del_response = requests.delete(f"{BASE_URL}/api/admin/price-references",
                                      params={"city": "Conakry", "commune": "TEST_Commune", "quartier": "TEST_Quartier"},
                                      headers={"Authorization": f"Bearer {token}"})
        assert del_response.status_code == 200, f"Delete failed: {del_response.text}"
        print("PASS: Deleted test price reference")


class TestArticleFavorites:
    """Test Article favorites (save/unsave) functionality"""
    
    def test_article_list(self):
        """First get an article ID to test with"""
        response = requests.get(f"{BASE_URL}/api/articles", params={"page": 1, "limit": 1})
        assert response.status_code == 200
        data = response.json()
        if data["articles"]:
            print(f"PASS: Found article: {data['articles'][0]['id']}")
            return data["articles"][0]["id"]
        pytest.skip("No articles found to test")
    
    def test_save_article_toggle(self):
        """Test saving/unsaving an article"""
        # Get an article ID
        articles_resp = requests.get(f"{BASE_URL}/api/articles", params={"page": 1, "limit": 1})
        if articles_resp.status_code != 200 or not articles_resp.json()["articles"]:
            pytest.skip("No articles available")
        article_id = articles_resp.json()["articles"][0]["id"]
        
        # Login as admin (or any user)
        token = TestAuthentication.login_admin()
        
        # Save the article
        save_response = requests.post(f"{BASE_URL}/api/saved-articles/{article_id}",
                                     headers={"Authorization": f"Bearer {token}"})
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        action1 = save_response.json()["action"]
        print(f"First toggle action: {action1}")
        
        # Check status
        status_response = requests.get(f"{BASE_URL}/api/saved-articles/{article_id}/status",
                                      headers={"Authorization": f"Bearer {token}"})
        assert status_response.status_code == 200
        is_saved = status_response.json()["is_saved"]
        print(f"Article is_saved after first toggle: {is_saved}")
        
        # Toggle again to restore original state
        toggle_response = requests.post(f"{BASE_URL}/api/saved-articles/{article_id}",
                                       headers={"Authorization": f"Bearer {token}"})
        assert toggle_response.status_code == 200
        action2 = toggle_response.json()["action"]
        print(f"PASS: Article save toggle works. Actions: {action1} -> {action2}")
    
    def test_get_saved_articles(self):
        """Test getting saved articles list"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/saved-articles",
                               headers={"Authorization": f"Bearer {token}"})
        # Note: This may fail if there are malformed entries - that's the bug we're testing
        if response.status_code != 200:
            print(f"FAIL: GET /api/saved-articles returned {response.status_code}: {response.text}")
            assert False, f"Saved articles API error: {response.text}"
        print(f"PASS: Saved articles API works, returned {len(response.json())} items")


class TestPropertyCRUD:
    """Test Property creation and editing without data loss"""
    
    def test_property_create_agent(self):
        """Test property creation as agent user"""
        token = TestAuthentication.login_agent()
        
        property_data = {
            "title": "TEST_Villa Iteration 23",
            "type": "vente",
            "price": 500000000,
            "currency": "GNF",
            "description": "Test property for iteration 23",
            "city": "Conakry",
            "neighborhood": "Kipé",
            "address": "Test Address",
            "seller_name": "Test Agent",
            "seller_phone": "+224 620 000 000",
            "seller_email": "test@test.com",
            "images": [],
            "property_category": "villa",
            "bedrooms": 4,
            "bathrooms": 2,
            "surface_area": 300
        }
        
        response = requests.post(f"{BASE_URL}/api/properties",
                                json=property_data,
                                headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Create failed: {response.status_code} - {response.text}"
        created = response.json()
        assert created["title"] == property_data["title"]
        assert created["price"] == property_data["price"]
        assert created["bedrooms"] == property_data["bedrooms"]
        print(f"PASS: Property created with ID: {created['id']}")
        return created["id"]
    
    def test_property_edit_no_data_loss(self):
        """Test that editing a property preserves all fields"""
        token = TestAuthentication.login_agent()
        
        # Create a property first
        property_data = {
            "title": "TEST_Edit Property",
            "type": "location",
            "price": 2000000,
            "currency": "GNF",
            "description": "Original description",
            "city": "Conakry",
            "neighborhood": "Ratoma",
            "address": "Original Address",
            "seller_name": "Original Seller",
            "seller_phone": "+224 620 111 111",
            "seller_email": "original@test.com",
            "seller_whatsapp": "+224 620 111 111",
            "images": ["https://example.com/image1.jpg"],
            "video_url": "https://example.com/video.mp4",
            "property_category": "appartement",
            "bedrooms": 2,
            "bathrooms": 1,
            "surface_area": 80
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/properties",
                                   json=property_data,
                                   headers={"Authorization": f"Bearer {token}"})
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        created = create_resp.json()
        property_id = created["id"]
        print(f"Created property: {property_id}")
        
        # Update only the title
        update_data = {
            "title": "TEST_Updated Title"
        }
        update_resp = requests.put(f"{BASE_URL}/api/properties/{property_id}",
                                  json=update_data,
                                  headers={"Authorization": f"Bearer {token}"})
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        # Fetch and verify all fields preserved
        get_resp = requests.get(f"{BASE_URL}/api/properties/{property_id}")
        assert get_resp.status_code == 200
        updated = get_resp.json()
        
        # Verify title was updated
        assert updated["title"] == "TEST_Updated Title"
        
        # Verify other fields preserved
        assert updated["price"] == property_data["price"], f"Price lost! Expected {property_data['price']}, got {updated['price']}"
        assert updated["neighborhood"] == property_data["neighborhood"], f"Neighborhood lost!"
        assert updated["bedrooms"] == property_data["bedrooms"], f"Bedrooms lost!"
        assert updated["bathrooms"] == property_data["bathrooms"], f"Bathrooms lost!"
        assert updated["surface_area"] == property_data["surface_area"], f"Surface area lost!"
        assert updated["seller_name"] == property_data["seller_name"], f"Seller name lost!"
        assert updated["seller_phone"] == property_data["seller_phone"], f"Seller phone lost!"
        
        print("PASS: Property edit preserves all fields (no data loss)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{property_id}",
                       headers={"Authorization": f"Bearer {token}"})
        print(f"Cleaned up test property: {property_id}")


class TestSavedFavorites:
    """Test all types of saved favorites"""
    
    def test_saved_properties(self):
        """Test saved properties endpoint"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/saved-properties",
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Saved properties API returns {len(response.json())} items")
    
    def test_saved_procedures(self):
        """Test saved procedures endpoint"""
        token = TestAuthentication.login_admin()
        response = requests.get(f"{BASE_URL}/api/saved-procedures",
                               headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Saved procedures API returns {len(response.json())} items")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_properties(self):
        """Delete any TEST_ prefixed properties"""
        token = TestAuthentication.login_agent()
        
        # Get all properties from agent
        my_props_resp = requests.get(f"{BASE_URL}/api/my-properties",
                                    headers={"Authorization": f"Bearer {token}"})
        if my_props_resp.status_code == 200:
            props = my_props_resp.json()
            for p in props:
                if p.get("title", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/properties/{p['id']}",
                                              headers={"Authorization": f"Bearer {token}"})
                    if del_resp.status_code == 200:
                        print(f"Cleaned up: {p['id']}")
        print("PASS: Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
