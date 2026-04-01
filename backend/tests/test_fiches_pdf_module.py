"""
Test suite for Fiches PDF Module - Iteration 31
Tests CRUD operations for fiches, PDF generation, and company settings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


class TestFichesPDFModule:
    """Test suite for Fiches PDF CRUD and PDF generation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ─── CRUD Tests for Fiches ───────────────────────────────────────────────────
    
    def test_create_fiche_success(self, auth_headers):
        """Test creating a new fiche with all fields"""
        payload = {
            "title": f"TEST_Fiche_{uuid.uuid4().hex[:8]}",
            "country": "Guinee",
            "category": "Immigration",
            "procedure_type": "Visa court sejour",
            "summary": "Test procedure summary",
            "currency": "GNF",
            "official_fees": 50000,
            "service_cost": 100000,
            "estimated_delay": "15-30 jours",
            "status": "draft",
            "documents": [
                {"name": "Passeport valide", "note": "6 mois minimum", "required": True},
                {"name": "Photo d'identite", "note": "", "required": True}
            ],
            "steps": [
                {"title": "Depot du dossier", "description": "Deposer le dossier complet", "duration": "1 jour", "remarks": "Arriver tot", "order": 0},
                {"title": "Paiement des frais", "description": "Payer les frais officiels", "duration": "30 min", "remarks": "", "order": 1}
            ],
            "additional_details": [
                {"title": "Conseils", "content": "Preparez tous les documents a l'avance"}
            ],
            "service_offering": {
                "title": "Accompagnement complet",
                "description": "Nous gerons votre dossier de A a Z",
                "cost": 150000,
                "currency": "GNF",
                "delay": "5-7 jours",
                "included": ["Verification documents", "Depot dossier"],
                "not_included": ["Frais officiels"]
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/fiches", json=payload, headers=auth_headers)
        assert response.status_code == 201, f"Create fiche failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No id in response"
        assert data["title"] == payload["title"]
        assert data["country"] == "Guinee"
        assert data["official_fees"] == 50000
        assert data["service_cost"] == 100000
        assert len(data["documents"]) == 2
        assert len(data["steps"]) == 2
        assert data["service_offering"]["title"] == "Accompagnement complet"
        
        # Store for cleanup
        self.__class__.created_fiche_id = data["id"]
        print(f"Created fiche with id: {data['id']}")
    
    def test_list_fiches(self, auth_headers):
        """Test listing all fiches"""
        response = requests.get(f"{BASE_URL}/api/fiches", headers=auth_headers)
        assert response.status_code == 200, f"List fiches failed: {response.text}"
        
        data = response.json()
        assert "fiches" in data
        assert "total" in data
        assert isinstance(data["fiches"], list)
        print(f"Found {data['total']} fiches")
    
    def test_list_fiches_with_status_filter(self, auth_headers):
        """Test listing fiches with status filter"""
        response = requests.get(f"{BASE_URL}/api/fiches?status=draft", headers=auth_headers)
        assert response.status_code == 200, f"List fiches with filter failed: {response.text}"
        
        data = response.json()
        assert "fiches" in data
        # All returned fiches should have draft status
        for fiche in data["fiches"]:
            assert fiche.get("status") == "draft", f"Fiche {fiche.get('id')} has status {fiche.get('status')}, expected draft"
        print(f"Found {data['total']} draft fiches")
    
    def test_get_single_fiche(self, auth_headers):
        """Test getting a single fiche by ID"""
        fiche_id = getattr(self.__class__, 'created_fiche_id', None)
        if not fiche_id:
            pytest.skip("No fiche created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get fiche failed: {response.text}"
        
        data = response.json()
        assert data["id"] == fiche_id
        assert "title" in data
        assert "documents" in data
        assert "steps" in data
        print(f"Retrieved fiche: {data['title']}")
    
    def test_get_nonexistent_fiche_returns_404(self, auth_headers):
        """Test getting a non-existent fiche returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/fiches/{fake_id}", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_update_fiche(self, auth_headers):
        """Test updating a fiche"""
        fiche_id = getattr(self.__class__, 'created_fiche_id', None)
        if not fiche_id:
            pytest.skip("No fiche created in previous test")
        
        update_payload = {
            "title": "TEST_Updated_Fiche_Title",
            "status": "published",
            "official_fees": 75000
        }
        
        response = requests.put(f"{BASE_URL}/api/fiches/{fiche_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Update fiche failed: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Updated_Fiche_Title"
        assert data["status"] == "published"
        assert data["official_fees"] == 75000
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["title"] == "TEST_Updated_Fiche_Title"
        print("Fiche updated and verified successfully")
    
    def test_update_nonexistent_fiche_returns_404(self, auth_headers):
        """Test updating a non-existent fiche returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(f"{BASE_URL}/api/fiches/{fake_id}", json={"title": "Test"}, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ─── PDF Generation Tests ────────────────────────────────────────────────────
    
    def test_generate_pdf_for_saved_fiche(self, auth_headers):
        """Test generating PDF for a saved fiche"""
        fiche_id = getattr(self.__class__, 'created_fiche_id', None)
        if not fiche_id:
            pytest.skip("No fiche created in previous test")
        
        response = requests.post(f"{BASE_URL}/api/fiches/{fiche_id}/pdf", headers=auth_headers)
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment disposition, got {content_disposition}"
        
        # Check PDF has content
        assert len(response.content) > 0, "PDF content is empty"
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"Generated PDF size: {len(response.content)} bytes")
    
    def test_generate_pdf_for_nonexistent_fiche_returns_404(self, auth_headers):
        """Test generating PDF for non-existent fiche returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/fiches/{fake_id}/pdf", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_preview_pdf_without_saving(self, auth_headers):
        """Test generating preview PDF from form data without saving"""
        payload = {
            "title": "Preview Test Fiche",
            "country": "Guinee",
            "category": "Test",
            "procedure_type": "Test Type",
            "summary": "This is a preview test",
            "currency": "EUR",
            "official_fees": 100,
            "service_cost": 200,
            "estimated_delay": "1 semaine",
            "status": "draft",
            "documents": [
                {"name": "Test Document", "note": "Test note", "required": True}
            ],
            "steps": [
                {"title": "Step 1", "description": "First step", "duration": "1h", "remarks": "", "order": 0}
            ],
            "additional_details": [],
            "service_offering": None
        }
        
        response = requests.post(f"{BASE_URL}/api/fiches/preview-pdf", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Preview PDF failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Check PDF has content
        assert len(response.content) > 0, "Preview PDF content is empty"
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"Generated preview PDF size: {len(response.content)} bytes")
    
    # ─── Company Settings Tests ──────────────────────────────────────────────────
    
    def test_get_company_settings(self, auth_headers):
        """Test getting company settings (creates defaults if none exist)"""
        response = requests.get(f"{BASE_URL}/api/company-settings", headers=auth_headers)
        assert response.status_code == 200, f"Get company settings failed: {response.text}"
        
        data = response.json()
        assert "company_name" in data
        assert "slogan" in data
        assert "signature_text" in data
        assert "footer_text" in data
        assert "default_currency" in data
        assert "logo_url" in data
        
        print(f"Company settings: {data.get('company_name')}")
    
    def test_update_company_settings(self, auth_headers):
        """Test updating company settings"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/company-settings", headers=auth_headers)
        original_settings = get_response.json()
        
        # Update settings
        update_payload = {
            "company_name": "TEST_Matrix News Updated",
            "slogan": "Test slogan updated",
            "signature_text": "Test signature",
            "footer_text": "Test footer",
            "default_currency": "EUR",
            "logo_url": "/nimba-logo.png",
            "contact_email": "test@example.com",
            "contact_phone": "+224 600 000 000",
            "primary_color": "#FF6600"
        }
        
        response = requests.put(f"{BASE_URL}/api/company-settings", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"Update company settings failed: {response.text}"
        
        data = response.json()
        assert data["company_name"] == "TEST_Matrix News Updated"
        assert data["slogan"] == "Test slogan updated"
        assert data["default_currency"] == "EUR"
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/company-settings", headers=auth_headers)
        verify_data = verify_response.json()
        assert verify_data["company_name"] == "TEST_Matrix News Updated"
        
        # Restore original settings
        restore_payload = {
            "company_name": original_settings.get("company_name", "Matrix News"),
            "slogan": original_settings.get("slogan", "Votre partenaire pour toutes vos demarches"),
            "signature_text": original_settings.get("signature_text", "Matrix News - Services Professionnels"),
            "footer_text": original_settings.get("footer_text", "Document genere automatiquement. Pour toute question, contactez-nous."),
            "default_currency": original_settings.get("default_currency", "GNF"),
            "logo_url": original_settings.get("logo_url", "/nimba-logo.png"),
            "contact_email": original_settings.get("contact_email", ""),
            "contact_phone": original_settings.get("contact_phone", ""),
            "primary_color": original_settings.get("primary_color", "#FF6600")
        }
        requests.put(f"{BASE_URL}/api/company-settings", json=restore_payload, headers=auth_headers)
        
        print("Company settings updated and restored successfully")
    
    # ─── Auth Required Tests ─────────────────────────────────────────────────────
    
    def test_fiches_endpoints_require_auth(self):
        """Test that fiches endpoints require authentication"""
        # No auth header
        endpoints = [
            ("GET", f"{BASE_URL}/api/fiches"),
            ("POST", f"{BASE_URL}/api/fiches"),
            ("GET", f"{BASE_URL}/api/fiches/test-id"),
            ("PUT", f"{BASE_URL}/api/fiches/test-id"),
            ("DELETE", f"{BASE_URL}/api/fiches/test-id"),
            ("POST", f"{BASE_URL}/api/fiches/test-id/pdf"),
            ("GET", f"{BASE_URL}/api/company-settings"),
            ("PUT", f"{BASE_URL}/api/company-settings"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = requests.get(url)
            elif method == "POST":
                response = requests.post(url, json={})
            elif method == "PUT":
                response = requests.put(url, json={})
            elif method == "DELETE":
                response = requests.delete(url)
            
            assert response.status_code in [401, 403, 422], f"{method} {url} should require auth, got {response.status_code}"
        
        print("All endpoints correctly require authentication")
    
    # ─── Delete Test (run last) ──────────────────────────────────────────────────
    
    def test_z_delete_fiche(self, auth_headers):
        """Test deleting a fiche (named with z_ to run last)"""
        fiche_id = getattr(self.__class__, 'created_fiche_id', None)
        if not fiche_id:
            pytest.skip("No fiche created in previous test")
        
        response = requests.delete(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete fiche failed: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        
        # Verify deletion with GET
        get_response = requests.get(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Fiche should be deleted"
        
        print(f"Fiche {fiche_id} deleted successfully")
    
    def test_z_delete_nonexistent_fiche_returns_404(self, auth_headers):
        """Test deleting a non-existent fiche returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/fiches/{fake_id}", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_fiches(self):
        """Clean up any TEST_ prefixed fiches"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Could not login for cleanup")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all fiches
        list_response = requests.get(f"{BASE_URL}/api/fiches", headers=headers)
        if list_response.status_code != 200:
            return
        
        fiches = list_response.json().get("fiches", [])
        deleted_count = 0
        
        for fiche in fiches:
            if fiche.get("title", "").startswith("TEST_"):
                delete_response = requests.delete(f"{BASE_URL}/api/fiches/{fiche['id']}", headers=headers)
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test fiches")
