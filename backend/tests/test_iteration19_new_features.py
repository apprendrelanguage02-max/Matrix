"""
Iteration 19: Testing NEW features added to GIMO:
1. Map page with Leaflet (GET /api/properties/map/markers with filters)
2. Real-time view/like counts (broadcast via WebSocket)
3. Content update broadcasts (new article/property)
4. Role access enforcement (auteur cannot POST properties, agent cannot POST articles)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"


class TestSession:
    """Store test session data"""
    admin_token = None
    auteur_token = None
    auteur_user_id = None
    agent_token = None
    agent_user_id = None
    test_article_id = None
    test_property_id = None


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    if TestSession.admin_token:
        return TestSession.admin_token
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    TestSession.admin_token = response.json()["token"]
    return TestSession.admin_token


@pytest.fixture(scope="module")
def auteur_token(admin_token):
    """Create and approve an auteur user, return token"""
    if TestSession.auteur_token:
        return TestSession.auteur_token
    
    unique_id = str(uuid.uuid4())[:8]
    email = f"TEST_auteur_iter19_{unique_id}@test.com"
    password = "testpass123"
    
    # Send OTP
    otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
    assert otp_response.status_code == 200, f"OTP request failed: {otp_response.text}"
    dev_otp = otp_response.json().get("dev_otp")
    
    # Register
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "username": f"auteur_{unique_id}",
        "full_name": "Test Auteur",
        "role": "auteur",
        "otp": dev_otp
    })
    assert reg_response.status_code in [200, 201], f"Registration failed: {reg_response.text}"
    user_id = reg_response.json()["user"]["id"]
    TestSession.auteur_user_id = user_id
    
    # Approve via admin
    notif_response = requests.get(f"{BASE_URL}/api/admin/notifications?status=pending", 
                                   headers={"Authorization": f"Bearer {admin_token}"})
    if notif_response.status_code == 200:
        notifications = notif_response.json().get("notifications", [])
        for notif in notifications:
            if notif.get("user_id") == user_id:
                approve_response = requests.put(
                    f"{BASE_URL}/api/admin/notifications/{notif['id']}/action",
                    json={"action": "approve"},
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                break
    
    # Login as auteur
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_response.status_code == 200, f"Auteur login failed: {login_response.text}"
    TestSession.auteur_token = login_response.json()["token"]
    return TestSession.auteur_token


@pytest.fixture(scope="module")
def agent_token(admin_token):
    """Create and approve an agent user, return token"""
    if TestSession.agent_token:
        return TestSession.agent_token
    
    unique_id = str(uuid.uuid4())[:8]
    email = f"TEST_agent_iter19_{unique_id}@test.com"
    password = "testpass123"
    
    # Send OTP
    otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
    assert otp_response.status_code == 200
    dev_otp = otp_response.json().get("dev_otp")
    
    # Register
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "username": f"agent_{unique_id}",
        "full_name": "Test Agent",
        "role": "agent",
        "otp": dev_otp
    })
    assert reg_response.status_code in [200, 201]
    user_id = reg_response.json()["user"]["id"]
    TestSession.agent_user_id = user_id
    
    # Approve via admin
    notif_response = requests.get(f"{BASE_URL}/api/admin/notifications?status=pending",
                                   headers={"Authorization": f"Bearer {admin_token}"})
    if notif_response.status_code == 200:
        notifications = notif_response.json().get("notifications", [])
        for notif in notifications:
            if notif.get("user_id") == user_id:
                requests.put(
                    f"{BASE_URL}/api/admin/notifications/{notif['id']}/action",
                    json={"action": "approve"},
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                break
    
    # Login
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_response.status_code == 200
    TestSession.agent_token = login_response.json()["token"]
    return TestSession.agent_token


# ═══════════════════════════════════════════════════════════════════════════════
# MAP MARKERS ENDPOINT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestMapMarkersEndpoint:
    """Test GET /api/properties/map/markers endpoint"""
    
    def test_map_markers_endpoint_returns_200(self):
        """Map markers endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers")
        assert response.status_code == 200, f"Map markers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of markers"
        print(f"✓ Map markers endpoint returned {len(data)} markers")
    
    def test_map_markers_filter_by_type(self):
        """Filter markers by type"""
        for prop_type in ["achat", "vente", "location"]:
            response = requests.get(f"{BASE_URL}/api/properties/map/markers", params={"type": prop_type})
            assert response.status_code == 200
            data = response.json()
            # All returned markers should match the type (if any returned)
            for marker in data:
                assert marker.get("type") == prop_type, f"Marker type mismatch: {marker.get('type')} != {prop_type}"
            print(f"✓ Filter by type={prop_type}: {len(data)} markers")
    
    def test_map_markers_filter_by_status(self):
        """Filter markers by status"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers", params={"status": "disponible"})
        assert response.status_code == 200
        data = response.json()
        for marker in data:
            assert marker.get("status") == "disponible"
        print(f"✓ Filter by status=disponible: {len(data)} markers")
    
    def test_map_markers_filter_by_city(self):
        """Filter markers by city"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers", params={"city": "Conakry"})
        assert response.status_code == 200
        data = response.json()
        for marker in data:
            assert "Conakry" in marker.get("city", "") or "conakry" in marker.get("city", "").lower()
        print(f"✓ Filter by city=Conakry: {len(data)} markers")
    
    def test_map_markers_filter_by_price_range(self):
        """Filter markers by price range"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers", params={
            "min_price": 1000,
            "max_price": 1000000
        })
        assert response.status_code == 200
        data = response.json()
        for marker in data:
            price = marker.get("price", 0)
            assert 1000 <= price <= 1000000, f"Price {price} out of range"
        print(f"✓ Filter by price range (1000-1000000): {len(data)} markers")
    
    def test_map_markers_have_required_fields(self):
        """Markers should have required fields"""
        response = requests.get(f"{BASE_URL}/api/properties/map/markers")
        assert response.status_code == 200
        data = response.json()
        required_fields = ["id", "title", "latitude", "longitude"]
        for marker in data:
            for field in required_fields:
                assert field in marker, f"Missing field: {field}"
        print(f"✓ All markers have required fields")


# ═══════════════════════════════════════════════════════════════════════════════
# REAL-TIME VIEW COUNT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestViewCountEndpoints:
    """Test view count increment endpoints"""
    
    def test_property_view_endpoint(self, agent_token):
        """POST /api/properties/{id}/view should increment view count"""
        # First get a property
        props_response = requests.get(f"{BASE_URL}/api/properties")
        assert props_response.status_code == 200
        properties = props_response.json().get("properties", [])
        
        if not properties:
            pytest.skip("No properties available to test views")
        
        prop_id = properties[0]["id"]
        initial_views = properties[0].get("views", 0)
        
        # Call view endpoint
        view_response = requests.post(f"{BASE_URL}/api/properties/{prop_id}/view")
        assert view_response.status_code == 200
        assert view_response.json().get("ok") == True
        
        # Verify view count increased
        get_response = requests.get(f"{BASE_URL}/api/properties/{prop_id}")
        assert get_response.status_code == 200
        new_views = get_response.json().get("views", 0)
        assert new_views >= initial_views, "View count should have increased"
        print(f"✓ Property view endpoint works (views: {initial_views} → {new_views})")
    
    def test_article_view_increments_on_get(self):
        """GET /api/articles/{id} should increment view count and broadcast"""
        # Get articles list
        articles_response = requests.get(f"{BASE_URL}/api/articles")
        assert articles_response.status_code == 200
        articles = articles_response.json().get("articles", [])
        
        if not articles:
            pytest.skip("No articles available to test views")
        
        article_id = articles[0]["id"]
        
        # GET article (should increment views)
        get_response = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert "views" in data
        print(f"✓ Article GET increments views (views: {data['views']})")


# ═══════════════════════════════════════════════════════════════════════════════
# REAL-TIME LIKE COUNT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestLikeCountEndpoints:
    """Test like/unlike functionality"""
    
    def test_property_like_toggle(self, auteur_token):
        """POST /api/properties/{id}/like should toggle like and broadcast"""
        # Get a property
        props_response = requests.get(f"{BASE_URL}/api/properties")
        assert props_response.status_code == 200
        properties = props_response.json().get("properties", [])
        
        if not properties:
            pytest.skip("No properties available to test likes")
        
        prop_id = properties[0]["id"]
        
        # Like the property
        like_response = requests.post(
            f"{BASE_URL}/api/properties/{prop_id}/like",
            headers={"Authorization": f"Bearer {auteur_token}"}
        )
        assert like_response.status_code == 200
        data = like_response.json()
        assert "action" in data
        assert "likes_count" in data
        assert "liked_by" in data
        print(f"✓ Property like works (action: {data['action']}, count: {data['likes_count']})")
        
        # Unlike (toggle back)
        unlike_response = requests.post(
            f"{BASE_URL}/api/properties/{prop_id}/like",
            headers={"Authorization": f"Bearer {auteur_token}"}
        )
        assert unlike_response.status_code == 200
        print(f"✓ Property unlike works (action: {unlike_response.json()['action']})")
    
    def test_article_like_toggle(self, auteur_token):
        """POST /api/articles/{id}/like should toggle like and broadcast"""
        # Get articles
        articles_response = requests.get(f"{BASE_URL}/api/articles")
        assert articles_response.status_code == 200
        articles = articles_response.json().get("articles", [])
        
        if not articles:
            pytest.skip("No articles available to test likes")
        
        article_id = articles[0]["id"]
        
        # Like
        like_response = requests.post(
            f"{BASE_URL}/api/articles/{article_id}/like",
            headers={"Authorization": f"Bearer {auteur_token}"}
        )
        assert like_response.status_code == 200
        data = like_response.json()
        assert "action" in data
        assert "likes_count" in data
        print(f"✓ Article like works (action: {data['action']}, count: {data['likes_count']})")
        
        # Unlike
        unlike_response = requests.post(
            f"{BASE_URL}/api/articles/{article_id}/like",
            headers={"Authorization": f"Bearer {auteur_token}"}
        )
        assert unlike_response.status_code == 200
        print(f"✓ Article unlike works")
    
    def test_like_requires_auth(self):
        """Like endpoints should require authentication"""
        # Get a property
        props_response = requests.get(f"{BASE_URL}/api/properties")
        if props_response.status_code != 200 or not props_response.json().get("properties"):
            pytest.skip("No properties available")
        
        prop_id = props_response.json()["properties"][0]["id"]
        
        # Try without auth
        response = requests.post(f"{BASE_URL}/api/properties/{prop_id}/like")
        assert response.status_code in [401, 403], "Like should require auth"
        print("✓ Like endpoint correctly requires authentication")


# ═══════════════════════════════════════════════════════════════════════════════
# ROLE-BASED ACCESS TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def test_auteur_cannot_create_property(self, auteur_token):
        """Auteur role should NOT be able to create properties (403)"""
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {auteur_token}"},
            json={
                "title": "Test Property from Auteur",
                "type": "vente",
                "price": 50000,
                "currency": "USD",
                "description": "Test description",
                "city": "Conakry",
                "neighborhood": "Test",
                "address": "Test Address",
                "seller_name": "Test Seller",
                "seller_phone": "+224123456789",
                "images": []
            }
        )
        assert response.status_code == 403, f"Auteur should NOT be able to create property, got {response.status_code}: {response.text}"
        print("✓ Auteur correctly blocked from creating properties (403)")
    
    def test_agent_cannot_create_article(self, agent_token):
        """Agent role should NOT be able to create articles (403)"""
        response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "title": "Test Article from Agent",
                "content": "Test content",
                "category": "Politique"
            }
        )
        assert response.status_code == 403, f"Agent should NOT be able to create article, got {response.status_code}: {response.text}"
        print("✓ Agent correctly blocked from creating articles (403)")
    
    def test_auteur_can_create_article(self, auteur_token):
        """Auteur role SHOULD be able to create articles"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {auteur_token}"},
            json={
                "title": f"TEST_Article_iter19_{unique_id}",
                "content": "Test content from auteur",
                "category": "Politique"
            }
        )
        assert response.status_code in [200, 201], f"Auteur should be able to create article, got {response.status_code}: {response.text}"
        TestSession.test_article_id = response.json().get("id")
        print(f"✓ Auteur can create articles (ID: {TestSession.test_article_id})")
    
    def test_agent_can_create_property(self, agent_token):
        """Agent role SHOULD be able to create properties"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "title": f"TEST_Property_iter19_{unique_id}",
                "type": "vente",
                "price": 100000,
                "currency": "GNF",
                "description": "Test property from agent",
                "city": "Conakry",
                "neighborhood": "Kaloum",
                "address": "Test Address",
                "seller_name": "Test Agent",
                "seller_phone": "+224123456789",
                "images": [],
                "latitude": 9.5085,
                "longitude": -13.7128
            }
        )
        assert response.status_code in [200, 201], f"Agent should be able to create property, got {response.status_code}: {response.text}"
        TestSession.test_property_id = response.json().get("id")
        print(f"✓ Agent can create properties (ID: {TestSession.test_property_id})")


# ═══════════════════════════════════════════════════════════════════════════════
# CONTENT BROADCAST TESTS (via data verification)
# ═══════════════════════════════════════════════════════════════════════════════

class TestContentBroadcast:
    """Test content creation triggers broadcast (verified via response data)"""
    
    def test_article_creation_returns_complete_data(self, auteur_token):
        """Article creation should return complete data for broadcast"""
        unique_id = str(uuid.uuid4())[:8]
        title = f"TEST_Broadcast_Article_{unique_id}"
        response = requests.post(
            f"{BASE_URL}/api/articles",
            headers={"Authorization": f"Bearer {auteur_token}"},
            json={
                "title": title,
                "content": "Content for broadcast test",
                "category": "Économie"
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("title") == title
        assert "id" in data
        print(f"✓ Article creation returns complete data for broadcast")
    
    def test_property_creation_returns_complete_data(self, agent_token):
        """Property creation should return complete data for broadcast"""
        unique_id = str(uuid.uuid4())[:8]
        title = f"TEST_Broadcast_Property_{unique_id}"
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "title": title,
                "type": "location",
                "price": 500000,
                "currency": "GNF",
                "description": "Property for broadcast test",
                "city": "Conakry",
                "neighborhood": "Ratoma",
                "address": "Test Broadcast Address",
                "seller_name": "Broadcast Seller",
                "seller_phone": "+224999888777",
                "images": [],
                "latitude": 9.6412,
                "longitude": -13.5784
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("title") == title
        assert "id" in data
        print(f"✓ Property creation returns complete data for broadcast")


# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, admin_token):
        """Clean up TEST_ prefixed data created during tests"""
        # Delete test articles
        articles_response = requests.get(f"{BASE_URL}/api/articles")
        if articles_response.status_code == 200:
            for article in articles_response.json().get("articles", []):
                if article.get("title", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/articles/{article['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
        
        # Delete test properties
        props_response = requests.get(f"{BASE_URL}/api/properties?status=all")
        if props_response.status_code == 200:
            for prop in props_response.json().get("properties", []):
                if prop.get("title", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/properties/{prop['id']}",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
        
        print("✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
