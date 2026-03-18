"""
Iteration 31 Test Suite - Bug fixes and new features:
1. Property image URL filter accepts /api/media/ prefix (bug fix)
2. Admin user status badges (actif/suspendu/pending_verification)
3. Procedure main_image_url field in create/update endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPropertyImageURLBugFix:
    """Test that property creation/update accepts relative cloud URLs (/api/media/)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinee@gmail.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed - skipping property tests")
        yield
        
    def test_create_property_with_http_url(self):
        """POST /api/properties - should accept http:// URLs"""
        test_images = ["https://example.com/image1.jpg", "http://example.com/image2.jpg"]
        payload = {
            "title": f"TEST_Property_HTTP_{uuid.uuid4().hex[:8]}",
            "type": "vente",
            "price": 100000000,
            "currency": "GNF",
            "city": "Conakry",
            "neighborhood": "Kaloum",
            "address": "Test address",
            "description": "Test property with HTTP URLs",
            "images": test_images,
            "seller_name": "Test Agent",
            "seller_phone": "123456789",
            "property_category": "appartement"
        }
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=self.headers)
        print(f"Create property with HTTP URLs: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert len(data.get("images", [])) == 2, f"Expected 2 images, got {len(data.get('images', []))}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{data['id']}", headers=self.headers)
        print("PASS: Property created with HTTP URLs")
        
    def test_create_property_with_api_media_url(self):
        """POST /api/properties - should accept /api/media/ relative URLs (BUG FIX)"""
        test_images = [
            "/api/media/cloud/test-image-1.jpg",
            "/api/media/cloud/uploads/test-image-2.png"
        ]
        payload = {
            "title": f"TEST_Property_ApiMedia_{uuid.uuid4().hex[:8]}",
            "type": "location",
            "price": 50000000,
            "currency": "GNF",
            "city": "Conakry",
            "neighborhood": "Ratoma",
            "address": "Test address",
            "description": "Test property with /api/media/ URLs",
            "images": test_images,
            "seller_name": "Test Agent",
            "seller_phone": "123456789",
            "property_category": "maison"
        }
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=self.headers)
        print(f"Create property with /api/media/ URLs: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        # This is the key assertion - /api/media/ URLs should NOT be filtered out
        assert len(data.get("images", [])) == 2, f"BUG: Expected 2 images but got {len(data.get('images', []))}. /api/media/ URLs may be filtered out!"
        for img in data.get("images", []):
            assert img.startswith("/api/media/"), f"Image URL should start with /api/media/: {img}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{data['id']}", headers=self.headers)
        print("PASS: Property created with /api/media/ URLs")
        
    def test_create_property_with_mixed_urls(self):
        """POST /api/properties - should accept mix of http and /api/media/ URLs"""
        test_images = [
            "https://example.com/image1.jpg",
            "/api/media/cloud/test-image.jpg",
            "http://cdn.example.com/image2.png"
        ]
        payload = {
            "title": f"TEST_Property_Mixed_{uuid.uuid4().hex[:8]}",
            "type": "vente",
            "price": 200000000,
            "currency": "GNF",
            "city": "Conakry",
            "neighborhood": "Matam",
            "address": "Test address",
            "description": "Test property with mixed URL types",
            "images": test_images,
            "seller_name": "Test Agent",
            "seller_phone": "123456789",
            "property_category": "terrain"
        }
        response = requests.post(f"{BASE_URL}/api/properties", json=payload, headers=self.headers)
        print(f"Create property with mixed URLs: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert len(data.get("images", [])) == 3, f"Expected 3 images, got {len(data.get('images', []))}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{data['id']}", headers=self.headers)
        print("PASS: Property created with mixed URL types")
        
    def test_update_property_with_api_media_url(self):
        """PUT /api/properties/{id} - should accept /api/media/ URLs on update (BUG FIX)"""
        # First create a property
        create_payload = {
            "title": f"TEST_Property_Update_{uuid.uuid4().hex[:8]}",
            "type": "vente",
            "price": 100000000,
            "currency": "GNF",
            "city": "Conakry",
            "neighborhood": "Kaloum",
            "address": "Test address",
            "description": "Test property for update",
            "images": ["https://example.com/initial.jpg"],
            "seller_name": "Test Agent",
            "seller_phone": "123456789",
            "property_category": "appartement"
        }
        create_response = requests.post(f"{BASE_URL}/api/properties", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Update with /api/media/ URLs
        update_payload = {
            "images": [
                "/api/media/cloud/updated-image-1.jpg",
                "/api/media/cloud/updated-image-2.jpg"
            ]
        }
        update_response = requests.put(f"{BASE_URL}/api/properties/{property_id}", json=update_payload, headers=self.headers)
        print(f"Update property with /api/media/ URLs: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        assert len(data.get("images", [])) == 2, f"BUG: Expected 2 images but got {len(data.get('images', []))}. /api/media/ URLs may be filtered out on update!"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{property_id}", headers=self.headers)
        print("PASS: Property updated with /api/media/ URLs")


class TestProcedureMainImageUrl:
    """Test main_image_url field in procedures API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinee@gmail.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed - skipping procedure tests")
        yield
        
    def test_create_procedure_with_main_image_url(self):
        """POST /api/procedures - should accept main_image_url field"""
        payload = {
            "title": f"TEST_Procedure_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure with main image",
            "category": "visa_immigration",
            "country": "canada",
            "language": "fr",
            "complexity": "modere",
            "status": "draft",
            "main_image_url": "https://example.com/procedure-main-image.jpg",
            "video_url": "https://youtube.com/watch?v=test123",
            "steps": []
        }
        response = requests.post(f"{BASE_URL}/api/procedures", json=payload, headers=self.headers)
        print(f"Create procedure with main_image_url: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data.get("main_image_url") == "https://example.com/procedure-main-image.jpg", \
            f"main_image_url not saved correctly: {data.get('main_image_url')}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{data['id']}", headers=self.headers)
        print("PASS: Procedure created with main_image_url")
        
    def test_update_procedure_main_image_url(self):
        """PUT /api/procedures/{id} - should accept main_image_url update"""
        # Create procedure first
        create_payload = {
            "title": f"TEST_Procedure_Update_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure for update",
            "category": "etudes",
            "country": "france",
            "language": "fr",
            "complexity": "facile",
            "status": "draft",
            "steps": []
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        procedure_id = create_response.json()["id"]
        
        # Update with main_image_url
        update_payload = {
            "main_image_url": "https://cdn.example.com/updated-procedure-image.png"
        }
        update_response = requests.put(f"{BASE_URL}/api/procedures/{procedure_id}", json=update_payload, headers=self.headers)
        print(f"Update procedure main_image_url: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        assert data.get("main_image_url") == "https://cdn.example.com/updated-procedure-image.png", \
            f"main_image_url not updated correctly: {data.get('main_image_url')}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{procedure_id}", headers=self.headers)
        print("PASS: Procedure updated with main_image_url")
        
    def test_get_procedure_returns_main_image_url(self):
        """GET /api/procedures/{id} - should return main_image_url in response"""
        # Create procedure with main_image_url
        payload = {
            "title": f"TEST_Procedure_Get_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure for GET",
            "category": "documents_administratifs",
            "country": "guinee",
            "language": "fr",
            "complexity": "difficile",
            "status": "published",
            "main_image_url": "https://example.com/get-test-image.jpg",
            "steps": []
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        procedure_id = create_response.json()["id"]
        
        # GET the procedure
        get_response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        print(f"GET procedure with main_image_url: {get_response.status_code}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert "main_image_url" in data, "main_image_url field not in GET response"
        assert data.get("main_image_url") == "https://example.com/get-test-image.jpg"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{procedure_id}", headers=self.headers)
        print("PASS: GET procedure returns main_image_url")


class TestAdminUserStatusBadges:
    """Test admin user status returns for badge display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinee@gmail.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
        yield
        
    def test_admin_users_endpoint_returns_status(self):
        """GET /api/admin/users - should return user status field"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        print(f"GET admin users: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        
        # Check that users have status field
        if data["users"]:
            first_user = data["users"][0]
            assert "status" in first_user or first_user.get("status") is not None or "status" in first_user.keys(), \
                f"User should have 'status' field. Keys: {first_user.keys()}"
            print(f"Sample user status: {first_user.get('status', 'N/A')}")
            
        print("PASS: Admin users endpoint returns status field")
        
    def test_user_status_values(self):
        """Verify expected status values exist in system"""
        response = requests.get(f"{BASE_URL}/api/admin/users?limit=100", headers=self.headers)
        assert response.status_code == 200
        
        users = response.json().get("users", [])
        statuses_found = set()
        for user in users:
            status = user.get("status")
            if status:
                statuses_found.add(status)
                
        print(f"User statuses found in DB: {statuses_found}")
        
        # At minimum, we expect 'actif' to exist for admin user
        valid_statuses = {"actif", "suspendu", "pending_verification", "pending"}
        for status in statuses_found:
            assert status in valid_statuses, f"Unknown status '{status}' found"
            
        print("PASS: User status values are valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
