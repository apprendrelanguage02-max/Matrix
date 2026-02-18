"""
Test Responsive Design and Upload Functionality
Tests for: Upload API, Media serving, Responsive breakpoints verification
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://responsive-redesign-8.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"

# Minimal valid JPEG bytes for upload testing
MINIMAL_JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
)


class TestHealthAndAPI:
    """Basic API health tests"""
    
    def test_api_root_accessible(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Matrix News" in data.get("message", "")
        print("✅ API root accessible")
    
    def test_categories_endpoint(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 5
        print(f"✅ Categories: {data['categories']}")


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_admin(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "auteur"
        print("✅ Admin login successful")
        return data["token"]


class TestUploadAPI:
    """Upload API tests - Key functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_upload_jpg_image_success(self, auth_token):
        """Test uploading a valid JPG image returns URL"""
        files = {"file": ("test_image.jpg", MINIMAL_JPEG, "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "url" in data, "Response should contain 'url'"
        assert "type" in data, "Response should contain 'type'"
        assert "filename" in data, "Response should contain 'filename'"
        
        # Verify URL format
        assert data["type"] == "image"
        assert data["url"].endswith(".jpg")
        assert "/api/media/images/" in data["url"]
        
        print(f"✅ Upload JPG success - URL: {data['url']}")
        return data["url"]
    
    def test_upload_png_image_success(self, auth_token):
        """Test uploading a PNG image"""
        # Minimal PNG bytes (1x1 transparent pixel)
        minimal_png = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        )
        files = {"file": ("test_image.png", minimal_png, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "image"
        assert data["url"].endswith(".png")
        print(f"✅ Upload PNG success - URL: {data['url']}")
    
    def test_upload_webp_image_success(self, auth_token):
        """Test uploading a WEBP image"""
        # Minimal WEBP bytes
        minimal_webp = base64.b64decode(
            'UklGRhYAAABXRUJQVlA4TAoAAAAvAAAAAAfQ//73fw=='
        )
        files = {"file": ("test_image.webp", minimal_webp, "image/webp")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "image"
        assert data["url"].endswith(".webp")
        print(f"✅ Upload WEBP success - URL: {data['url']}")
    
    def test_upload_invalid_type_rejected(self, auth_token):
        """Test uploading invalid file type is rejected"""
        files = {"file": ("test.txt", b"Hello World", "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 400
        data = response.json()
        assert "Type de fichier non autorisé" in data.get("detail", "")
        print("✅ Invalid file type rejected correctly")
    
    def test_upload_without_auth_returns_403(self):
        """Test upload without authentication returns 403"""
        files = {"file": ("test.jpg", MINIMAL_JPEG, "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 403
        print("✅ Upload without auth rejected (403)")


class TestMediaServing:
    """Test uploaded media is accessible"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_uploaded_media_is_accessible(self, auth_token):
        """Upload an image and verify it can be accessed via /api/media/"""
        # Upload image
        files = {"file": ("accessibility_test.jpg", MINIMAL_JPEG, "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        data = upload_response.json()
        
        # Access the uploaded file
        media_url = data["url"]
        media_response = requests.get(media_url)
        
        assert media_response.status_code == 200, f"Media URL not accessible: {media_url}"
        assert len(media_response.content) > 0, "Media content should not be empty"
        print(f"✅ Uploaded media accessible at: {media_url}")


class TestArticlesWithUpload:
    """Test articles with uploaded cover images"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_create_article_with_uploaded_cover(self, auth_token):
        """Test creating an article with an uploaded cover image"""
        # First upload an image
        files = {"file": ("cover.jpg", MINIMAL_JPEG, "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        image_url = upload_response.json()["url"]
        
        # Create article with uploaded image
        article_data = {
            "title": "TEST_Article avec image uploadée",
            "content": "<p>Ceci est un test d'article avec une image de couverture uploadée.</p>",
            "category": "Technologie",
            "image_url": image_url
        }
        create_response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=article_data
        )
        assert create_response.status_code == 200
        article = create_response.json()
        
        # Verify article has the uploaded image URL
        assert article["image_url"] == image_url
        assert "/api/media/images/" in article["image_url"]
        print(f"✅ Article created with uploaded cover: {article['id']}")
        
        # Verify article GET returns image URL
        get_response = requests.get(f"{BASE_URL}/api/articles/{article['id']}")
        assert get_response.status_code == 200
        fetched_article = get_response.json()
        assert fetched_article["image_url"] == image_url
        print("✅ Article image URL persisted and retrieved correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/articles/{article['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print("✅ Test article cleaned up")


class TestPropertiesAPI:
    """Test Properties API for Immobilier section"""
    
    def test_get_properties_public(self):
        """Test public properties endpoint"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "total" in data
        assert "pages" in data
        print(f"✅ Properties endpoint: {data['total']} total properties")
    
    def test_filter_properties_by_type(self):
        """Test filtering properties by type"""
        response = requests.get(f"{BASE_URL}/api/properties?type=vente")
        assert response.status_code == 200
        data = response.json()
        # All returned properties should be type=vente if any exist
        for prop in data["properties"]:
            assert prop["type"] == "vente"
        print(f"✅ Properties filter by type=vente works")
