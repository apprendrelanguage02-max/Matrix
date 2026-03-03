"""
Admin Dashboard Testing - Iteration 17
Tests for:
1. Admin login and authentication
2. Role request approval/rejection via PUT /api/admin/notifications/{id}/action
3. Rejected user login block (HTTP 403)
4. Delete role request via DELETE /api/admin/notifications/{id}
5. CSV exports (users, articles, properties, payments, role-requests) - authenticated
6. Admin stats endpoint
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials from context
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"

# We'll create test users dynamically
TEST_USER_PREFIX = "TEST_ADMIN_"


class TestAdminAuth:
    """Test admin login and authentication"""
    
    def test_admin_login_success(self):
        """Admin can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"SUCCESS: Admin login - user ID: {data['user']['id']}")
    
    def test_admin_stats_endpoint(self):
        """GET /api/admin/stats returns correct stats structure"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Get stats
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_articles" in data
        assert "total_properties" in data
        assert "total_payments" in data
        print(f"SUCCESS: Admin stats - Users: {data['total_users']}, Articles: {data['total_articles']}")
    
    def test_non_admin_cannot_access_admin_endpoints(self):
        """Non-admin users cannot access admin-only endpoints"""
        # Try accessing without token
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin stats blocked for unauthenticated users")


class TestRoleRequests:
    """Test role request approval/rejection workflows"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_get_pending_notifications(self, admin_token):
        """GET /api/admin/notifications returns role requests list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "notifications" in data
        assert "total" in data
        assert "pending_count" in data
        print(f"SUCCESS: Notifications list - total: {data['total']}, pending: {data['pending_count']}")
    
    def test_filter_notifications_by_status(self, admin_token):
        """Filter notifications by status (pending/approved/rejected)"""
        for status in ["pending", "approved", "rejected"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/notifications",
                params={"status": status},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Filter by {status} failed"
            print(f"SUCCESS: Filter by {status} - {len(response.json()['notifications'])} results")
    
    def test_get_notification_count(self, admin_token):
        """GET /api/admin/notifications/count returns pending count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications/count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "pending_count" in data
        print(f"SUCCESS: Pending count: {data['pending_count']}")


class TestRoleApprovalFlow:
    """Full approval/rejection workflow with test user creation"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def _create_test_user_with_role_request(self, role="auteur"):
        """Create a test user requesting auteur/agent role → creates pending notification"""
        unique = str(uuid.uuid4())[:8]
        email = f"{TEST_USER_PREFIX}user_{unique}@test.com"
        username = f"{TEST_USER_PREFIX}user_{unique}"
        
        # Step 1: Send OTP
        otp_res = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
        if otp_res.status_code != 200:
            return None, None, f"OTP send failed: {otp_res.text}"
        
        dev_otp = otp_res.json().get("dev_otp")
        if not dev_otp:
            return None, None, "No dev_otp in response"
        
        # Step 2: Register with role request
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": username,
            "password": "testpass123",
            "role": role,
            "otp": dev_otp
        })
        if reg_res.status_code != 200:
            return None, None, f"Registration failed: {reg_res.text}"
        
        user_data = reg_res.json()
        return {
            "email": email,
            "username": username,
            "password": "testpass123",
            "id": user_data["user"]["id"],
            "token": user_data["token"]
        }, user_data, None
    
    def test_approve_role_request(self, admin_token):
        """Admin approves a pending role request → user gets the requested role"""
        # Create test user requesting auteur role
        test_user, user_data, error = self._create_test_user_with_role_request("auteur")
        if error:
            pytest.skip(error)
        
        print(f"Created test user: {test_user['email']} (ID: {test_user['id']})")
        
        # Verify user is in pending status with visiteur role
        assert user_data["user"]["role"] == "visiteur", "Initial role should be visiteur"
        assert user_data["user"]["status"] == "pending", "Initial status should be pending"
        
        # Find the pending notification
        notifs_res = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            params={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert notifs_res.status_code == 200
        
        # Find notification for our test user
        notification_id = None
        for n in notifs_res.json()["notifications"]:
            if n["user_id"] == test_user["id"]:
                notification_id = n["id"]
                break
        
        assert notification_id, f"No pending notification found for user {test_user['id']}"
        print(f"Found notification: {notification_id}")
        
        # Approve the role request
        approve_res = requests.put(
            f"{BASE_URL}/api/admin/notifications/{notification_id}/action",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_res.status_code == 200, f"Approval failed: {approve_res.text}"
        print(f"Approval response: {approve_res.json()}")
        
        # Verify user now has auteur role and actif status
        me_res = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        assert me_res.status_code == 200
        updated_user = me_res.json()
        assert updated_user["role"] == "auteur", f"Expected auteur role, got {updated_user['role']}"
        assert updated_user["status"] == "actif", f"Expected actif status, got {updated_user['status']}"
        print(f"SUCCESS: User {test_user['email']} now has role: {updated_user['role']}, status: {updated_user['status']}")
        
        # Cleanup: mark notification for deletion later if needed
        return notification_id, test_user["id"]
    
    def test_reject_role_request_and_login_blocked(self, admin_token):
        """Admin rejects a role request → user status becomes 'rejected' → cannot login"""
        # Create test user requesting agent role
        test_user, user_data, error = self._create_test_user_with_role_request("agent")
        if error:
            pytest.skip(error)
        
        print(f"Created test user: {test_user['email']} (ID: {test_user['id']})")
        
        # Find the pending notification
        notifs_res = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            params={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        notification_id = None
        for n in notifs_res.json()["notifications"]:
            if n["user_id"] == test_user["id"]:
                notification_id = n["id"]
                break
        
        assert notification_id, "No pending notification found"
        
        # Reject the role request
        reject_res = requests.put(
            f"{BASE_URL}/api/admin/notifications/{notification_id}/action",
            json={"action": "reject"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert reject_res.status_code == 200, f"Rejection failed: {reject_res.text}"
        print(f"Rejection response: {reject_res.json()}")
        
        # Try to login with rejected user → should get 403
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user["email"],
            "password": test_user["password"]
        })
        assert login_res.status_code == 403, f"Expected 403 for rejected user, got {login_res.status_code}"
        assert "refusée" in login_res.json().get("detail", "").lower() or "rejected" in login_res.json().get("detail", "").lower(), \
            f"Expected rejection message, got: {login_res.json()}"
        print(f"SUCCESS: Rejected user cannot login - got 403: {login_res.json()['detail']}")
    
    def test_delete_role_request(self, admin_token):
        """Admin can delete a role request from the list"""
        # Create test user
        test_user, _, error = self._create_test_user_with_role_request("auteur")
        if error:
            pytest.skip(error)
        
        # Find notification
        notifs_res = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            params={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        notification_id = None
        for n in notifs_res.json()["notifications"]:
            if n["user_id"] == test_user["id"]:
                notification_id = n["id"]
                break
        
        assert notification_id, "No notification found"
        
        # Delete the notification
        delete_res = requests.delete(
            f"{BASE_URL}/api/admin/notifications/{notification_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
        print(f"SUCCESS: Notification {notification_id} deleted")
        
        # Verify it's gone
        verify_res = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        for n in verify_res.json()["notifications"]:
            assert n["id"] != notification_id, "Notification still exists after delete"
        print("SUCCESS: Notification confirmed deleted")
    
    def test_cannot_process_already_processed_request(self, admin_token):
        """Cannot approve/reject an already processed request"""
        # Create and approve a user first
        test_user, _, error = self._create_test_user_with_role_request("auteur")
        if error:
            pytest.skip(error)
        
        # Find notification
        notifs_res = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            params={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        notification_id = None
        for n in notifs_res.json()["notifications"]:
            if n["user_id"] == test_user["id"]:
                notification_id = n["id"]
                break
        
        if not notification_id:
            pytest.skip("No notification found")
        
        # Approve first
        requests.put(
            f"{BASE_URL}/api/admin/notifications/{notification_id}/action",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Try to approve again
        re_approve_res = requests.put(
            f"{BASE_URL}/api/admin/notifications/{notification_id}/action",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert re_approve_res.status_code == 400, f"Expected 400 for already processed, got {re_approve_res.status_code}"
        print(f"SUCCESS: Cannot re-process already handled request - {re_approve_res.json()}")


class TestCSVExports:
    """Test all CSV export endpoints with authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_export_users_csv_authenticated(self, admin_token):
        """GET /api/admin/export/users returns CSV with auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        assert response.headers.get("content-disposition", "").endswith(".csv")
        content = response.text
        assert "id,username,email,role" in content, "CSV header missing expected columns"
        print(f"SUCCESS: Users CSV exported - {len(content)} bytes")
    
    def test_export_articles_csv_authenticated(self, admin_token):
        """GET /api/admin/export/articles returns CSV with auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/articles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id,title,category" in content, "CSV header missing expected columns"
        print(f"SUCCESS: Articles CSV exported - {len(content)} bytes")
    
    def test_export_properties_csv_authenticated(self, admin_token):
        """GET /api/admin/export/properties returns CSV with auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/properties",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id,title,type,price" in content, "CSV header missing expected columns"
        print(f"SUCCESS: Properties CSV exported - {len(content)} bytes")
    
    def test_export_payments_csv_authenticated(self, admin_token):
        """GET /api/admin/export/payments returns CSV with auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id,reference" in content, "CSV header missing expected columns"
        print(f"SUCCESS: Payments CSV exported - {len(content)} bytes")
    
    def test_export_role_requests_csv_authenticated(self, admin_token):
        """GET /api/admin/export/role-requests returns CSV with auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/role-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        content = response.text
        assert "id,user_username,user_email,requested_role,status" in content, "CSV header missing expected columns"
        print(f"SUCCESS: Role Requests CSV exported - {len(content)} bytes")
    
    def test_csv_export_requires_auth(self):
        """CSV export endpoints require authentication"""
        endpoints = [
            "/api/admin/export/users",
            "/api/admin/export/articles",
            "/api/admin/export/properties",
            "/api/admin/export/payments",
            "/api/admin/export/role-requests"
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth, got {response.status_code}"
        print("SUCCESS: All CSV exports require authentication")


class TestExistingPendingRequest:
    """Test with the existing pending request ID from context"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_existing_pending_request_if_exists(self, admin_token):
        """Check if the existing pending request from context exists and can be fetched"""
        # The context mentioned: dd11df82-8aef-4b67-893c-f0a6d8b6ac48
        existing_id = "dd11df82-8aef-4b67-893c-f0a6d8b6ac48"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        found = False
        for n in response.json()["notifications"]:
            if n["id"] == existing_id:
                found = True
                print(f"Found existing request: {n}")
                break
        
        if not found:
            print(f"INFO: Existing request {existing_id} not found (may have been processed)")
        else:
            print(f"SUCCESS: Found existing pending request {existing_id}")


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed users after tests complete"""
    yield
    # Cleanup after tests
    try:
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_res.status_code == 200:
            token = login_res.json()["token"]
            # Get all users
            users_res = requests.get(
                f"{BASE_URL}/api/admin/users",
                params={"limit": 100},
                headers={"Authorization": f"Bearer {token}"}
            )
            if users_res.status_code == 200:
                for user in users_res.json().get("users", []):
                    if user.get("username", "").startswith(TEST_USER_PREFIX):
                        requests.delete(
                            f"{BASE_URL}/api/admin/users/{user['id']}",
                            headers={"Authorization": f"Bearer {token}"}
                        )
                        print(f"Cleaned up test user: {user['username']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
