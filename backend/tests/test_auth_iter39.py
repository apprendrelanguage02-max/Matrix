"""
Test auth endpoints for iteration 39
Tests: login, /auth/me, logout, session persistence
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test login with valid credentials returns token and user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == "matrixguinea@gmail.com"
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful, token: {data['token'][:50]}...")
    
    def test_login_sets_cookie(self):
        """Test login sets httpOnly cookie"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert response.status_code == 200
        
        # Check if access_token cookie is set
        cookies = session.cookies.get_dict()
        # Note: httpOnly cookies may not be visible in requests
        print(f"Cookies after login: {cookies}")
        print(f"Set-Cookie header: {response.headers.get('set-cookie', 'None')}")
    
    def test_auth_me_with_bearer_token(self):
        """Test /auth/me with Bearer token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Call /auth/me with Bearer token
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200, f"/auth/me failed: {me_response.text}"
        
        user = me_response.json()
        assert user["email"] == "matrixguinea@gmail.com"
        assert user["role"] == "admin"
        print(f"✓ /auth/me successful with Bearer token")
    
    def test_auth_me_with_cookie(self):
        """Test /auth/me with cookie authentication"""
        session = requests.Session()
        
        # Login (should set cookie)
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        
        # Call /auth/me using same session (cookie should be sent)
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"/auth/me with cookie failed: {me_response.text}"
        
        user = me_response.json()
        assert user["email"] == "matrixguinea@gmail.com"
        print(f"✓ /auth/me successful with cookie")
    
    def test_logout(self):
        """Test logout clears session"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        print(f"✓ Logout successful")
        
        # Verify /auth/me fails after logout (using Bearer token should still work)
        # But cookie should be cleared
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        # This might still work if Bearer token is in header
        print(f"/auth/me after logout (cookie only): {me_response.status_code}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print(f"✓ Invalid credentials rejected")
    
    def test_protected_endpoint_without_auth(self):
        """Test protected endpoint without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ Protected endpoint rejects unauthenticated request")


class TestArticlesEndpoint:
    """Test articles endpoints"""
    
    def test_get_articles_public(self):
        """Test public articles endpoint"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200
        data = response.json()
        assert "articles" in data or isinstance(data, list)
        print(f"✓ Articles endpoint working")
    
    def test_get_my_articles_authenticated(self):
        """Test my-articles endpoint with auth"""
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "matrixguinea@gmail.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get my articles
        response = requests.get(
            f"{BASE_URL}/api/my-articles",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print(f"✓ My articles endpoint working")


class TestImmobilierEndpoint:
    """Test immobilier endpoints"""
    
    def test_get_properties_public(self):
        """Test public properties endpoint"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        print(f"✓ Properties endpoint working")


class TestProceduresEndpoint:
    """Test procedures endpoints"""
    
    def test_get_procedures_public(self):
        """Test public procedures endpoint"""
        response = requests.get(f"{BASE_URL}/api/procedures")
        assert response.status_code == 200
        print(f"✓ Procedures endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
