"""
Test suite for Admin Database Management endpoints
Tests: /api/admin/stats, /api/admin/users, /api/admin/articles, /api/admin/properties, /api/admin/payments
Also tests CSV exports and admin-only access restrictions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token (role=admin)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "adminpassword"
    })
    if response.status_code == 200:
        data = response.json()
        assert data["user"]["role"] == "admin", "User must have admin role"
        return data["token"]
    pytest.skip("Admin login failed")

@pytest.fixture(scope="module")
def non_admin_token():
    """Create/get non-admin user token"""
    # Try to register a test user
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": "TEST_NoAdmin",
        "email": "test_noadmin@test.com",
        "password": "testpass123",
        "role": "visiteur"
    })
    if response.status_code == 200:
        return response.json()["token"]
    
    # If user exists, login
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test_noadmin@test.com",
        "password": "testpass123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Could not get non-admin token")

@pytest.fixture(scope="module")
def auteur_token():
    """Get auteur token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@newsapp.fr",
        "password": "admin1234"
    })
    if response.status_code == 200:
        data = response.json()
        if data["user"]["role"] == "auteur":
            return data["token"]
    pytest.skip("Auteur login failed")

# ─────────────────────────────────────────────────────────────────────────────
# Test Admin Stats Endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminStats:
    """Tests for GET /api/admin/stats"""
    
    def test_admin_stats_with_admin_token(self, admin_token):
        """Admin can access stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "total_users" in data
        assert "total_articles" in data
        assert "total_properties" in data
        assert "total_payments" in data
        
        # Validate types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_articles"], int)
        assert isinstance(data["total_properties"], int)
        assert isinstance(data["total_payments"], int)
        
        # Values should be >= 0
        assert data["total_users"] >= 0
        assert data["total_articles"] >= 0
    
    def test_admin_stats_denied_for_non_admin(self, non_admin_token):
        """Non-admin users get 403"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403
        assert "administrateurs" in response.json()["detail"].lower()
    
    def test_admin_stats_denied_for_auteur(self, auteur_token):
        """Auteur role also gets 403 (only admin role allowed)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {auteur_token}"}
        )
        assert response.status_code == 403

# ─────────────────────────────────────────────────────────────────────────────
# Test Admin Users Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminUsers:
    """Tests for /api/admin/users endpoints"""
    
    def test_get_users_paginated(self, admin_token):
        """GET /api/admin/users returns paginated users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Structure validation
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        assert isinstance(data["users"], list)
        assert data["page"] == 1
        
        # Validate user structure if users exist
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "id" in user
            assert "username" in user
            assert "email" in user
            assert "role" in user
            assert "status" in user
            # hashed_password should NOT be in response
            assert "hashed_password" not in user
    
    def test_get_users_with_search(self, admin_token):
        """Search users by username or email"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"search": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should find at least the admin user
        assert data["total"] >= 1
    
    def test_get_users_filter_by_role(self, admin_token):
        """Filter users by role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"role": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned users should have admin role
        for user in data["users"]:
            assert user["role"] == "admin"
    
    def test_update_user_status_suspend(self, admin_token):
        """PUT /api/admin/users/{id}/status - suspend user"""
        # First create a test user to suspend
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "TEST_SuspendUser",
            "email": f"test_suspend@test.com",
            "password": "testpass123",
            "role": "visiteur"
        })
        
        if reg_response.status_code == 200:
            user_id = reg_response.json()["user"]["id"]
        else:
            # Get existing user
            users_response = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"},
                params={"search": "TEST_SuspendUser"}
            )
            if users_response.json()["total"] > 0:
                user_id = users_response.json()["users"][0]["id"]
            else:
                pytest.skip("Could not create/find test user")
        
        # Suspend user
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": "suspendu"}
        )
        assert response.status_code == 200
        assert response.json()["ok"] == True
        
        # Verify status changed
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.json()["status"] == "suspendu"
        
        # Re-activate user
        reactivate_response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": "actif"}
        )
        assert reactivate_response.status_code == 200
    
    def test_cannot_modify_own_status(self, admin_token):
        """Admin cannot suspend themselves"""
        # Get admin's own user ID
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_id = me_response.json()["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{admin_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": "suspendu"}
        )
        assert response.status_code == 400
        assert "propre" in response.json()["detail"].lower()

# ─────────────────────────────────────────────────────────────────────────────
# Test Admin Articles Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminArticles:
    """Tests for /api/admin/articles endpoints"""
    
    def test_get_articles_paginated(self, admin_token):
        """GET /api/admin/articles returns paginated articles"""
        response = requests.get(
            f"{BASE_URL}/api/admin/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "articles" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        if len(data["articles"]) > 0:
            article = data["articles"][0]
            assert "id" in article
            assert "title" in article
            assert "category" in article
            assert "author_username" in article
    
    def test_get_articles_filter_by_category(self, admin_token):
        """Filter articles by category"""
        response = requests.get(
            f"{BASE_URL}/api/admin/articles",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"category": "Actualité"}
        )
        assert response.status_code == 200
        
        for article in response.json()["articles"]:
            assert article["category"] == "Actualité"

# ─────────────────────────────────────────────────────────────────────────────
# Test Admin Properties Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminProperties:
    """Tests for /api/admin/properties endpoints"""
    
    def test_get_properties_paginated(self, admin_token):
        """GET /api/admin/properties returns paginated properties"""
        response = requests.get(
            f"{BASE_URL}/api/admin/properties",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "properties" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        if len(data["properties"]) > 0:
            prop = data["properties"][0]
            assert "id" in prop
            assert "title" in prop
            assert "type" in prop
            assert "price" in prop
            assert "status" in prop
    
    def test_update_property_status(self, admin_token):
        """PUT /api/admin/properties/{id}/status - update property status"""
        # Get a property
        props_response = requests.get(
            f"{BASE_URL}/api/admin/properties",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"limit": 1}
        )
        
        if props_response.json()["total"] == 0:
            pytest.skip("No properties to test")
        
        prop_id = props_response.json()["properties"][0]["id"]
        original_status = props_response.json()["properties"][0]["status"]
        
        # Update status
        new_status = "reserve" if original_status == "disponible" else "disponible"
        response = requests.put(
            f"{BASE_URL}/api/admin/properties/{prop_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": new_status}
        )
        assert response.status_code == 200
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/admin/properties/{prop_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": original_status}
        )

# ─────────────────────────────────────────────────────────────────────────────
# Test Admin Payments Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminPayments:
    """Tests for /api/admin/payments endpoints"""
    
    def test_get_payments_paginated(self, admin_token):
        """GET /api/admin/payments returns paginated payments"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "payments" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        if len(data["payments"]) > 0:
            payment = data["payments"][0]
            assert "id" in payment
            assert "reference" in payment
            assert "amount" in payment
            assert "method" in payment
            assert "status" in payment
    
    def test_filter_payments_by_status(self, admin_token):
        """Filter payments by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"status": "en_attente"}
        )
        assert response.status_code == 200
        
        for payment in response.json()["payments"]:
            assert payment["status"] == "en_attente"
    
    def test_filter_payments_by_method(self, admin_token):
        """Filter payments by method"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payments",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"method": "orange_money"}
        )
        assert response.status_code == 200
        
        for payment in response.json()["payments"]:
            assert payment["method"] == "orange_money"

# ─────────────────────────────────────────────────────────────────────────────
# Test CSV Export Endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestCSVExports:
    """Tests for /api/admin/export/* endpoints"""
    
    def test_export_users_csv(self, admin_token):
        """GET /api/admin/export/users returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Check CSV structure
        content = response.text
        lines = content.strip().split("\n")
        assert len(lines) >= 1  # At least header
        
        # Verify header columns
        header = lines[0]
        assert "id" in header
        assert "username" in header
        assert "email" in header
        assert "role" in header
    
    def test_export_articles_csv(self, admin_token):
        """GET /api/admin/export/articles returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/articles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        header = response.text.split("\n")[0]
        assert "id" in header
        assert "title" in header
        assert "category" in header
    
    def test_export_properties_csv(self, admin_token):
        """GET /api/admin/export/properties returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/properties",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        header = response.text.split("\n")[0]
        assert "id" in header
        assert "title" in header
        assert "price" in header
    
    def test_export_payments_csv(self, admin_token):
        """GET /api/admin/export/payments returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        header = response.text.split("\n")[0]
        assert "id" in header
        assert "reference" in header
        assert "amount" in header
    
    def test_export_denied_for_non_admin(self, non_admin_token):
        """Non-admin cannot export CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403

# ─────────────────────────────────────────────────────────────────────────────
# Test Delete Operations (careful - creates test data then deletes)
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminDelete:
    """Tests for admin delete operations"""
    
    def test_delete_user_and_related_data(self, admin_token):
        """DELETE /api/admin/users/{id} removes user and related data"""
        # Create a test user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "TEST_DeleteMe",
            "email": "test_deleteme@test.com",
            "password": "testpass123",
            "role": "visiteur"
        })
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user for deletion")
        
        user_id = reg_response.json()["user"]["id"]
        
        # Delete user
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] == True
        
        # Verify user no longer exists
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 404
    
    def test_cannot_delete_self(self, admin_token):
        """Admin cannot delete their own account"""
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_id = me_response.json()["id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{admin_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "propre" in response.json()["detail"].lower()

# ─────────────────────────────────────────────────────────────────────────────
# Test User Role Update
# ─────────────────────────────────────────────────────────────────────────────

class TestUserRoleUpdate:
    """Tests for PUT /api/admin/users/{id}/role"""
    
    def test_update_user_role(self, admin_token):
        """Admin can update user role"""
        # Create test user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "TEST_RoleChange",
            "email": "test_rolechange@test.com",
            "password": "testpass123",
            "role": "visiteur"
        })
        
        if reg_response.status_code != 200:
            # Try to get existing user
            users_response = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"},
                params={"search": "TEST_RoleChange"}
            )
            if users_response.json()["total"] > 0:
                user_id = users_response.json()["users"][0]["id"]
            else:
                pytest.skip("Could not create/find test user")
        else:
            user_id = reg_response.json()["user"]["id"]
        
        # Update role to auteur
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"role": "auteur"}
        )
        assert response.status_code == 200
        
        # Verify role changed
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.json()["role"] == "auteur"
        
        # Reset role to visiteur
        requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"role": "visiteur"}
        )
    
    def test_invalid_role_rejected(self, admin_token):
        """Invalid role values are rejected"""
        # Get any user
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"limit": 1}
        )
        
        if users_response.json()["total"] == 0:
            pytest.skip("No users to test")
        
        user_id = users_response.json()["users"][0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"role": "superuser"}  # Invalid role
        )
        assert response.status_code == 400
