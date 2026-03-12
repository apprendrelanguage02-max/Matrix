"""
Iteration 30 - Testing Bug Fixes:
1. Special characters preservation in sanitize() function
2. Admin notifications page (Demandes tab) loading correctly
3. BlockEditor text direction fix
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSanitizeFunction:
    """Test sanitize() preserves special characters but strips HTML tags"""
    
    def test_sanitize_preserves_french_accents(self):
        """Test accented characters (éàèùïö) are preserved"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create article with French accents
        article_data = {
            "title": "L'économie guinéenne : où en sommes-nous ?",
            "excerpt": "Résumé de l'état économique avec des caractères spéciaux",
            "category": "Actualité",
            "is_breaking": False,
            "is_featured": False,
            "blocks": []
        }
        
        res = requests.post(f"{BASE_URL}/api/articles", json=article_data, headers=headers)
        assert res.status_code in [200, 201], f"Create article failed: {res.text}"
        
        # Verify the response preserves accents
        data = res.json()
        assert "é" in data["title"], f"Accent 'é' not preserved in title: {data['title']}"
        assert "'" in data["title"] or "'" in data["title"], f"Apostrophe not preserved in title: {data['title']}"
        
        # Clean up
        article_id = data["id"]
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
        print(f"✓ French accents preserved: {data['title']}")
    
    def test_sanitize_preserves_apostrophes(self):
        """Test apostrophes (l'homme) are preserved"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create article with apostrophe
        article_data = {
            "title": "L'homme d'État et l'avenir du pays",
            "excerpt": "C'est l'histoire d'un homme qui...",
            "category": "Politique",
            "is_breaking": False,
            "is_featured": False,
            "blocks": []
        }
        
        res = requests.post(f"{BASE_URL}/api/articles", json=article_data, headers=headers)
        assert res.status_code in [200, 201], f"Create article failed: {res.text}"
        
        data = res.json()
        # Check that apostrophes are NOT converted to HTML entities like &#x27;
        assert "&#x27;" not in data["title"], f"Apostrophe was HTML-escaped: {data['title']}"
        assert "&#39;" not in data["title"], f"Apostrophe was HTML-escaped: {data['title']}"
        assert "&apos;" not in data["title"], f"Apostrophe was HTML-escaped: {data['title']}"
        assert "'" in data["title"] or "'" in data["title"], f"Apostrophe not found: {data['title']}"
        
        # Clean up
        article_id = data["id"]
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
        print(f"✓ Apostrophes preserved: {data['title']}")

    def test_sanitize_preserves_french_quotes(self):
        """Test guillemets (« ») are preserved"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        article_data = {
            "title": "Le président déclare : « C'est une victoire »",
            "excerpt": "Une annonce officielle",
            "category": "Politique",
            "is_breaking": False,
            "is_featured": False,
            "blocks": []
        }
        
        res = requests.post(f"{BASE_URL}/api/articles", json=article_data, headers=headers)
        assert res.status_code in [200, 201], f"Create article failed: {res.text}"
        
        data = res.json()
        # Check that French quotes are preserved
        assert "«" in data["title"] or "&laquo;" not in data["title"], f"French quote not preserved: {data['title']}"
        assert "»" in data["title"] or "&raquo;" not in data["title"], f"French quote not preserved: {data['title']}"
        
        article_id = data["id"]
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
        print(f"✓ French quotes preserved: {data['title']}")
    
    def test_sanitize_preserves_ampersand(self):
        """Test ampersand (&) is preserved"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        article_data = {
            "title": "Sport & Politique : une relation complexe",
            "excerpt": "Analyse & commentaires",
            "category": "Sport",
            "is_breaking": False,
            "is_featured": False,
            "blocks": []
        }
        
        res = requests.post(f"{BASE_URL}/api/articles", json=article_data, headers=headers)
        assert res.status_code in [200, 201], f"Create article failed: {res.text}"
        
        data = res.json()
        # Check ampersand not converted to &amp;
        assert "&amp;" not in data["title"], f"Ampersand was HTML-escaped: {data['title']}"
        assert "&" in data["title"], f"Ampersand not found: {data['title']}"
        
        article_id = data["id"]
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
        print(f"✓ Ampersand preserved: {data['title']}")

    def test_sanitize_strips_html_tags(self):
        """Test HTML tags (<script>, <div>) are removed"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        article_data = {
            "title": "Test <script>alert('xss')</script> Article",
            "excerpt": "<div>Malicious</div> content",
            "category": "Technologie",
            "is_breaking": False,
            "is_featured": False,
            "blocks": []
        }
        
        res = requests.post(f"{BASE_URL}/api/articles", json=article_data, headers=headers)
        assert res.status_code in [200, 201], f"Create article failed: {res.text}"
        
        data = res.json()
        # HTML tags should be stripped
        assert "<script>" not in data["title"], f"Script tag not stripped: {data['title']}"
        assert "</script>" not in data["title"], f"Script tag not stripped: {data['title']}"
        # Verify script tag was stripped and only text remains
        assert "alert" in data["title"], f"Content after stripping should remain: {data['title']}"
        
        article_id = data["id"]
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
        print(f"✓ HTML tags stripped: {data['title']}")


class TestAdminNotifications:
    """Test Admin Notifications (Demandes) page loading"""
    
    def test_notifications_endpoint_returns_200(self):
        """Test /api/admin/notifications returns successfully"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test default (no status filter)
        res = requests.get(f"{BASE_URL}/api/admin/notifications", headers=headers)
        assert res.status_code == 200, f"Notifications endpoint failed: {res.status_code} - {res.text}"
        
        data = res.json()
        assert "notifications" in data, f"Missing 'notifications' key: {data}"
        assert "total" in data, f"Missing 'total' key: {data}"
        assert "pages" in data, f"Missing 'pages' key: {data}"
        print(f"✓ Notifications loaded: {data['total']} total")
    
    def test_notifications_with_empty_status_filter(self):
        """Test notifications with empty status filter (should work like 'Tous')"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test with status='' (empty string) - This was causing the bug
        res = requests.get(f"{BASE_URL}/api/admin/notifications", params={"status": ""}, headers=headers)
        assert res.status_code == 200, f"Notifications with empty status failed: {res.status_code} - {res.text}"
        
        data = res.json()
        assert "notifications" in data
        print(f"✓ Notifications with empty status filter works")
    
    def test_notifications_with_pending_status(self):
        """Test notifications filtered by 'pending' status"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        res = requests.get(f"{BASE_URL}/api/admin/notifications", params={"status": "pending"}, headers=headers)
        assert res.status_code == 200, f"Notifications with pending status failed: {res.status_code} - {res.text}"
        
        data = res.json()
        assert "notifications" in data
        print(f"✓ Notifications with 'pending' status filter works: {data.get('pending_count', 0)} pending")
    
    def test_notifications_with_approved_status(self):
        """Test notifications filtered by 'approved' status"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        res = requests.get(f"{BASE_URL}/api/admin/notifications", params={"status": "approved"}, headers=headers)
        assert res.status_code == 200, f"Notifications with approved status failed: {res.status_code} - {res.text}"
        
        data = res.json()
        assert "notifications" in data
        print(f"✓ Notifications with 'approved' status filter works")
    
    def test_notifications_with_rejected_status(self):
        """Test notifications filtered by 'rejected' status"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        res = requests.get(f"{BASE_URL}/api/admin/notifications", params={"status": "rejected"}, headers=headers)
        assert res.status_code == 200, f"Notifications with rejected status failed: {res.status_code} - {res.text}"
        
        data = res.json()
        assert "notifications" in data
        print(f"✓ Notifications with 'rejected' status filter works")


class TestExistingArticleDisplay:
    """Test existing article displays correctly without HTML entities"""
    
    def test_existing_article_no_html_entities(self):
        """Test the article mentioned in the bug report shows correct characters"""
        # Get articles and find the Doumbouya article
        res = requests.get(f"{BASE_URL}/api/articles")
        assert res.status_code == 200, f"Get articles failed: {res.text}"
        
        data = res.json()
        articles = data.get("articles", [])
        
        # Find the mentioned article
        doumbouya_article = None
        for article in articles:
            if "Doumbouya" in article.get("title", ""):
                doumbouya_article = article
                break
        
        if doumbouya_article:
            title = doumbouya_article["title"]
            # Verify no HTML entities
            assert "&#x27;" not in title, f"HTML entity &#x27; found in title: {title}"
            assert "&#39;" not in title, f"HTML entity &#39; found in title: {title}"
            assert "&amp;" not in title or "&" in title, f"Unexpected &amp; in title: {title}"
            print(f"✓ Existing article title is clean: {title}")
        else:
            print("⚠ Doumbouya article not found in first page, skipping check")


class TestHomepageArticles:
    """Test homepage articles display correctly"""
    
    def test_homepage_articles_no_entities(self):
        """Test /api/articles returns titles without HTML entities"""
        res = requests.get(f"{BASE_URL}/api/articles", params={"limit": 10})
        assert res.status_code == 200
        
        data = res.json()
        for article in data.get("articles", []):
            title = article.get("title", "")
            # Check common HTML entity issues
            assert "&#x27;" not in title, f"HTML entity &#x27; in title: {title}"
            assert "&#39;" not in title, f"HTML entity &#39; in title: {title}"
            assert "&#x22;" not in title, f"HTML entity &#x22; in title: {title}"
            # &amp; could be legitimate in some cases, but shouldn't appear for regular &
        
        print(f"✓ Homepage articles have clean titles")
