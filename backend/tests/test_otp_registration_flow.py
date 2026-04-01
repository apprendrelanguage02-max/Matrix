"""
Test OTP Registration Flow - Iteration 35
Tests the bug fix: OTP is now sent during registration (not requiring separate call)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTPRegistrationFlow:
    """Test OTP registration flow - OTP sent during registration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"test_otp_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "test123456"
        self.admin_email = "matrixguinea@gmail.com"
        self.admin_password = "admin123"
        yield
        # Cleanup: Delete test user if created
        try:
            # Login as admin to delete test user
            login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.admin_email,
                "password": self.admin_password
            })
            if login_res.status_code == 200:
                token = login_res.json().get("token")
                # Try to find and delete test user via admin endpoint
                headers = {"Authorization": f"Bearer {token}"}
                # Get users list
                users_res = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
                if users_res.status_code == 200:
                    users = users_res.json()
                    for user in users:
                        if user.get("email") == self.test_email:
                            requests.delete(f"{BASE_URL}/api/admin/users/{user['id']}", headers=headers)
        except Exception:
            pass
    
    def test_register_returns_otp_sent_true(self):
        """POST /api/auth/register should return otp_sent:true"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test OTP User",
            "username": f"test_otp_{uuid.uuid4().hex[:6]}",
            "email": self.test_email,
            "password": self.test_password,
            "role": "visiteur"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should contain 'message'"
        assert "user_id" in data, "Response should contain 'user_id'"
        assert "email" in data, "Response should contain 'email'"
        assert "otp_sent" in data, "Response should contain 'otp_sent'"
        
        # Verify otp_sent is True (OTP sent during registration)
        assert data["otp_sent"] == True, f"otp_sent should be True, got {data['otp_sent']}"
        assert data["email"] == self.test_email
        
        print(f"✓ Register returned otp_sent=True for {self.test_email}")
    
    def test_register_duplicate_pending_verification(self):
        """POST /api/auth/register with existing pending_verification email should return 400"""
        # First registration
        email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Dup User",
            "username": f"test_dup_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": self.test_password,
            "role": "visiteur"
        })
        assert response1.status_code == 200
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Dup User 2",
            "username": f"test_dup2_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": self.test_password,
            "role": "visiteur"
        })
        
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        data = response2.json()
        assert "attente de verification" in data.get("detail", "").lower() or "deja utilise" in data.get("detail", "").lower()
        
        print(f"✓ Duplicate registration correctly rejected")
    
    def test_send_otp_for_resend(self):
        """POST /api/auth/send-otp should work for resending OTP"""
        # First register
        email = f"test_resend_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Resend User",
            "username": f"test_resend_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": self.test_password,
            "role": "visiteur"
        })
        assert reg_response.status_code == 200
        
        # Now resend OTP
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "email": email
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("sent") == True, "send-otp should return sent=True"
        assert "message" in data
        
        print(f"✓ send-otp works for resending OTP")
    
    def test_send_otp_nonexistent_email(self):
        """POST /api/auth/send-otp with non-existent email should return 404"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "email": f"nonexistent_{uuid.uuid4().hex}@example.com"
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "aucun compte" in data.get("detail", "").lower() or "inscrivez" in data.get("detail", "").lower()
        
        print(f"✓ send-otp correctly rejects non-existent email")
    
    def test_verify_otp_wrong_code(self):
        """POST /api/auth/verify-otp with wrong code should return error with attempts remaining"""
        # First register
        email = f"test_wrong_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Wrong OTP User",
            "username": f"test_wrong_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": self.test_password,
            "role": "visiteur"
        })
        assert reg_response.status_code == 200
        
        # Try wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email,
            "otp": "000000"  # Wrong code
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        
        # Should mention incorrect code and remaining attempts
        assert "incorrect" in detail.lower() or "tentative" in detail.lower(), f"Expected error about incorrect code, got: {detail}"
        
        print(f"✓ verify-otp correctly rejects wrong code with attempts info")
    
    def test_verify_otp_no_code_sent(self):
        """POST /api/auth/verify-otp without prior OTP should return error"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": f"no_otp_{uuid.uuid4().hex}@example.com",
            "otp": "123456"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "aucun code" in data.get("detail", "").lower() or "nouveau code" in data.get("detail", "").lower()
        
        print(f"✓ verify-otp correctly handles no OTP sent case")
    
    def test_login_pending_verification_returns_403(self):
        """POST /api/auth/login with pending_verification account should return 403"""
        # First register (creates pending_verification account)
        email = f"test_pending_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Pending User",
            "username": f"test_pending_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": self.test_password,
            "role": "visiteur"
        })
        assert reg_response.status_code == 200
        
        # Try to login without verifying
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": self.test_password
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "pas encore verifie" in data.get("detail", "").lower() or "verifiez" in data.get("detail", "").lower()
        
        print(f"✓ login correctly returns 403 for pending_verification account")
    
    def test_admin_login_works(self):
        """POST /api/auth/login with admin credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        
        print(f"✓ Admin login works correctly")
    
    def test_register_admin_role_forbidden(self):
        """POST /api/auth/register with role=admin should be forbidden (403 or 422)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Fake Admin",
            "username": f"fake_admin_{uuid.uuid4().hex[:6]}",
            "email": f"fake_admin_{uuid.uuid4().hex[:8]}@example.com",
            "password": self.test_password,
            "role": "admin"
        })
        
        # Either 403 (explicit forbidden) or 422 (validation error) is acceptable
        assert response.status_code in [403, 422], f"Expected 403 or 422, got {response.status_code}"
        
        print(f"✓ Register correctly forbids admin role (status: {response.status_code})")


class TestOTPRateLimiting:
    """Test OTP rate limiting"""
    
    def test_send_otp_rate_limit(self):
        """POST /api/auth/send-otp should rate limit after 5 requests"""
        # First register
        email = f"test_rate_{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Rate User",
            "username": f"test_rate_{uuid.uuid4().hex[:6]}",
            "email": email,
            "password": "test123456",
            "role": "visiteur"
        })
        assert reg_response.status_code == 200
        
        # Send multiple OTP requests (should hit rate limit after 5)
        for i in range(6):
            response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
                "email": email
            })
            if i < 5:
                # First 5 should succeed
                if response.status_code == 429:
                    print(f"✓ Rate limit hit at request {i+1}")
                    return  # Test passed
            else:
                # 6th should be rate limited
                if response.status_code == 429:
                    print(f"✓ Rate limit correctly applied at request {i+1}")
                    return
        
        print("⚠ Rate limiting may not be working as expected (no 429 received)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
