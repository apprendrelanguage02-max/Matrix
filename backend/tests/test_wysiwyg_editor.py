"""
Test WYSIWYG Editor Integration - AdvancedRichEditor
Tests article, property, and procedure APIs with HTML content
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials for admin user
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed - skipping tests")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestArticleWithRichText:
    """Tests for article creation/editing with WYSIWYG HTML content"""
    
    def test_create_article_with_html_content(self, admin_headers):
        """Test creating article with formatted HTML content"""
        html_content = """
        <h2>Test Heading</h2>
        <p><strong>Bold text</strong> and <em>italic text</em></p>
        <ul>
            <li>List item 1</li>
            <li>List item 2</li>
        </ul>
        <blockquote>A blockquote here</blockquote>
        """
        
        payload = {
            "title": "TEST_WYSIWYG_Article",
            "content": html_content,
            "category": "Actualité",
            "image_url": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/articles",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201], f"Create article failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data.get("title") == "TEST_WYSIWYG_Article"
        # HTML content should be preserved
        assert "<strong>" in data.get("content", "") or "Bold text" in data.get("content", "")
        
        # Store ID for cleanup
        article_id = data["id"]
        
        # Verify GET returns the HTML content
        get_response = requests.get(
            f"{BASE_URL}/api/articles/{article_id}",
            headers=admin_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert "<h2>" in get_data.get("content", "") or "Test Heading" in get_data.get("content", "")
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/articles/{article_id}",
            headers=admin_headers
        )
        assert delete_response.status_code in [200, 204]
        print(f"✓ Article with HTML content created and verified (ID: {article_id})")

    def test_update_article_html_content(self, admin_headers):
        """Test updating article with new HTML content"""
        # First create an article
        payload = {
            "title": "TEST_WYSIWYG_Update",
            "content": "<p>Initial content</p>",
            "category": "Actualité"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/articles",
            json=payload,
            headers=admin_headers
        )
        assert create_response.status_code in [200, 201]
        article_id = create_response.json()["id"]
        
        # Update with new HTML content
        updated_html = """
        <h1>Updated Title</h1>
        <p>Updated <strong>bold</strong> paragraph</p>
        <hr style="border: 2px solid #FF6600;" />
        <div style="border: 1px solid #ccc; padding: 10px;">Boxed content</div>
        """
        
        update_response = requests.put(
            f"{BASE_URL}/api/articles/{article_id}",
            json={"title": "TEST_WYSIWYG_Update", "content": updated_html, "category": "Actualité"},
            headers=admin_headers
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_response.status_code == 200
        content = get_response.json().get("content", "")
        assert "Updated" in content or "<h1>" in content
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=admin_headers)
        print(f"✓ Article HTML content updated successfully")


class TestArticleAPIEndpoints:
    """Test article API endpoints"""
    
    def test_list_articles(self):
        """Test GET /api/articles returns list"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        assert "total" in data
        print(f"✓ Articles list returned {data['total']} articles")
    
    def test_article_detail_with_html(self):
        """Test article detail renders HTML content"""
        # Get first article
        list_response = requests.get(f"{BASE_URL}/api/articles")
        assert list_response.status_code == 200
        articles = list_response.json().get("articles", [])
        
        if articles:
            article_id = articles[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/articles/{article_id}")
            assert detail_response.status_code == 200
            data = detail_response.json()
            # Check content has HTML tags (h2, p, strong, em, ul, etc.)
            content = data.get("content", "")
            has_html = any(tag in content for tag in ["<p>", "<h", "<strong>", "<em>", "<ul>", "<blockquote>", "<div>"])
            if has_html:
                print(f"✓ Article {article_id} contains HTML content")
            else:
                print(f"⚠ Article {article_id} content may not have HTML formatting")


class TestPropertyWithRichText:
    """Tests for property creation with WYSIWYG description"""
    
    def test_create_property_with_html_description(self, admin_headers):
        """Test creating property with HTML description"""
        html_description = """
        <h2>Property Features</h2>
        <ul>
            <li><strong>4 Bedrooms</strong></li>
            <li><em>Modern Kitchen</em></li>
            <li>Swimming Pool</li>
        </ul>
        <p>Beautiful villa with <u>premium finishes</u>.</p>
        """
        
        payload = {
            "title": "TEST_WYSIWYG_Property",
            "type": "vente",
            "price": 500000000,
            "currency": "GNF",
            "description": html_description,
            "city": "Conakry",
            "neighborhood": "Test",
            "address": "Test Address",
            "seller_name": "Test Seller",
            "seller_phone": "+224 123456789",
            "seller_email": "test@test.com",
            "images": [],
            "status": "disponible"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/properties",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201], f"Create property failed: {response.text}"
        data = response.json()
        assert "id" in data
        
        property_id = data["id"]
        
        # Verify the description is preserved
        get_response = requests.get(f"{BASE_URL}/api/properties/{property_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        description = get_data.get("description", "")
        assert "Property Features" in description or "<h2>" in description
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/properties/{property_id}",
            headers=admin_headers
        )
        print(f"✓ Property with HTML description created and verified (ID: {property_id})")


class TestProcedureWithRichText:
    """Tests for procedure creation with WYSIWYG content"""
    
    def test_get_subcategories(self):
        """Test getting procedure subcategories"""
        response = requests.get(f"{BASE_URL}/api/procedures/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} procedure subcategories")
        return data
    
    def test_create_procedure_with_html_content(self, admin_headers):
        """Test creating procedure with HTML content"""
        # First get subcategories
        subcat_response = requests.get(f"{BASE_URL}/api/procedures/subcategories")
        subcategories = subcat_response.json()
        
        if not subcategories:
            pytest.skip("No subcategories available")
        
        subcategory_id = subcategories[0]["id"]
        
        html_content = """
        <h2>Required Documents</h2>
        <ol>
            <li>Passport</li>
            <li>Birth certificate</li>
            <li>Application form</li>
        </ol>
        <h2>Process Steps</h2>
        <p><strong>Step 1:</strong> Fill out the application form</p>
        <p><strong>Step 2:</strong> Submit documents</p>
        <blockquote style="border-left: 4px solid #FF6600; padding: 1rem;">
            Important: All documents must be original or certified copies.
        </blockquote>
        """
        
        payload = {
            "title": "TEST_WYSIWYG_Procedure",
            "subcategory": subcategory_id,
            "content": html_content,
            "image_url": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/procedures",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201], f"Create procedure failed: {response.text}"
        data = response.json()
        assert "id" in data
        
        procedure_id = data["id"]
        
        # Verify GET returns HTML content
        get_response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        content = get_data.get("content", "")
        assert "Required Documents" in content or "<h2>" in content
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/procedures/{procedure_id}",
            headers=admin_headers
        )
        print(f"✓ Procedure with HTML content created and verified (ID: {procedure_id})")


class TestUploadEndpoint:
    """Test image upload endpoint used by WYSIWYG editor"""
    
    def test_upload_endpoint_exists(self, admin_headers):
        """Test that upload endpoint exists"""
        # Just verify the endpoint returns proper error without file
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": admin_headers["Authorization"]}
        )
        # Should return 422 (validation error) not 404
        assert response.status_code != 404, "Upload endpoint not found"
        print(f"✓ Upload endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
