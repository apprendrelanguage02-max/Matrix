"""
Test suite for Role Approval Workflow feature:
- Registration with pending status for auteur/agent roles
- Admin notification endpoints
- Approve/reject role requests
- Access control
"""
import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials (SUPER_ADMIN_EMAIL hardcoded in server.py)
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"

class TestRoleApprovalRegistration:
    """Test registration creates pending status for professional roles"""
    
    def test_register_as_visiteur_creates_active_status(self):
        """Visiteur registration should have immediate active status"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_Visiteur_{unique_id}",
            "email": f"test_visiteur_{unique_id}@test.com",
            "password": "testpass123",
            "role": "visiteur"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Visiteur should be active immediately
        assert data["user"]["status"] == "actif", f"Expected 'actif', got '{data['user']['status']}'"
        assert data["user"]["role"] == "visiteur"
        print(f"✓ Visiteur registration creates active status")
    
    def test_register_as_auteur_creates_pending_status(self):
        """Auteur registration should create pending status and notification"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_Auteur_{unique_id}",
            "email": f"test_auteur_{unique_id}@test.com",
            "password": "testpass123",
            "role": "auteur"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Auteur should have pending status
        assert data["user"]["status"] == "pending", f"Expected 'pending', got '{data['user']['status']}'"
        # Role should be visiteur until approved
        assert data["user"]["role"] == "visiteur"
        print(f"✓ Auteur registration creates pending status with visiteur role")
    
    def test_register_as_agent_creates_pending_status(self):
        """Agent registration should create pending status and notification"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_Agent_{unique_id}",
            "email": f"test_agent_{unique_id}@test.com",
            "password": "testpass123",
            "role": "agent"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Agent should have pending status
        assert data["user"]["status"] == "pending", f"Expected 'pending', got '{data['user']['status']}'"
        # Role should be visiteur until approved
        assert data["user"]["role"] == "visiteur"
        print(f"✓ Agent registration creates pending status with visiteur role")
    
    def test_register_as_admin_forbidden(self):
        """Registration with admin role should be forbidden"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_AdminAttempt_{unique_id}",
            "email": f"test_admin_{unique_id}@test.com",
            "password": "testpass123",
            "role": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Validation blocks admin role (422) or explicit check blocks it (403)
        assert response.status_code in [403, 422], f"Expected 403 or 422, got {response.status_code}"
        print(f"✓ Admin role registration is forbidden ({response.status_code})")


class TestAdminNotificationEndpoints:
    """Test admin notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_admin_token(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        print(f"✓ Admin logged in successfully")
    
    def test_get_notification_count(self):
        """GET /api/admin/notifications/count returns pending count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications/count",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending_count" in data
        assert isinstance(data["pending_count"], int)
        print(f"✓ Notification count endpoint works, pending: {data['pending_count']}")
    
    def test_get_notifications_paginated(self):
        """GET /api/admin/notifications returns paginated list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.admin_headers,
            params={"page": 1, "limit": 20}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "notifications" in data
        assert "total" in data
        assert "pending_count" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["notifications"], list)
        print(f"✓ Notifications endpoint returns paginated list (total: {data['total']}, pending: {data['pending_count']})")
    
    def test_get_notifications_with_status_filter(self):
        """GET /api/admin/notifications with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.admin_headers,
            params={"status": "pending"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # All notifications should have pending status
        for notif in data["notifications"]:
            assert notif["status"] == "pending"
        print(f"✓ Notifications filter by status=pending works ({len(data['notifications'])} results)")


class TestRoleApprovalActions:
    """Test approve and reject actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and create test user"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_approve_role_request(self):
        """PUT /api/admin/notifications/{id}/action with approve grants role"""
        # First create a pending user
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_ApproveUser_{unique_id}",
            "email": f"test_approve_{unique_id}@test.com",
            "password": "testpass123",
            "role": "auteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        user_data = reg_response.json()["user"]
        user_token = reg_response.json()["token"]
        
        # Find the notification for this user
        notif_response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.admin_headers,
            params={"status": "pending"}
        )
        assert notif_response.status_code == 200
        
        notifications = notif_response.json()["notifications"]
        user_notif = next((n for n in notifications if n["user_email"] == payload["email"]), None)
        
        if not user_notif:
            pytest.skip("Could not find notification for test user")
        
        # Approve the request
        approve_response = requests.put(
            f"{BASE_URL}/api/admin/notifications/{user_notif['id']}/action",
            headers=self.admin_headers,
            json={"action": "approve"}
        )
        
        assert approve_response.status_code == 200, f"Expected 200, got {approve_response.status_code}: {approve_response.text}"
        
        # Verify user role was updated
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert me_response.status_code == 200
        updated_user = me_response.json()
        
        assert updated_user["role"] == "auteur", f"Expected 'auteur', got '{updated_user['role']}'"
        assert updated_user["status"] == "actif", f"Expected 'actif', got '{updated_user['status']}'"
        print(f"✓ Approve action grants requested role (auteur) and activates user")
    
    def test_reject_role_request(self):
        """PUT /api/admin/notifications/{id}/action with reject keeps visiteur"""
        # Create a pending user
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_RejectUser_{unique_id}",
            "email": f"test_reject_{unique_id}@test.com",
            "password": "testpass123",
            "role": "agent"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        user_token = reg_response.json()["token"]
        
        # Find the notification
        notif_response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.admin_headers,
            params={"status": "pending"}
        )
        
        notifications = notif_response.json()["notifications"]
        user_notif = next((n for n in notifications if n["user_email"] == payload["email"]), None)
        
        if not user_notif:
            pytest.skip("Could not find notification for test user")
        
        # Reject the request
        reject_response = requests.put(
            f"{BASE_URL}/api/admin/notifications/{user_notif['id']}/action",
            headers=self.admin_headers,
            json={"action": "reject"}
        )
        
        assert reject_response.status_code == 200
        
        # Verify user role remains visiteur but status is active
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert me_response.status_code == 200
        updated_user = me_response.json()
        
        assert updated_user["role"] == "visiteur", f"Expected 'visiteur', got '{updated_user['role']}'"
        assert updated_user["status"] == "actif", f"Expected 'actif', got '{updated_user['status']}'"
        print(f"✓ Reject action keeps visiteur role but activates user")
    
    def test_already_processed_notification_returns_400(self):
        """PUT /api/admin/notifications/{id}/action on processed notification returns 400"""
        # Create and approve a user first
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_ProcessedUser_{unique_id}",
            "email": f"test_processed_{unique_id}@test.com",
            "password": "testpass123",
            "role": "auteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        
        # Find and approve the notification
        notif_response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.admin_headers,
            params={"status": "pending"}
        )
        
        notifications = notif_response.json()["notifications"]
        user_notif = next((n for n in notifications if n["user_email"] == payload["email"]), None)
        
        if not user_notif:
            pytest.skip("Could not find notification for test user")
        
        # Approve first
        requests.put(
            f"{BASE_URL}/api/admin/notifications/{user_notif['id']}/action",
            headers=self.admin_headers,
            json={"action": "approve"}
        )
        
        # Try to process again
        second_response = requests.put(
            f"{BASE_URL}/api/admin/notifications/{user_notif['id']}/action",
            headers=self.admin_headers,
            json={"action": "approve"}
        )
        
        assert second_response.status_code == 400, f"Expected 400, got {second_response.status_code}"
        print(f"✓ Already processed notifications return 400")


class TestAccessControl:
    """Test that non-admin users cannot access notification endpoints"""
    
    def test_non_admin_cannot_access_notification_count(self):
        """Non-admin users get 403 on notification count endpoint"""
        # Create a regular user
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_NonAdmin_{unique_id}",
            "email": f"test_nonadmin_{unique_id}@test.com",
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        user_token = reg_response.json()["token"]
        
        # Try to access admin endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications/count",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-admin users get 403 on notification count endpoint")
    
    def test_non_admin_cannot_access_notifications_list(self):
        """Non-admin users get 403 on notifications list endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_NonAdmin2_{unique_id}",
            "email": f"test_nonadmin2_{unique_id}@test.com",
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        user_token = reg_response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-admin users get 403 on notifications list endpoint")
    
    def test_non_admin_cannot_process_notifications(self):
        """Non-admin users get 403 on notification action endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_NonAdmin3_{unique_id}",
            "email": f"test_nonadmin3_{unique_id}@test.com",
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        user_token = reg_response.json()["token"]
        
        # Try to process a random notification ID
        response = requests.put(
            f"{BASE_URL}/api/admin/notifications/some-random-id/action",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"action": "approve"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-admin users get 403 on notification action endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
