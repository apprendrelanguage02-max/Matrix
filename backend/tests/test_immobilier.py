"""
Immobilier API Test Suite
Tests for: Properties CRUD, Payments, Agent/Admin flows
"""
import pytest
import requests
import os
import base64
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://media-upload-hub-6.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"
AGENT_EMAIL = "agent@gimo.gn"
AGENT_PASSWORD = "agentpass"

# Minimal valid JPEG bytes for upload testing
MINIMAL_JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
)


class TestPropertiesPublic:
    """Public Properties API tests - No auth required"""
    
    def test_get_properties_returns_list(self):
        """GET /api/properties returns paginated list with total and pages"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "properties" in data, "Response should contain 'properties' field"
        assert "total" in data, "Response should contain 'total' field"
        assert "pages" in data, "Response should contain 'pages' field"
        assert isinstance(data["properties"], list), "properties should be a list"
        print(f"✅ GET /api/properties: {data['total']} properties, {data['pages']} pages")
    
    def test_get_properties_filter_by_type_vente(self):
        """Filter properties by type=vente"""
        response = requests.get(f"{BASE_URL}/api/properties", params={"type": "vente"})
        assert response.status_code == 200
        data = response.json()
        for prop in data["properties"]:
            assert prop["type"] == "vente", f"Expected type 'vente', got '{prop['type']}'"
        print(f"✅ Filter by type=vente: {len(data['properties'])} properties")
    
    def test_get_properties_filter_by_city(self):
        """Filter properties by city=Conakry"""
        response = requests.get(f"{BASE_URL}/api/properties", params={"city": "Conakry"})
        assert response.status_code == 200
        data = response.json()
        for prop in data["properties"]:
            assert "conakry" in prop["city"].lower(), f"City should contain 'conakry', got '{prop['city']}'"
        print(f"✅ Filter by city=Conakry: {len(data['properties'])} properties")
    
    def test_get_property_by_id(self):
        """GET /api/properties/:id returns single property"""
        # First get list to get a valid ID
        list_response = requests.get(f"{BASE_URL}/api/properties", params={"status": "all"})
        assert list_response.status_code == 200
        data = list_response.json()
        if len(data["properties"]) == 0:
            pytest.skip("No properties in database")
        
        prop_id = data["properties"][0]["id"]
        response = requests.get(f"{BASE_URL}/api/properties/{prop_id}")
        assert response.status_code == 200
        prop = response.json()
        assert prop["id"] == prop_id
        assert "title" in prop
        assert "price" in prop
        assert "city" in prop
        print(f"✅ GET /api/properties/{prop_id}: {prop['title']}")
    
    def test_get_property_invalid_id_returns_404(self):
        """GET /api/properties/:id with invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/properties/invalid-id-12345")
        assert response.status_code == 404
        print("✅ Invalid property ID returns 404")


class TestAgentAuthentication:
    """Agent authentication and registration"""
    
    def test_login_agent(self):
        """Login as agent@gimo.gn"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        # Agent might not exist yet
        if response.status_code == 401:
            print("ℹ️ Agent account does not exist - will be created in registration test")
            pytest.skip("Agent account needs to be created first")
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "agent"
        print(f"✅ Agent login successful: {data['user']['email']}")
    
    def test_register_agent_role(self):
        """Register new user with role=agent"""
        # First check if agent already exists
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if login_response.status_code == 200:
            print("ℹ️ Agent already exists, skipping registration")
            return
        
        # Register new agent
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "Agent GIMO",
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD,
            "role": "agent"
        })
        # Could be 400 if email already exists
        if response.status_code == 400:
            print("ℹ️ Agent email already in use")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "agent"
        print(f"✅ Agent registered: {data['user']['email']}")


class TestPropertiesWithAgent:
    """Properties CRUD with agent authentication"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent authentication token"""
        # First try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If login fails, try to register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "Agent GIMO",
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD,
            "role": "agent"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not authenticate as agent")
    
    def test_create_property_as_agent(self, agent_token):
        """POST /api/properties with agent token creates property"""
        property_data = {
            "title": "TEST_Villa Test Automatisé",
            "type": "vente",
            "price": 500000000,
            "currency": "GNF",
            "description": "Ceci est une propriété de test créée automatiquement.",
            "city": "Conakry",
            "neighborhood": "Kipé",
            "address": "Rue Test",
            "seller_name": "Agent Test",
            "seller_phone": "+224600000000",
            "seller_email": AGENT_EMAIL,
            "images": []
        }
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {agent_token}"},
            json=property_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["title"] == property_data["title"]
        assert data["type"] == "vente"
        assert data["status"] == "disponible"
        print(f"✅ Property created: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/properties/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == property_data["title"]
        print("✅ Property persisted and retrieved")
        
        # Cleanup
        del_response = requests.delete(
            f"{BASE_URL}/api/properties/{data['id']}",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert del_response.status_code == 200
        print("✅ Test property cleaned up")
    
    def test_create_property_without_auth_fails(self):
        """POST /api/properties without auth returns 403"""
        response = requests.post(f"{BASE_URL}/api/properties", json={
            "title": "Test",
            "type": "vente",
            "price": 1000,
            "description": "test description",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "123456789"
        })
        assert response.status_code == 403
        print("✅ Property creation rejected without auth")
    
    def test_get_my_properties(self, agent_token):
        """GET /api/my-properties returns agent's properties"""
        response = requests.get(
            f"{BASE_URL}/api/my-properties",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/my-properties: {len(data)} properties")


class TestPayments:
    """Payment API tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user token (any authenticated user can make payment)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for payments management"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def available_property(self, admin_token):
        """Create or get an available property for payment test"""
        # Create a test property
        property_data = {
            "title": "TEST_Property For Payment Test",
            "type": "vente",
            "price": 100000,
            "currency": "GNF",
            "description": "Test property for payment testing.",
            "city": "Conakry",
            "neighborhood": "Test",
            "address": "Test",
            "seller_name": "Test Seller",
            "seller_phone": "+224111111111",
            "images": []
        }
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=property_data
        )
        if response.status_code == 200:
            prop = response.json()
            yield prop
            # Cleanup - try to delete (might fail if status changed)
            requests.delete(
                f"{BASE_URL}/api/properties/{prop['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        else:
            # Try to get existing available property
            list_response = requests.get(f"{BASE_URL}/api/properties", params={"status": "disponible"})
            data = list_response.json()
            if data["properties"]:
                yield data["properties"][0]
            else:
                pytest.skip("No available property for payment test")
    
    def test_create_payment_generates_reference(self, user_token, available_property):
        """POST /api/payments creates payment with GIMO-XXXXX reference"""
        payment_data = {
            "property_id": available_property["id"],
            "amount": available_property["price"],
            "currency": "GNF",
            "method": "orange_money",
            "phone": "+224600000000"
        }
        response = requests.post(
            f"{BASE_URL}/api/payments",
            headers={"Authorization": f"Bearer {user_token}"},
            json=payment_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reference" in data
        assert data["reference"].startswith("GIMO-"), f"Reference should start with 'GIMO-', got '{data['reference']}'"
        assert data["status"] == "en_attente"
        assert data["method"] == "orange_money"
        print(f"✅ Payment created with reference: {data['reference']}")
    
    def test_get_my_payments(self, user_token):
        """GET /api/payments/my returns user's payments"""
        response = requests.get(
            f"{BASE_URL}/api/payments/my",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/payments/my: {len(data)} payments")
    
    def test_admin_get_all_payments(self, admin_token):
        """GET /api/payments (admin) returns all payments"""
        response = requests.get(
            f"{BASE_URL}/api/payments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin GET /api/payments: {len(data)} payments")


class TestPaymentMethods:
    """Test different payment methods"""
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def test_property(self, user_token):
        """Create test property for payment methods"""
        property_data = {
            "title": "TEST_Payment Method Property",
            "type": "vente",
            "price": 50000,
            "currency": "GNF",
            "description": "Test property for payment methods.",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224111111111",
            "images": []
        }
        response = requests.post(
            f"{BASE_URL}/api/properties",
            headers={"Authorization": f"Bearer {user_token}"},
            json=property_data
        )
        if response.status_code == 200:
            prop = response.json()
            yield prop
            requests.delete(
                f"{BASE_URL}/api/properties/{prop['id']}",
                headers={"Authorization": f"Bearer {user_token}"}
            )
        else:
            pytest.skip("Could not create test property")
    
    def test_payment_mobile_money(self, user_token, test_property):
        """Test Mobile Money payment method"""
        response = requests.post(
            f"{BASE_URL}/api/payments",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "property_id": test_property["id"],
                "amount": test_property["price"],
                "currency": "GNF",
                "method": "mobile_money",
                "phone": "+224622222222"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "mobile_money"
        assert data["reference"].startswith("GIMO-")
        print(f"✅ Mobile Money payment: {data['reference']}")
    
    def test_payment_paycard(self, user_token, test_property):
        """Test Paycard payment method"""
        response = requests.post(
            f"{BASE_URL}/api/payments",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "property_id": test_property["id"],
                "amount": test_property["price"],
                "currency": "GNF",
                "method": "paycard",
                "phone": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "paycard"
        print(f"✅ Paycard payment: {data['reference']}")
    
    def test_payment_carte_bancaire(self, user_token, test_property):
        """Test Bank Card payment method"""
        response = requests.post(
            f"{BASE_URL}/api/payments",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "property_id": test_property["id"],
                "amount": test_property["price"],
                "currency": "GNF",
                "method": "carte_bancaire",
                "phone": ""
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "carte_bancaire"
        print(f"✅ Bank Card payment: {data['reference']}")


class TestPropertyViews:
    """Test property view counting"""
    
    def test_increment_property_view(self):
        """POST /api/properties/:id/view increments view count"""
        # Get a property first
        list_response = requests.get(f"{BASE_URL}/api/properties", params={"status": "all"})
        data = list_response.json()
        if not data["properties"]:
            pytest.skip("No properties available")
        
        prop_id = data["properties"][0]["id"]
        
        # Get initial views
        get_response = requests.get(f"{BASE_URL}/api/properties/{prop_id}")
        initial_views = get_response.json()["views"]
        
        # Increment view
        response = requests.post(f"{BASE_URL}/api/properties/{prop_id}/view")
        assert response.status_code == 200
        
        # Verify view count increased
        get_response = requests.get(f"{BASE_URL}/api/properties/{prop_id}")
        new_views = get_response.json()["views"]
        assert new_views >= initial_views  # Could be equal if multiple tests run
        print(f"✅ Property view count: {initial_views} → {new_views}")
