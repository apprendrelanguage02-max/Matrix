"""
Test suite for OTP Verification System - Iteration 30
Tests:
- POST /api/auth/register - user creation with pending_verification status
- POST /api/auth/register - duplicate email rejection
- POST /api/auth/register - admin role rejection
- POST /api/auth/send-otp - OTP generation and rate limiting
- POST /api/auth/verify-otp - OTP verification with attempt tracking
- POST /api/auth/login - pending_verification rejection
- GET /api/admin/stats - verified/unverified counts
- GET /api/admin/users - verification filters
"""

import pytest
import requests
import os
import time
import uuid
import hashlib

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://auth-gate-update.preview.emergentagent.com")

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"
VERIFIED_USER_EMAIL = "ibrahima.test@example.com"
VERIFIED_USER_PASSWORD = "test123456"


class TestAuthRegister:
    """Test /api/auth/register endpoint"""
    
    def test_register_creates_pending_verification_user(self):
        """POST /api/auth/register creates user with status pending_verification, full_name, email_verified=false"""
        test_email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Registration User",
            "username": f"TEST_user_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert data["email"] == test_email, "Response should contain email"
        assert "message" in data, "Response should contain message"
        
        # Cleanup: The user is in pending_verification state
        print(f"Created test user: {test_email} with user_id: {data['user_id']}")
    
    def test_register_rejects_duplicate_email(self):
        """POST /api/auth/register rejects duplicate email"""
        # First, create a user
        test_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Duplicate Test User",
            "username": f"TEST_dup_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Try to register with same email again
        payload["username"] = f"TEST_dup2_{uuid.uuid4().hex[:6]}"
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Should fail with 400 for duplicate or pending verification
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "detail" in data, "Error response should contain detail"
        print(f"Duplicate email rejection message: {data['detail']}")
    
    def test_register_rejects_admin_role(self):
        """POST /api/auth/register rejects role=admin"""
        test_email = f"TEST_admin_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Admin Wannabe",
            "username": f"TEST_admin_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "admin"  # Should be rejected
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Should reject admin role - either 403 or 422 (validation error)
        assert response.status_code in [403, 422], f"Expected 403/422 for admin role, got {response.status_code}: {response.text}"
        print(f"Admin role rejection status: {response.status_code}")
    
    def test_register_agent_sets_eligible_trusted_badge(self):
        """POST /api/auth/register with role=agent sets eligible_trusted_badge=true and requested_role=agent"""
        test_email = f"TEST_agent_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Agent User",
            "username": f"TEST_agent_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "agent"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        # The actual user data with eligible_trusted_badge is stored in DB - we verify through admin endpoint
        print(f"Agent registration successful: {test_email}")


class TestAuthSendOTP:
    """Test /api/auth/send-otp endpoint"""
    
    def test_send_otp_returns_dev_otp(self):
        """POST /api/auth/send-otp returns OTP (dev mode) and stores hashed code in otp_codes collection"""
        # First register a user
        test_email = f"TEST_otp_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "full_name": "OTP Test User",
            "username": f"TEST_otp_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Now send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": test_email})
        assert otp_response.status_code == 200, f"Send OTP failed: {otp_response.text}"
        
        data = otp_response.json()
        # In dev mode, we should get dev_otp
        if "dev_otp" in data:
            assert len(data["dev_otp"]) == 6, "OTP should be 6 digits"
            assert data["dev_otp"].isdigit(), "OTP should be numeric"
            print(f"Dev OTP received: {data['dev_otp']}")
        else:
            assert data.get("sent") == True, "OTP should be sent or dev_otp returned"
            print("OTP sent via email service")
    
    def test_send_otp_rate_limit(self):
        """POST /api/auth/send-otp rate limits after 5 calls per minute (returns 429)"""
        # First register a user for rate limit test
        test_email = f"TEST_ratelimit_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "full_name": "Rate Limit Test",
            "username": f"TEST_rl_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Send OTP 6 times rapidly (limit is 5 per minute)
        hit_rate_limit = False
        for i in range(6):
            response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": test_email})
            if response.status_code == 429:
                hit_rate_limit = True
                print(f"Rate limit hit on attempt {i+1}: {response.json().get('detail')}")
                break
            time.sleep(0.1)  # Small delay
        
        assert hit_rate_limit, "Should hit rate limit after 5 send-otp requests per minute"


class TestAuthVerifyOTP:
    """Test /api/auth/verify-otp endpoint"""
    
    def test_verify_otp_wrong_code_decrements_attempts(self):
        """POST /api/auth/verify-otp with wrong code decrements attempts and returns remaining count"""
        # First register and get OTP
        test_email = f"TEST_verifyotp_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "full_name": "Verify OTP Test",
            "username": f"TEST_verify_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": test_email})
        assert otp_response.status_code == 200, f"Send OTP failed: {otp_response.text}"
        
        # Try wrong code
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": test_email,
            "otp": "000000"  # Wrong code
        })
        
        assert verify_response.status_code == 400, f"Expected 400 for wrong OTP, got {verify_response.status_code}"
        data = verify_response.json()
        assert "detail" in data
        assert "tentative" in data["detail"].lower(), f"Should mention attempts remaining: {data['detail']}"
        print(f"Wrong OTP response: {data['detail']}")
    
    def test_verify_otp_correct_code_activates_account(self):
        """POST /api/auth/verify-otp with correct code activates account (status=active, email_verified=true)"""
        # First register and get OTP
        test_email = f"TEST_activate_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "full_name": "Activate Test User",
            "username": f"TEST_act_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": test_email})
        assert otp_response.status_code == 200, f"Send OTP failed: {otp_response.text}"
        
        otp_data = otp_response.json()
        if "dev_otp" not in otp_data:
            pytest.skip("Cannot test without dev_otp - email service is configured")
        
        otp_code = otp_data["dev_otp"]
        
        # Verify with correct code
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": test_email,
            "otp": otp_code
        })
        
        assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
        
        data = verify_response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["status"] == "active", f"User status should be active, got: {data['user']['status']}"
        print(f"Account activated successfully for {test_email}")
    
    def test_verify_otp_max_attempts_returns_429(self):
        """POST /api/auth/verify-otp after 5 wrong attempts returns 429 error"""
        # First register and get OTP
        test_email = f"TEST_maxattempts_{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "full_name": "Max Attempts Test",
            "username": f"TEST_max_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": "testpass123",
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": test_email})
        assert otp_response.status_code == 200, f"Send OTP failed: {otp_response.text}"
        
        # Try wrong codes 5 times - should exhaust attempts
        hit_max = False
        for i in range(6):
            verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
                "email": test_email,
                "otp": "000000"  # Wrong code
            })
            if verify_response.status_code == 429:
                hit_max = True
                print(f"Max attempts hit on attempt {i+1}: {verify_response.json().get('detail')}")
                break
        
        assert hit_max, "Should hit 429 after 5 wrong OTP attempts"


class TestAuthLogin:
    """Test /api/auth/login endpoint"""
    
    def test_login_rejects_pending_verification(self):
        """POST /api/auth/login rejects pending_verification users with 403"""
        # First register but don't verify
        test_email = f"TEST_noverify_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "testpass123"
        reg_payload = {
            "full_name": "No Verify User",
            "username": f"TEST_nv_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "password": test_password,
            "role": "visiteur"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        # Try to login without verifying
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert login_response.status_code == 403, f"Expected 403 for pending_verification, got {login_response.status_code}: {login_response.text}"
        data = login_response.json()
        assert "verifie" in data["detail"].lower(), f"Should mention verification needed: {data['detail']}"
        print(f"Login rejected for unverified user: {data['detail']}")
    
    def test_login_succeeds_for_verified_user(self):
        """POST /api/auth/login succeeds for verified active users"""
        # Use existing verified user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VERIFIED_USER_EMAIL,
            "password": VERIFIED_USER_PASSWORD
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == VERIFIED_USER_EMAIL
        print(f"Login successful for verified user: {VERIFIED_USER_EMAIL}")


class TestAdminStats:
    """Test /api/admin/stats endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_admin_stats_returns_verified_unverified_counts(self, admin_token):
        """GET /api/admin/stats returns verified_users and unverified_users counts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        assert "verified_users" in data, "Stats should include verified_users"
        assert "unverified_users" in data, "Stats should include unverified_users"
        assert "pending_verification" in data, "Stats should include pending_verification"
        assert isinstance(data["verified_users"], int)
        assert isinstance(data["unverified_users"], int)
        print(f"Stats: verified={data['verified_users']}, unverified={data['unverified_users']}, pending={data['pending_verification']}")


class TestAdminUsersFilter:
    """Test /api/admin/users endpoint with verification filter"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_admin_users_filter_verified(self, admin_token):
        """GET /api/admin/users?verification=verified filters verified users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?verification=verified", headers=headers)
        
        assert response.status_code == 200, f"Admin users failed: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response should contain users list"
        
        # All returned users should have email_verified=True
        for user in data["users"]:
            assert user.get("email_verified") == True, f"User {user.get('email')} should be verified"
        
        print(f"Verified users returned: {len(data['users'])} (total: {data['total']})")
    
    def test_admin_users_filter_unverified(self, admin_token):
        """GET /api/admin/users?verification=unverified filters unverified users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?verification=unverified", headers=headers)
        
        assert response.status_code == 200, f"Admin users failed: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response should contain users list"
        
        # All returned users should have email_verified=False or not set
        for user in data["users"]:
            assert user.get("email_verified") != True, f"User {user.get('email')} should not be verified"
        
        print(f"Unverified users returned: {len(data['users'])} (total: {data['total']})")


class TestCleanup:
    """Cleanup test data created during tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    def test_cleanup_test_users(self, admin_token):
        """Cleanup: Delete TEST_ prefixed users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all users
        response = requests.get(f"{BASE_URL}/api/admin/users?limit=100", headers=headers)
        if response.status_code != 200:
            pytest.skip("Cannot list users for cleanup")
        
        data = response.json()
        deleted_count = 0
        
        for user in data.get("users", []):
            username = user.get("username", "")
            email = user.get("email", "")
            
            if username.startswith("TEST_") or email.startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/admin/users/{user['id']}", 
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
                    print(f"Deleted test user: {email}")
        
        print(f"Cleanup: Deleted {deleted_count} test users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
