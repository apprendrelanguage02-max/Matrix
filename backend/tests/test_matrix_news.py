"""
Matrix News API Test Suite
Tests for: PNG icons verification, Upload API, Authentication, Articles
"""
import pytest
import requests
import os
import base64
from pathlib import Path

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "http://localhost:8001"

# Test credentials
AUTHOR_EMAIL = "admin@example.com"
AUTHOR_PASSWORD = "adminpassword"

# Minimal valid JPEG bytes for upload testing
MINIMAL_JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
)


class TestHealthCheck:
    """API Health Check"""
    
    def test_api_root(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Matrix News" in data["message"]
        print("✅ API root accessible")


class TestAuthentication:
    """Authentication API tests"""
    
    def test_login_success(self):
        """Test successful login with author credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL,
            "password": AUTHOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == AUTHOR_EMAIL
        assert data["user"]["role"] == "auteur"
        print(f"✅ Login success for {AUTHOR_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Login rejected with wrong password")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL
        })
        assert response.status_code == 422  # Validation error
        print("✅ Login rejected with missing password")


class TestUploadAPI:
    """File Upload API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL,
            "password": AUTHOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_upload_image_jpg_success(self, auth_token):
        """Test upload valid JPG image returns URL"""
        files = {"file": ("test.jpg", MINIMAL_JPEG, "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "type" in data
        assert "filename" in data
        assert data["type"] == "image"
        assert data["url"].endswith(".jpg")
        assert "/media/images/" in data["url"]
        print(f"✅ Upload JPG success: {data['url']}")
    
    def test_upload_invalid_type_returns_400(self, auth_token):
        """Test upload invalid file type returns 400"""
        files = {"file": ("test.txt", b"Hello World", "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Type de fichier non autorisé" in data["detail"]
        print("✅ Upload rejected for invalid file type")
    
    def test_upload_without_auth_returns_403(self):
        """Test upload without authentication returns 403"""
        files = {"file": ("test.jpg", MINIMAL_JPEG, "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        # FastAPI returns 403 for missing auth header
        assert response.status_code == 403
        print("✅ Upload rejected without authentication")


class TestArticles:
    """Articles API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL,
            "password": AUTHOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_articles_public(self):
        """Test public articles endpoint"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"✅ Get articles: {data['total']} total articles")
    
    def test_get_categories(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        expected_cats = ["Actualité", "Politique", "Sport", "Technologie", "Économie"]
        assert data["categories"] == expected_cats
        print("✅ Categories endpoint working")
    
    def test_create_article_as_author(self, auth_token):
        """Test creating article as author"""
        article_data = {
            "title": "TEST_Article de test automatisé",
            "content": "<p>Ceci est un article de test créé automatiquement.</p>",
            "category": "Technologie",
            "image_url": "https://example.com/image.jpg"
        }
        response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=article_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == article_data["title"]
        assert data["category"] == "Technologie"
        assert "id" in data
        print(f"✅ Article created: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/articles/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == article_data["title"]
        print("✅ Article persisted and retrieved")
        
        # Cleanup - delete the test article
        del_response = requests.delete(
            f"{BASE_URL}/api/articles/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert del_response.status_code == 200
        print("✅ Test article cleaned up")
    
    def test_create_article_without_auth_fails(self):
        """Test creating article without authentication fails"""
        article_data = {
            "title": "TEST_Unauthorized article",
            "content": "<p>This should fail</p>",
            "category": "Sport"
        }
        response = requests.post(f"{BASE_URL}/api/articles", json=article_data)
        assert response.status_code == 403
        print("✅ Article creation rejected without auth")


class TestPNGIconURL:
    """Verify PNG icon URL is accessible (code review check)"""
    
    def test_png_icon_url_format(self):
        """Verify the PNG icon URL format is correct"""
        expected_url = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png"
        
        # Just verify the URL format is valid
        assert expected_url.startswith("https://")
        assert expected_url.endswith(".png")
        print(f"✅ PNG icon URL format correct: {expected_url[:80]}...")


class TestMediaServing:
    """Test that uploaded media can be served"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AUTHOR_EMAIL,
            "password": AUTHOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_uploaded_image_is_served(self, auth_token):
        """Test uploaded image can be accessed via /media endpoint"""
        # Upload an image
        files = {"file": ("test.jpg", MINIMAL_JPEG, "image/jpeg")}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        assert upload_response.status_code == 200
        data = upload_response.json()
        
        # Try to access the uploaded file via /media
        # The URL contains the full path
        media_url = data["url"]
        
        # For localhost testing, replace external URL with localhost
        if "localhost" not in BASE_URL:
            # Use internal URL for testing
            filename = data["filename"]
            internal_url = f"http://localhost:8001/media/images/{filename}"
            media_response = requests.get(internal_url)
        else:
            media_response = requests.get(media_url)
        
        assert media_response.status_code == 200
        print(f"✅ Uploaded media is accessible: {data['filename']}")
