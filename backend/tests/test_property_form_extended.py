"""
Test Property Form Extended Fields - Iteration 32
Tests for the new property creation form with extended fields:
- salons, kitchens, toilets, floors, year_built
- commune, landmarks, equipment
- show_usd, show_eur, hide_email, show_phone, whatsapp_direct
- New property types: location_meublee, location_non_meublee, colocation, bail_commercial
- New categories: immeuble, magasin
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


class TestPropertyExtendedFields:
    """Test extended property fields in POST /api/properties"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_ids = []
        yield
        # Cleanup
        for prop_id in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/properties/{prop_id}")
            except:
                pass
    
    def test_create_property_with_extended_fields(self):
        """Test POST /api/properties accepts all new extended fields"""
        payload = {
            "title": "TEST_Villa moderne avec piscine",
            "type": "vente",
            "price": 980000000,
            "currency": "GNF",
            "description": "Belle villa moderne avec toutes les commodites.",
            "city": "Conakry",
            "neighborhood": "Kipe",
            "address": "Rue 123, Kipe",
            "latitude": 9.537,
            "longitude": -13.6785,
            "seller_name": "Test Vendeur",
            "seller_phone": "+224 620 123 456",
            "seller_email": "test@example.com",
            "seller_whatsapp": "+224 620 123 456",
            "images": ["https://example.com/image1.jpg"],
            "video_url": "",
            "property_category": "villa",
            "bedrooms": 5,
            "bathrooms": 3,
            "surface_area": 450,
            # Extended fields
            "salons": 2,
            "kitchens": 1,
            "toilets": 4,
            "floors": 2,
            "year_built": "2022",
            "commune": "Ratoma",
            "landmarks": "Proche du rond-point de Kipe",
            "equipment": ["Piscine", "Garage", "Climatisation", "Gardiennage"],
            "show_usd": True,
            "show_eur": True,
            "hide_email": False,
            "show_phone": True,
            "whatsapp_direct": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.created_ids.append(data["id"])
        
        # Verify extended fields are returned
        assert data["salons"] == 2, "salons not saved"
        assert data["kitchens"] == 1, "kitchens not saved"
        assert data["toilets"] == 4, "toilets not saved"
        assert data["floors"] == 2, "floors not saved"
        assert data["year_built"] == "2022", "year_built not saved"
        assert data["commune"] == "Ratoma", "commune not saved"
        assert "Proche du rond-point" in data["landmarks"], "landmarks not saved"
        assert "Piscine" in data["equipment"], "equipment not saved"
        assert data["show_usd"] == True, "show_usd not saved"
        assert data["show_eur"] == True, "show_eur not saved"
        assert data["hide_email"] == False, "hide_email not saved"
        assert data["show_phone"] == True, "show_phone not saved"
        assert data["whatsapp_direct"] == True, "whatsapp_direct not saved"
        
        print("SUCCESS: All extended fields saved correctly")
    
    def test_get_property_returns_extended_fields(self):
        """Test GET /api/properties/{id} returns extended fields"""
        # Create property first
        payload = {
            "title": "TEST_Appartement avec equipements",
            "type": "location",
            "price": 5000000,
            "currency": "GNF",
            "description": "Appartement bien equipe.",
            "city": "Conakry",
            "neighborhood": "Dixinn",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000",
            "property_category": "appartement",
            "bedrooms": 2,
            "bathrooms": 1,
            "surface_area": 80,
            "salons": 1,
            "kitchens": 1,
            "toilets": 1,
            "floors": 0,
            "commune": "Dixinn",
            "equipment": ["Climatisation", "Wi-Fi / Internet"]
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert create_resp.status_code == 200
        prop_id = create_resp.json()["id"]
        self.created_ids.append(prop_id)
        
        # Get property
        get_resp = self.session.get(f"{BASE_URL}/api/properties/{prop_id}")
        assert get_resp.status_code == 200
        
        data = get_resp.json()
        assert data["salons"] == 1
        assert data["kitchens"] == 1
        assert data["toilets"] == 1
        assert data["commune"] == "Dixinn"
        assert "Climatisation" in data["equipment"]
        
        print("SUCCESS: GET returns extended fields")
    
    def test_new_property_types(self):
        """Test new property types: location_meublee, location_non_meublee, colocation, bail_commercial"""
        new_types = ["location_meublee", "location_non_meublee", "colocation", "bail_commercial"]
        
        for prop_type in new_types:
            payload = {
                "title": f"TEST_Property type {prop_type}",
                "type": prop_type,
                "price": 3000000,
                "currency": "GNF",
                "description": f"Test property for type {prop_type}",
                "city": "Conakry",
                "seller_name": "Test",
                "seller_phone": "+224 620 000 000",
                "property_category": "appartement",
                "bedrooms": 1,
                "bathrooms": 1,
                "surface_area": 50
            }
            
            response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
            assert response.status_code == 200, f"Failed for type {prop_type}: {response.text}"
            
            data = response.json()
            self.created_ids.append(data["id"])
            assert data["type"] == prop_type, f"Type mismatch for {prop_type}"
            
            print(f"SUCCESS: Property type '{prop_type}' accepted")
    
    def test_new_property_categories(self):
        """Test new property categories: immeuble, magasin"""
        new_categories = ["immeuble", "magasin"]
        
        for category in new_categories:
            payload = {
                "title": f"TEST_Category {category}",
                "type": "vente",
                "price": 500000000,
                "currency": "GNF",
                "description": f"Test property for category {category}",
                "city": "Conakry",
                "seller_name": "Test",
                "seller_phone": "+224 620 000 000",
                "property_category": category,
                "bedrooms": 0,
                "bathrooms": 0,
                "surface_area": 200
            }
            
            response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
            assert response.status_code == 200, f"Failed for category {category}: {response.text}"
            
            data = response.json()
            self.created_ids.append(data["id"])
            assert data["property_category"] == category, f"Category mismatch for {category}"
            
            print(f"SUCCESS: Property category '{category}' accepted")
    
    def test_update_property_extended_fields(self):
        """Test PUT /api/properties/{id} updates extended fields"""
        # Create property
        payload = {
            "title": "TEST_Property to update",
            "type": "vente",
            "price": 100000000,
            "currency": "GNF",
            "description": "Property to test update",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000",
            "property_category": "maison",
            "bedrooms": 3,
            "bathrooms": 2,
            "surface_area": 150,
            "salons": 1,
            "equipment": []
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert create_resp.status_code == 200
        prop_id = create_resp.json()["id"]
        self.created_ids.append(prop_id)
        
        # Update with extended fields
        update_payload = {
            "salons": 3,
            "kitchens": 2,
            "toilets": 5,
            "floors": 3,
            "year_built": "2020",
            "commune": "Matoto",
            "landmarks": "En face de la mosquee",
            "equipment": ["Piscine", "Jardin", "Groupe electrogene"],
            "show_usd": False,
            "show_eur": True
        }
        
        update_resp = self.session.put(f"{BASE_URL}/api/properties/{prop_id}", json=update_payload)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        data = update_resp.json()
        assert data["salons"] == 3
        assert data["kitchens"] == 2
        assert data["toilets"] == 5
        assert data["floors"] == 3
        assert data["year_built"] == "2020"
        assert data["commune"] == "Matoto"
        assert "mosquee" in data["landmarks"]
        assert len(data["equipment"]) == 3
        assert data["show_usd"] == False
        assert data["show_eur"] == True
        
        print("SUCCESS: Extended fields updated correctly")
    
    def test_price_conversion_in_response(self):
        """Test that price_converted is included in response"""
        payload = {
            "title": "TEST_Price conversion test",
            "type": "vente",
            "price": 8600000,  # Should be ~1000 USD
            "currency": "GNF",
            "description": "Test price conversion",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000",
            "property_category": "studio",
            "bedrooms": 1,
            "bathrooms": 1,
            "surface_area": 30
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        self.created_ids.append(data["id"])
        
        assert "price_converted" in data, "price_converted not in response"
        assert "gnf" in data["price_converted"]
        assert "usd" in data["price_converted"]
        assert "eur" in data["price_converted"]
        
        # Check conversion is approximately correct (1 USD = 8600 GNF)
        assert data["price_converted"]["usd"] == 1000 or abs(data["price_converted"]["usd"] - 1000) < 10
        
        print(f"SUCCESS: Price conversion works - {data['price_converted']}")


class TestPropertyFormValidation:
    """Test form validation for required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_missing_title_returns_422(self):
        """Test that missing title returns validation error"""
        payload = {
            "type": "vente",
            "price": 100000000,
            "description": "Test",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000"
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing title returns 422")
    
    def test_missing_price_returns_422(self):
        """Test that missing price returns validation error"""
        payload = {
            "title": "TEST_No price",
            "type": "vente",
            "description": "Test",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000"
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Missing price returns 422")
    
    def test_invalid_type_returns_422(self):
        """Test that invalid property type returns validation error"""
        payload = {
            "title": "TEST_Invalid type",
            "type": "invalid_type",
            "price": 100000000,
            "description": "Test",
            "city": "Conakry",
            "seller_name": "Test",
            "seller_phone": "+224 620 000 000"
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("SUCCESS: Invalid type returns 422")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
