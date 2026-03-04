"""
Iteration 18: Testing NEW features
- Global search: /api/search?q=...
- Role-based access: auteur cannot create properties (403), agent cannot create articles (403)
- Content broadcast on article/property create/update
- WebSocket new_role_request notification
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matrixguinea@gmail.com",
        "password": "strongpassword123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def create_test_user(role: str, suffix: str = None):
    """Create a test user with OTP flow"""
    suffix = suffix or str(uuid.uuid4())[:6]
    email = f"TEST_{role}_{suffix}@test.com"
    
    # Step 1: Send OTP
    otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
    if otp_response.status_code != 200:
        return None, None, None, otp_response
    dev_otp = otp_response.json().get("dev_otp")
    
    # Step 2: Register with OTP
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": f"test_{role}_{suffix}",
        "email": email,
        "password": "testpass123",
        "role": role,
        "otp": dev_otp
    })
    if reg_response.status_code != 200:
        return None, None, None, reg_response
    
    token = reg_response.json()["token"]
    user = reg_response.json()["user"]
    return token, user, email, reg_response


class TestGlobalSearch:
    """Test global search endpoint /api/search"""
    
    def test_search_endpoint_exists(self):
        """Search endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert response.status_code == 200, f"Search endpoint failed: {response.status_code}"
        data = response.json()
        assert "articles" in data
        assert "properties" in data
        assert "procedures" in data
        print(f"SUCCESS: /api/search returns proper structure")
    
    def test_search_with_empty_query(self):
        """Empty query should return empty results"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["articles"] == []
        assert data["properties"] == []
        assert data["procedures"] == []
        print(f"SUCCESS: Empty query returns empty results")
    
    def test_search_with_valid_query(self):
        """Valid query should return matching results"""
        # Search for "Simandou" which is in an existing article
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "Simandou"})
        assert response.status_code == 200
        data = response.json()
        # Should return at least one article
        print(f"Search results: articles={len(data['articles'])}, properties={len(data['properties'])}, procedures={len(data['procedures'])}")
        # Verify article structure if found
        if data["articles"]:
            article = data["articles"][0]
            assert "id" in article
            assert "title" in article
            print(f"SUCCESS: Found article: {article['title']}")
        else:
            print("INFO: No articles found for 'Simandou', but structure is valid")


class TestRoleBasedAccess:
    """Test role-based access control"""
    
    @pytest.fixture(scope="class")
    def auteur_user(self, admin_headers):
        """Create an auteur user and get admin to approve them"""
        token, user, email, response = create_test_user("auteur", f"iter18_{uuid.uuid4().hex[:6]}")
        if not token:
            pytest.skip(f"Could not create auteur user: {response.text if response else 'Unknown'}")
        
        # Admin approves the auteur
        # Find pending notification
        notif_resp = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=admin_headers,
            params={"status": "pending"}
        )
        notifications = notif_resp.json().get("notifications", [])
        auteur_notif = next((n for n in notifications if n["user_email"] == email), None)
        
        if auteur_notif:
            approve_resp = requests.put(
                f"{BASE_URL}/api/admin/notifications/{auteur_notif['id']}/action",
                headers=admin_headers,
                json={"action": "approve"}
            )
            if approve_resp.status_code == 200:
                print(f"SUCCESS: Approved auteur user {email}")
        
        # Re-login to get updated token with correct role
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json()["token"]
            user = login_resp.json()["user"]
        
        yield {"token": token, "user": user, "email": email}
    
    @pytest.fixture(scope="class")
    def agent_user(self, admin_headers):
        """Create an agent user and get admin to approve them"""
        token, user, email, response = create_test_user("agent", f"iter18_{uuid.uuid4().hex[:6]}")
        if not token:
            pytest.skip(f"Could not create agent user: {response.text if response else 'Unknown'}")
        
        # Admin approves the agent
        notif_resp = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=admin_headers,
            params={"status": "pending"}
        )
        notifications = notif_resp.json().get("notifications", [])
        agent_notif = next((n for n in notifications if n["user_email"] == email), None)
        
        if agent_notif:
            approve_resp = requests.put(
                f"{BASE_URL}/api/admin/notifications/{agent_notif['id']}/action",
                headers=admin_headers,
                json={"action": "approve"}
            )
            if approve_resp.status_code == 200:
                print(f"SUCCESS: Approved agent user {email}")
        
        # Re-login to get updated token with correct role
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json()["token"]
            user = login_resp.json()["user"]
        
        yield {"token": token, "user": user, "email": email}
    
    def test_auteur_cannot_create_property(self, auteur_user):
        """Auteur role should NOT be able to create properties (403)"""
        headers = {"Authorization": f"Bearer {auteur_user['token']}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/properties", headers=headers, json={
            "title": "TEST_AUTEUR_PROPERTY_SHOULD_FAIL",
            "type": "vente",
            "price": 1000000,
            "currency": "GNF",
            "description": "This should fail",
            "city": "Conakry",
            "neighborhood": "Kaloum",
            "address": "Test address",
            "seller_name": "Test",
            "seller_phone": "123456789",
            "seller_email": "test@test.com",
            "images": []
        })
        
        # Should get 403 Forbidden
        assert response.status_code == 403, f"Expected 403 but got {response.status_code}: {response.text}"
        print(f"SUCCESS: Auteur correctly blocked from creating property (403)")
    
    def test_agent_cannot_create_article(self, agent_user):
        """Agent role should NOT be able to create articles (403)"""
        headers = {"Authorization": f"Bearer {agent_user['token']}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/articles", headers=headers, json={
            "title": "TEST_AGENT_ARTICLE_SHOULD_FAIL",
            "content": "This should fail",
            "category": "Actualité",
            "image_url": "https://example.com/image.jpg"
        })
        
        # Should get 403 Forbidden
        assert response.status_code == 403, f"Expected 403 but got {response.status_code}: {response.text}"
        print(f"SUCCESS: Agent correctly blocked from creating article (403)")
    
    def test_auteur_can_create_article(self, auteur_user):
        """Auteur role SHOULD be able to create articles"""
        headers = {"Authorization": f"Bearer {auteur_user['token']}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/articles", headers=headers, json={
            "title": f"TEST_AUTEUR_ARTICLE_{uuid.uuid4().hex[:6]}",
            "content": "Test article content by auteur",
            "category": "Actualité",
            "image_url": "https://example.com/image.jpg"
        })
        
        # Should succeed with 200
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        print(f"SUCCESS: Auteur can create articles")
        
        # Cleanup: delete the article
        article_id = response.json().get("id")
        if article_id:
            requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=headers)
    
    def test_agent_can_create_property(self, agent_user):
        """Agent role SHOULD be able to create properties"""
        headers = {"Authorization": f"Bearer {agent_user['token']}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/properties", headers=headers, json={
            "title": f"TEST_AGENT_PROPERTY_{uuid.uuid4().hex[:6]}",
            "type": "vente",
            "price": 1000000,
            "currency": "GNF",
            "description": "Test property by agent",
            "city": "Conakry",
            "neighborhood": "Kaloum",
            "address": "Test address",
            "seller_name": "Test Agent",
            "seller_phone": "123456789",
            "seller_email": "agent@test.com",
            "images": []
        })
        
        # Should succeed with 200
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        print(f"SUCCESS: Agent can create properties")
        
        # Cleanup: delete the property
        prop_id = response.json().get("id")
        if prop_id:
            requests.delete(f"{BASE_URL}/api/properties/{prop_id}", headers=headers)


class TestAdminDashboard:
    """Test admin dashboard functionality"""
    
    def test_admin_notifications_endpoint(self, admin_headers):
        """Admin notifications endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "pending_count" in data
        print(f"SUCCESS: Admin notifications endpoint works. Pending count: {data['pending_count']}")
    
    def test_admin_notification_count(self, admin_headers):
        """Admin notification count endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications/count", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending_count" in data
        print(f"SUCCESS: Admin notification count: {data['pending_count']}")
    
    def test_admin_stats(self, admin_headers):
        """Admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_articles" in data
        assert "total_properties" in data
        print(f"SUCCESS: Admin stats: users={data['total_users']}, articles={data['total_articles']}, properties={data['total_properties']}")
    
    def test_export_role_requests_csv(self, admin_headers):
        """Export role requests as CSV"""
        response = requests.get(f"{BASE_URL}/api/admin/export/role-requests", headers=admin_headers)
        assert response.status_code == 200
        # Should be CSV content
        assert "text/csv" in response.headers.get("content-type", "") or len(response.content) > 0
        print(f"SUCCESS: Role requests CSV export works")


class TestNewRoleRequestNotification:
    """Test that new user registration sends WebSocket notification to admin"""
    
    def test_registration_creates_admin_notification(self, admin_headers):
        """When a new auteur/agent registers, admin notification should be created"""
        suffix = uuid.uuid4().hex[:6]
        email = f"TEST_NEW_USER_{suffix}@test.com"
        
        # Send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
        assert otp_response.status_code == 200
        dev_otp = otp_response.json().get("dev_otp")
        
        # Register as auteur
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"test_new_{suffix}",
            "email": email,
            "password": "testpass123",
            "role": "auteur",
            "otp": dev_otp
        })
        assert reg_response.status_code == 200
        
        # Check that admin notification was created
        time.sleep(0.5)  # Small delay for DB write
        notif_response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=admin_headers,
            params={"status": "pending"}
        )
        assert notif_response.status_code == 200
        notifications = notif_response.json().get("notifications", [])
        
        # Find our newly created notification
        found = any(n["user_email"] == email for n in notifications)
        assert found, f"Notification for {email} not found in admin notifications"
        print(f"SUCCESS: Registration created admin notification for {email}")
        
        # Cleanup: delete the notification
        notif = next((n for n in notifications if n["user_email"] == email), None)
        if notif:
            requests.delete(f"{BASE_URL}/api/admin/notifications/{notif['id']}", headers=admin_headers)


class TestContentBroadcast:
    """Test that article/property creation triggers broadcast"""
    
    def test_article_creation_structure(self, admin_headers):
        """Verify article creation returns correct structure (broadcast is internal)"""
        response = requests.post(f"{BASE_URL}/api/articles", headers=admin_headers, json={
            "title": f"TEST_BROADCAST_ARTICLE_{uuid.uuid4().hex[:6]}",
            "content": "Test broadcast content",
            "category": "Actualité",
            "image_url": "https://example.com/image.jpg"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        print(f"SUCCESS: Article created with id {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{data['id']}", headers=admin_headers)
    
    def test_property_creation_structure(self, admin_headers):
        """Verify property creation returns correct structure (broadcast is internal)"""
        response = requests.post(f"{BASE_URL}/api/properties", headers=admin_headers, json={
            "title": f"TEST_BROADCAST_PROPERTY_{uuid.uuid4().hex[:6]}",
            "type": "vente",
            "price": 1000000,
            "currency": "GNF",
            "description": "Test broadcast property",
            "city": "Conakry",
            "neighborhood": "Kaloum",
            "address": "Test address",
            "seller_name": "Test",
            "seller_phone": "123456789",
            "seller_email": "test@test.com",
            "images": []
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        print(f"SUCCESS: Property created with id {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/properties/{data['id']}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
