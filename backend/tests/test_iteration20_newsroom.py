"""
Iteration 20: Newsroom Editorial Dashboard Tests
- /my-articles: Get current author's articles
- /my-articles/stats: Get stats (total, published, drafts, scheduled, views, likes)
- POST /articles: Create draft/published articles with blocks, tags, SEO
- PUT /articles/{id}: Update article including blocks, status, SEO
- PUT /articles/{id}/autosave: Auto-save without changing status
- GET /articles/{id}: Returns article with blocks, word_count, reading_time
- Role access: require_agent excludes auteur
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def random_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin to get token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matrixguinea@gmail.com",
        "password": "strongpassword123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture(scope="module")
def auteur_user_token():
    """Create a test auteur user and return token"""
    suffix = random_suffix()
    email = f"TEST_auteur_iter20_{suffix}@test.com"
    
    # Register auteur
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": f"TEST_auteur_{suffix}",
        "email": email,
        "password": "testpass123",
        "role": "auteur"
    })
    
    if res.status_code == 200:
        token = res.json().get("token")
        if token:
            return {"token": token, "email": email, "user": res.json().get("user")}
    
    # If registration requires approval, login with existing test auteur
    # or use dev_otp if available
    data = res.json()
    if data.get("dev_otp"):
        verify_res = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email,
            "otp": data["dev_otp"]
        })
        if verify_res.status_code == 200:
            return {"token": verify_res.json().get("token"), "email": email, "user": verify_res.json().get("user")}
    
    pytest.skip("Could not create test auteur")

@pytest.fixture(scope="module")
def test_article_id(admin_token):
    """Create a test article for testing"""
    res = requests.post(f"{BASE_URL}/api/articles", 
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "TEST_Iter20_Article_" + random_suffix(),
            "category": "Politique",
            "status": "draft",
            "blocks": [{"id": "b1", "type": "text", "data": {"content": "Test content"}}],
            "subtitle": "Test subtitle",
            "tags": ["test", "iter20"],
            "meta_title": "SEO Title",
            "meta_description": "SEO Description"
        }
    )
    assert res.status_code == 200, f"Article creation failed: {res.text}"
    article_id = res.json()["id"]
    yield article_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/articles/{article_id}",
                    headers={"Authorization": f"Bearer {admin_token}"})


class TestMyArticlesEndpoint:
    """Test /api/my-articles endpoint"""
    
    def test_my_articles_returns_list(self, admin_token):
        """GET /api/my-articles returns list of articles for current author"""
        res = requests.get(f"{BASE_URL}/api/my-articles",
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_my_articles_requires_auth(self):
        """GET /api/my-articles requires authentication"""
        res = requests.get(f"{BASE_URL}/api/my-articles")
        assert res.status_code in [401, 403]


class TestMyArticlesStatsEndpoint:
    """Test /api/my-articles/stats endpoint"""
    
    def test_stats_returns_correct_fields(self, admin_token):
        """GET /api/my-articles/stats returns all required stat fields"""
        res = requests.get(f"{BASE_URL}/api/my-articles/stats",
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        required_fields = ["total", "published", "drafts", "scheduled", "total_views", "total_likes"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be integer"
    
    def test_stats_requires_auth(self):
        """GET /api/my-articles/stats requires authentication"""
        res = requests.get(f"{BASE_URL}/api/my-articles/stats")
        assert res.status_code in [401, 403]


class TestArticleCreation:
    """Test POST /api/articles with new newsroom features"""
    
    def test_create_draft_article_with_blocks(self, admin_token):
        """POST /api/articles with status=draft creates a draft article with blocks"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_Draft_Blocks_{suffix}",
                "category": "Économie",
                "status": "draft",
                "blocks": [
                    {"id": "b1", "type": "text", "data": {"content": "Paragraph text"}},
                    {"id": "b2", "type": "quote", "data": {"text": "Famous quote", "author": "Author"}},
                    {"id": "b3", "type": "alert", "data": {"type": "info", "content": "Alert content"}}
                ],
                "subtitle": "Test subtitle for draft",
                "tags": ["draft", "blocks", "test"]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert data["status"] == "draft"
        assert len(data["blocks"]) == 3
        assert data["subtitle"] == "Test subtitle for draft"
        assert "draft" in data["tags"]
        assert data["word_count"] >= 0
        assert data["reading_time"] >= 1
        assert data["published_at"] is None  # Draft should not have published_at
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_create_published_article_broadcasts(self, admin_token):
        """POST /api/articles with status=published sets published_at"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_Published_{suffix}",
                "category": "Sport",
                "status": "published",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Published content"}}]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert data["status"] == "published"
        assert data["published_at"] is not None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_create_article_with_seo_fields(self, admin_token):
        """POST /api/articles with SEO fields (slug, meta_title, meta_description)"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_SEO_Article_{suffix}",
                "category": "Technologie",
                "status": "draft",
                "slug": "custom-seo-slug-test",
                "meta_title": "Custom SEO Meta Title",
                "meta_description": "Custom SEO meta description for search engines",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "SEO test"}}]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert data["slug"] == "custom-seo-slug-test"
        assert data["meta_title"] == "Custom SEO Meta Title"
        assert data["meta_description"] == "Custom SEO meta description for search engines"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})
    
    def test_create_article_with_breaking_news(self, admin_token):
        """POST /api/articles with is_breaking=true"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_Breaking_{suffix}",
                "category": "Politique",
                "status": "published",
                "is_breaking": True,
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Breaking news!"}}]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert data["is_breaking"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})


class TestArticleUpdate:
    """Test PUT /api/articles/{id}"""
    
    def test_update_article_blocks(self, admin_token, test_article_id):
        """PUT /api/articles/{id} updates blocks"""
        res = requests.put(f"{BASE_URL}/api/articles/{test_article_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "blocks": [
                    {"id": "b1", "type": "text", "data": {"content": "Updated paragraph"}},
                    {"id": "b2", "type": "image", "data": {"url": "https://example.com/img.jpg", "caption": "Image caption"}}
                ]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert len(data["blocks"]) == 2
        assert data["blocks"][1]["type"] == "image"
    
    def test_update_article_seo(self, admin_token, test_article_id):
        """PUT /api/articles/{id} updates SEO fields"""
        res = requests.put(f"{BASE_URL}/api/articles/{test_article_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "slug": "updated-slug",
                "meta_title": "Updated Meta Title",
                "meta_description": "Updated meta description"
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert data["slug"] == "updated-slug"
        assert data["meta_title"] == "Updated Meta Title"
    
    def test_update_article_status_to_published(self, admin_token):
        """PUT /api/articles/{id} with status=published sets published_at"""
        # Create draft first
        suffix = random_suffix()
        create_res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_ToPublish_{suffix}",
                "category": "Actualité",
                "status": "draft",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Will be published"}}]
            }
        )
        assert create_res.status_code == 200
        article_id = create_res.json()["id"]
        assert create_res.json()["published_at"] is None
        
        # Update to published
        update_res = requests.put(f"{BASE_URL}/api/articles/{article_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "published"}
        )
        assert update_res.status_code == 200
        assert update_res.json()["published_at"] is not None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}",
                       headers={"Authorization": f"Bearer {admin_token}"})


class TestAutosaveEndpoint:
    """Test PUT /api/articles/{id}/autosave"""
    
    def test_autosave_returns_ok_and_saved_at(self, admin_token, test_article_id):
        """PUT /api/articles/{id}/autosave saves without changing status"""
        res = requests.put(f"{BASE_URL}/api/articles/{test_article_id}/autosave",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "Autosaved Title",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Autosaved content"}}]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert data["ok"] == True
        assert "saved_at" in data
    
    def test_autosave_does_not_change_status(self, admin_token):
        """Autosave should not change article status"""
        # Create draft
        suffix = random_suffix()
        create_res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_Autosave_{suffix}",
                "category": "Sport",
                "status": "draft",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Original"}}]
            }
        )
        assert create_res.status_code == 200
        article_id = create_res.json()["id"]
        
        # Autosave
        autosave_res = requests.put(f"{BASE_URL}/api/articles/{article_id}/autosave",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"title": "Autosaved Title"}
        )
        assert autosave_res.status_code == 200
        
        # Verify status unchanged
        get_res = requests.get(f"{BASE_URL}/api/articles/{article_id}",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "draft"
        assert get_res.json()["title"] == "Autosaved Title"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}",
                       headers={"Authorization": f"Bearer {admin_token}"})


class TestArticleGet:
    """Test GET /api/articles/{id}"""
    
    def test_get_article_returns_full_data(self, admin_token, test_article_id):
        """GET /api/articles/{id} returns article with blocks, word_count, reading_time"""
        res = requests.get(f"{BASE_URL}/api/articles/{test_article_id}",
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        
        # Check required fields
        required_fields = ["id", "title", "blocks", "subtitle", "tags", "slug", 
                         "meta_title", "meta_description", "word_count", "reading_time",
                         "status", "is_breaking"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_get_article_increments_views(self, admin_token, test_article_id):
        """GET /api/articles/{id} increments view count"""
        # Get initial views
        res1 = requests.get(f"{BASE_URL}/api/articles/{test_article_id}")
        initial_views = res1.json()["views"]
        
        # Get again
        res2 = requests.get(f"{BASE_URL}/api/articles/{test_article_id}")
        new_views = res2.json()["views"]
        
        assert new_views > initial_views, "Views should increment"


class TestRoleAccess:
    """Test role-based access - auteur excluded from agent routes"""
    
    def test_auteur_cannot_post_properties(self, auteur_user_token):
        """POST /api/properties returns 403 for auteur"""
        if not auteur_user_token:
            pytest.skip("No auteur token available")
        
        res = requests.post(f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {auteur_user_token['token']}"},
            json={
                "title": "TEST_Property_By_Auteur",
                "type": "vente",
                "property_type": "appartement",
                "city": "Conakry",
                "neighborhood": "Kaloum",
                "price": 100000,
                "currency": "USD"
            }
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"


class TestBlockTypes:
    """Test all 6 block types"""
    
    def test_all_block_types(self, admin_token):
        """Create article with all 6 block types (text, image, video, quote, alert, table)"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_AllBlocks_{suffix}",
                "category": "Technologie",
                "status": "draft",
                "blocks": [
                    {"id": "b1", "type": "text", "data": {"content": "<p>Rich text paragraph</p>"}},
                    {"id": "b2", "type": "image", "data": {"url": "https://example.com/img.jpg", "caption": "Caption", "alt": "Alt text"}},
                    {"id": "b3", "type": "video", "data": {"url": "https://youtube.com/watch?v=abc", "caption": "Video"}},
                    {"id": "b4", "type": "quote", "data": {"text": "Famous quote", "author": "Author Name"}},
                    {"id": "b5", "type": "alert", "data": {"type": "warning", "content": "Alert message"}},
                    {"id": "b6", "type": "table", "data": {"headers": ["Col1", "Col2"], "rows": [["A", "B"], ["C", "D"]]}}
                ]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert len(data["blocks"]) == 6
        block_types = [b["type"] for b in data["blocks"]]
        assert "text" in block_types
        assert "image" in block_types
        assert "video" in block_types
        assert "quote" in block_types
        assert "alert" in block_types
        assert "table" in block_types
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})


class TestScheduledArticles:
    """Test scheduled article functionality"""
    
    def test_create_scheduled_article(self, admin_token):
        """POST /api/articles with status=scheduled and scheduled_at"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_Scheduled_{suffix}",
                "category": "Politique",
                "status": "scheduled",
                "scheduled_at": "2026-12-31T10:00:00",
                "blocks": [{"id": "b1", "type": "text", "data": {"content": "Scheduled content"}}]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert data["status"] == "scheduled"
        assert data["scheduled_at"] == "2026-12-31T10:00:00"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})


class TestWordCountAndReadingTime:
    """Test word_count and reading_time computation"""
    
    def test_word_count_computed_from_blocks(self, admin_token):
        """Article word_count computed from text blocks"""
        suffix = random_suffix()
        res = requests.post(f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": f"TEST_WordCount_{suffix}",
                "category": "Technologie",
                "status": "draft",
                "blocks": [
                    {"id": "b1", "type": "text", "data": {"content": "This is a test paragraph with ten words in it."}},
                    {"id": "b2", "type": "quote", "data": {"text": "This quote has five words.", "author": "Test"}}
                ]
            }
        )
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        # Should have combined words from text and quote blocks
        assert data["word_count"] > 0
        assert data["reading_time"] >= 1
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}",
                       headers={"Authorization": f"Bearer {admin_token}"})
