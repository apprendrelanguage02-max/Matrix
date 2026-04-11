"""
Test suite for httpOnly cookie authentication migration.
Tests the security migration from localStorage tokens to httpOnly cookies.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


class TestCookieAuthMigration:
    """Tests for httpOnly cookie authentication"""
    
    def test_login_sets_httponly_cookie(self):
        """Test that login endpoint sets httpOnly cookie"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Check response body still contains token (backward compatibility)
        data = response.json()
        assert "token" in data, "Token not in response body"
        assert "user" in data, "User not in response body"
        
        # Check Set-Cookie header
        set_cookie = response.headers.get('Set-Cookie', '')
        assert 'access_token=' in set_cookie, "access_token cookie not set"
        assert 'HttpOnly' in set_cookie, "Cookie is not HttpOnly"
        assert 'Secure' in set_cookie, "Cookie is not Secure"
        assert 'SameSite=lax' in set_cookie.lower() or 'samesite=lax' in set_cookie.lower(), "SameSite not set to lax"
        
        print(f"Login successful, cookie set correctly")
    
    def test_auth_me_works_with_cookie(self):
        """Test that /auth/me endpoint works with cookie authentication"""
        session = requests.Session()
        
        # First login to get cookie
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Now call /auth/me - cookie should be sent automatically
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        
        assert me_response.status_code == 200, f"/auth/me failed: {me_response.text}"
        
        data = me_response.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "admin"
        
        print(f"Cookie auth working: {data.get('username')}")
    
    def test_logout_clears_cookie(self):
        """Test that logout endpoint clears the auth cookie"""
        session = requests.Session()
        
        # First login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Verify we're logged in
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        
        # Now logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        
        # Check Set-Cookie header clears the cookie
        set_cookie = logout_response.headers.get('Set-Cookie', '')
        # Cookie should be cleared (empty value or Max-Age=0)
        assert 'access_token=' in set_cookie, "Cookie not in logout response"
        
        print("Logout cleared cookie successfully")
    
    def test_auth_me_fails_after_logout(self):
        """Test that /auth/me fails after logout"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        
        # Try to access /auth/me - should fail
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 401, f"Expected 401, got {me_response.status_code}"
        
        print("Auth correctly fails after logout")
    
    def test_bearer_token_fallback(self):
        """Test that Bearer token authentication still works as fallback"""
        session = requests.Session()
        
        # Login to get token
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("token")
        assert token, "No token in response"
        
        # Create new session without cookies
        new_session = requests.Session()
        
        # Use Bearer token
        me_response = new_session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Bearer auth failed: {me_response.text}"
        
        data = me_response.json()
        assert data.get("email") == ADMIN_EMAIL
        
        print("Bearer token fallback working")
    
    def test_protected_endpoint_with_cookie(self):
        """Test that protected endpoints work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access admin endpoint
        admin_response = session.get(f"{BASE_URL}/api/admin/users")
        
        # Should be 200 (admin has access)
        assert admin_response.status_code == 200, f"Admin endpoint failed: {admin_response.text}"
        
        print("Protected endpoint accessible with cookie auth")
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        session = requests.Session()
        
        # Try to access protected endpoint without auth
        response = session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("Unauthenticated access correctly denied")


class TestCookieSecurityAttributes:
    """Tests for cookie security attributes"""
    
    def test_cookie_has_correct_path(self):
        """Test that cookie path is set to /"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200
        
        set_cookie = response.headers.get('Set-Cookie', '')
        assert 'Path=/' in set_cookie, "Cookie path not set to /"
        
        print("Cookie path correctly set to /")
    
    def test_cookie_max_age(self):
        """Test that cookie has appropriate max-age"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200
        
        set_cookie = response.headers.get('Set-Cookie', '')
        assert 'Max-Age=' in set_cookie, "Cookie Max-Age not set"
        
        print("Cookie Max-Age correctly set")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
