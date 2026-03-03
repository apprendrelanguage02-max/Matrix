"""
Iteration 13: Testing refactored backend with modular routes structure
Testing: Auth, Articles, Properties, Procedures, Admin, Messages/Conversations APIs
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gimo-role-approval.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"
TEST_USER_EMAIL = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "testpass123"


class TestRootAndHealth:
    """Test API root returns v3 - Confirms refactored backend is running"""
    
    def test_api_root_returns_v3(self):
        """GET /api/ should return Matrix News API v3"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "v3" in data["message"], f"Expected v3, got: {data['message']}"
        print(f"✓ API root returns: {data['message']}")


class TestAuthEndpoints:
    """Test authentication endpoints - login, register"""
    
    def test_login_with_admin(self):
        """POST /api/auth/login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_register_new_visiteur(self):
        """POST /api/auth/register creates new visiteur account"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser_{uuid.uuid4().hex[:6]}",
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "role": "visiteur"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "visiteur"
        print(f"✓ New visiteur registered: {data['user']['email']}")
    
    def test_register_auteur_requires_approval(self):
        """POST /api/auth/register with auteur role creates pending user"""
        auteur_email = f"auteur_{uuid.uuid4().hex[:6]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"auteur_{uuid.uuid4().hex[:6]}",
            "email": auteur_email,
            "password": "testpass123",
            "role": "auteur"
        })
        assert response.status_code == 200
        data = response.json()
        # Auteur is initially visiteur with pending status
        assert data["user"]["role"] == "visiteur"
        assert data["user"]["status"] == "pending"
        print(f"✓ Auteur registration pending approval - current role: visiteur")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials return 401")


class TestArticlesEndpoints:
    """Test articles module endpoints"""
    
    def test_get_articles_paginated(self):
        """GET /api/articles returns paginated articles"""
        response = requests.get(f"{BASE_URL}/api/articles?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["articles"], list)
        print(f"✓ GET /api/articles - Total: {data['total']}, Page: {data['page']}/{data['pages']}")
    
    def test_get_categories(self):
        """GET /api/categories returns available categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ GET /api/categories - {len(data)} categories: {data[:3]}...")


class TestPropertiesEndpoints:
    """Test properties module endpoints"""
    
    def test_get_properties_paginated(self):
        """GET /api/properties returns paginated properties"""
        response = requests.get(f"{BASE_URL}/api/properties?page=1&limit=12&status=disponible")
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "total" in data
        assert "pages" in data
        assert isinstance(data["properties"], list)
        print(f"✓ GET /api/properties - Total: {data['total']}, Pages: {data['pages']}")
    
    def test_get_single_property(self):
        """GET /api/properties/{id} returns property details"""
        # First get a property ID
        list_response = requests.get(f"{BASE_URL}/api/properties?page=1&limit=1&status=all")
        if list_response.status_code == 200:
            properties = list_response.json().get("properties", [])
            if properties:
                prop_id = properties[0]["id"]
                response = requests.get(f"{BASE_URL}/api/properties/{prop_id}")
                assert response.status_code == 200
                data = response.json()
                assert "id" in data
                assert "title" in data
                print(f"✓ GET /api/properties/{prop_id} - Title: {data['title'][:30]}...")
                return
        print("⚠ No properties available to test single property endpoint")


class TestProceduresEndpoints:
    """Test procedures module endpoints"""
    
    def test_get_procedures_paginated(self):
        """GET /api/procedures returns paginated procedures"""
        response = requests.get(f"{BASE_URL}/api/procedures?page=1&limit=12")
        assert response.status_code == 200
        data = response.json()
        assert "procedures" in data
        assert "total" in data
        assert isinstance(data["procedures"], list)
        print(f"✓ GET /api/procedures - Total: {data['total']}")
    
    def test_get_procedures_subcategories(self):
        """GET /api/procedures/subcategories returns categories"""
        response = requests.get(f"{BASE_URL}/api/procedures/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/procedures/subcategories - {len(data)} subcategories")


class TestAdminEndpoints:
    """Test admin module endpoints - require admin auth"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats returns dashboard statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_articles" in data
        assert "total_properties" in data
        assert "total_payments" in data
        print(f"✓ GET /api/admin/stats - Users: {data['total_users']}, Articles: {data['total_articles']}")
    
    def test_admin_notifications_count(self, admin_token):
        """GET /api/admin/notifications/count returns pending count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/notifications/count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending_count" in data
        print(f"✓ GET /api/admin/notifications/count - Pending: {data['pending_count']}")
    
    def test_admin_notifications_list(self, admin_token):
        """GET /api/admin/notifications returns paginated notifications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/notifications?page=1&limit=20", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "pending_count" in data
        print(f"✓ GET /api/admin/notifications - Total: {data['total']}, Pending: {data['pending_count']}")
    
    def test_admin_users_list(self, admin_token):
        """GET /api/admin/users returns paginated users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?page=1&limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        print(f"✓ GET /api/admin/users - Total: {data['total']} users")


class TestMessagingEndpoints:
    """Test messaging/conversations module endpoints"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token (login or register)"""
        # Try login first with existing test user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "chattest@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # Try registering new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"chatuser_{uuid.uuid4().hex[:6]}",
            "email": f"chatuser_{uuid.uuid4().hex[:6]}@test.com",
            "password": "testpass123",
            "role": "visiteur"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        pytest.skip("Could not authenticate user for messaging tests")
    
    def test_get_conversations_empty(self, user_token):
        """GET /api/conversations returns list (possibly empty for new user)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/conversations - {len(data)} conversations")
    
    def test_get_unread_count(self, user_token):
        """GET /api/conversations/unread-count returns count"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        print(f"✓ GET /api/conversations/unread-count - Count: {data['unread_count']}")
    
    def test_get_unread_count_by_type(self, user_token):
        """GET /api/conversations/unread-count?type=immobilier returns filtered count"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/conversations/unread-count?type=immobilier", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        print(f"✓ GET /api/conversations/unread-count?type=immobilier - Count: {data['unread_count']}")


class TestConversationCreation:
    """Test conversation creation between users"""
    
    def test_create_conversation(self):
        """POST /api/conversations creates conversation between two users"""
        # Get two different user tokens
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_resp.status_code != 200:
            pytest.skip("Admin login failed")
        
        admin_data = admin_resp.json()
        admin_token = admin_data["token"]
        admin_id = admin_data["user"]["id"]
        
        # Register a test user
        test_user_email = f"convtest_{uuid.uuid4().hex[:6]}@test.com"
        user_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"convtest_{uuid.uuid4().hex[:6]}",
            "email": test_user_email,
            "password": "testpass123",
            "role": "visiteur"
        })
        if user_resp.status_code != 200:
            pytest.skip("Could not register test user")
        
        user_token = user_resp.json()["token"]
        
        # Create conversation from test user to admin
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_id}&type=immobilier",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "participant_ids" in data
        assert "type" in data
        assert data["type"] == "immobilier"
        print(f"✓ POST /api/conversations - Created conversation ID: {data['id']}")


class TestUserOnlineStatus:
    """Test user online status endpoint"""
    
    def test_check_user_online(self):
        """GET /api/users/{id}/online returns online status"""
        # Get admin user ID
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_resp.status_code != 200:
            pytest.skip("Admin login failed")
        
        admin_id = admin_resp.json()["user"]["id"]
        
        # Check online status (unauthenticated endpoint)
        response = requests.get(f"{BASE_URL}/api/users/{admin_id}/online")
        assert response.status_code == 200
        data = response.json()
        assert "online" in data
        print(f"✓ GET /api/users/{admin_id}/online - Online: {data['online']}")


class TestUserNotifications:
    """Test user notifications endpoints"""
    
    @pytest.fixture
    def user_with_notifications(self):
        """Get token for user that may have notifications"""
        # Try existing test user with notifications
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "notiftest@test.com",
            "password": "testpass123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("No user with notifications available")
    
    def test_get_my_notifications(self, user_with_notifications):
        """GET /api/my-notifications returns user notifications"""
        headers = {"Authorization": f"Bearer {user_with_notifications}"}
        response = requests.get(f"{BASE_URL}/api/my-notifications", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"✓ GET /api/my-notifications - {len(data['notifications'])} notifications, {data['unread_count']} unread")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
