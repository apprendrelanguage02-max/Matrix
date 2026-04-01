"""
Test Fiches PDF Restructure - Iteration 33
Tests for:
1. Documents and fees per step (not global)
2. Total fees calculation at bottom
3. Matrix.png logo in PDF
4. API endpoints for fiches with new structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestFicheWithStepDocumentsAndFees:
    """Test fiches with documents and fees per step"""
    
    created_fiche_id = None
    
    def test_create_fiche_with_step_documents_and_fees(self, api_client):
        """Create a fiche with documents and fees inside each step"""
        payload = {
            "title": "TEST_Fiche_Restructure_Iter33",
            "country": "Guinee",
            "category": "Immigration",
            "procedure_type": "Visa",
            "summary": "Test fiche with documents and fees per step",
            "currency": "GNF",
            "official_fees": 500000,
            "service_cost": 200000,
            "estimated_delay": "15-30 jours",
            "status": "draft",
            "documents": [],  # Global documents should be empty now
            "steps": [
                {
                    "title": "Etape 1 - Preparation",
                    "description": "Preparer les documents",
                    "duration": "2 jours",
                    "remarks": "Important: verifier les dates",
                    "order": 0,
                    "documents": [
                        {"name": "Passeport valide", "note": "6 mois minimum", "required": True},
                        {"name": "Photo d'identite", "note": "Format 4x4", "required": True}
                    ],
                    "fees": 100000
                },
                {
                    "title": "Etape 2 - Depot",
                    "description": "Deposer le dossier",
                    "duration": "1 jour",
                    "remarks": "",
                    "order": 1,
                    "documents": [
                        {"name": "Formulaire rempli", "note": "", "required": True},
                        {"name": "Justificatif de domicile", "note": "Moins de 3 mois", "required": False}
                    ],
                    "fees": 150000
                },
                {
                    "title": "Etape 3 - Suivi",
                    "description": "Suivre le dossier",
                    "duration": "10 jours",
                    "remarks": "",
                    "order": 2,
                    "documents": [],
                    "fees": 0
                }
            ],
            "additional_details": [
                {"title": "Conseils", "content": "Arriver tot le matin"}
            ],
            "service_offering": {
                "title": "Accompagnement complet",
                "description": "Nous gerons tout",
                "cost": 300000,
                "currency": "GNF",
                "delay": "5 jours",
                "included": ["Suivi dossier", "Conseil"],
                "not_included": ["Frais officiels"]
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/fiches", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        TestFicheWithStepDocumentsAndFees.created_fiche_id = data["id"]
        
        # Verify steps have documents and fees
        assert len(data["steps"]) == 3
        assert len(data["steps"][0]["documents"]) == 2
        assert data["steps"][0]["fees"] == 100000
        assert len(data["steps"][1]["documents"]) == 2
        assert data["steps"][1]["fees"] == 150000
        assert len(data["steps"][2]["documents"]) == 0
        assert data["steps"][2]["fees"] == 0
        
        # Verify global documents is empty
        assert data["documents"] == []
        
        print(f"Created fiche with id: {data['id']}")
    
    def test_get_fiche_returns_step_documents_and_fees(self, api_client):
        """Verify GET returns documents and fees per step"""
        fiche_id = TestFicheWithStepDocumentsAndFees.created_fiche_id
        assert fiche_id, "Fiche not created"
        
        response = api_client.get(f"{BASE_URL}/api/fiches/{fiche_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify step 1 documents
        step1 = data["steps"][0]
        assert step1["title"] == "Etape 1 - Preparation"
        assert len(step1["documents"]) == 2
        assert step1["documents"][0]["name"] == "Passeport valide"
        assert step1["documents"][0]["required"] == True
        assert step1["fees"] == 100000
        
        # Verify step 2 documents
        step2 = data["steps"][1]
        assert len(step2["documents"]) == 2
        assert step2["fees"] == 150000
        
        print("GET returns step documents and fees correctly")
    
    def test_update_fiche_step_documents_and_fees(self, api_client):
        """Update step documents and fees"""
        fiche_id = TestFicheWithStepDocumentsAndFees.created_fiche_id
        assert fiche_id, "Fiche not created"
        
        # Update with new step fees
        payload = {
            "steps": [
                {
                    "title": "Etape 1 - Preparation Updated",
                    "description": "Preparer les documents",
                    "duration": "3 jours",
                    "remarks": "",
                    "order": 0,
                    "documents": [
                        {"name": "Passeport valide", "note": "12 mois minimum", "required": True}
                    ],
                    "fees": 120000
                },
                {
                    "title": "Etape 2 - Depot",
                    "description": "Deposer le dossier",
                    "duration": "1 jour",
                    "remarks": "",
                    "order": 1,
                    "documents": [],
                    "fees": 180000
                }
            ]
        }
        
        response = api_client.put(f"{BASE_URL}/api/fiches/{fiche_id}", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["steps"]) == 2
        assert data["steps"][0]["fees"] == 120000
        assert data["steps"][1]["fees"] == 180000
        assert len(data["steps"][0]["documents"]) == 1
        
        print("Updated step documents and fees successfully")
    
    def test_total_fees_calculation(self, api_client):
        """Verify total fees calculation (step fees + official + service)"""
        fiche_id = TestFicheWithStepDocumentsAndFees.created_fiche_id
        assert fiche_id, "Fiche not created"
        
        response = api_client.get(f"{BASE_URL}/api/fiches/{fiche_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Calculate expected total
        step_fees = sum(s.get("fees", 0) for s in data["steps"])
        official_fees = data.get("official_fees", 0)
        service_cost = data.get("service_cost", 0)
        expected_total = step_fees + official_fees + service_cost
        
        # Step fees: 120000 + 180000 = 300000
        # Official: 500000
        # Service: 200000
        # Total: 1000000
        assert step_fees == 300000, f"Expected step fees 300000, got {step_fees}"
        assert official_fees == 500000
        assert service_cost == 200000
        assert expected_total == 1000000, f"Expected total 1000000, got {expected_total}"
        
        print(f"Total fees calculation correct: {expected_total} GNF")


class TestPDFGeneration:
    """Test PDF generation with new structure"""
    
    def test_generate_pdf_returns_valid_pdf(self, api_client):
        """Generate PDF and verify it's valid"""
        fiche_id = TestFicheWithStepDocumentsAndFees.created_fiche_id
        if not fiche_id:
            pytest.skip("No fiche created")
        
        response = api_client.post(f"{BASE_URL}/api/fiches/{fiche_id}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type
        assert "application/pdf" in response.headers.get("Content-Type", "")
        
        # Verify PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Verify PDF has content (more than just header)
        assert len(content) > 1000, f"PDF too small: {len(content)} bytes"
        
        print(f"PDF generated successfully: {len(content)} bytes")
    
    def test_preview_pdf_with_step_documents_and_fees(self, api_client):
        """Test preview PDF endpoint with step documents and fees"""
        payload = {
            "title": "TEST_Preview_PDF_Restructure",
            "country": "Guinee",
            "category": "Test",
            "procedure_type": "Test",
            "summary": "Preview test",
            "currency": "GNF",
            "official_fees": 100000,
            "service_cost": 50000,
            "estimated_delay": "5 jours",
            "status": "draft",
            "documents": [],
            "steps": [
                {
                    "title": "Step with docs and fees",
                    "description": "Test step",
                    "duration": "1 jour",
                    "remarks": "",
                    "order": 0,
                    "documents": [
                        {"name": "Test Document", "note": "Test note", "required": True}
                    ],
                    "fees": 75000
                }
            ],
            "additional_details": [],
            "service_offering": None
        }
        
        response = api_client.post(f"{BASE_URL}/api/fiches/preview-pdf", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify PDF
        assert "application/pdf" in response.headers.get("Content-Type", "")
        assert response.content[:4] == b'%PDF'
        
        print("Preview PDF with step documents and fees works")


class TestCompanySettingsLogo:
    """Test company settings logo configuration"""
    
    def test_get_company_settings(self, api_client):
        """Get company settings"""
        response = api_client.get(f"{BASE_URL}/api/company-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "company_name" in data
        assert "logo_url" in data
        
        print(f"Company settings: logo_url={data.get('logo_url')}")
    
    def test_update_logo_to_matrix(self, api_client):
        """Update logo to Matrix.png"""
        # First get current settings
        response = api_client.get(f"{BASE_URL}/api/company-settings")
        current = response.json()
        
        # Update with Matrix.png
        payload = {
            "company_name": current.get("company_name", "Matrix News"),
            "slogan": current.get("slogan", "Votre partenaire pour toutes vos demarches"),
            "signature_text": current.get("signature_text", "Matrix News - Services Professionnels"),
            "footer_text": current.get("footer_text", "Document genere automatiquement."),
            "default_currency": current.get("default_currency", "GNF"),
            "logo_url": "/Matrix.png",
            "contact_email": current.get("contact_email", ""),
            "contact_phone": current.get("contact_phone", ""),
            "primary_color": current.get("primary_color", "#FF6600")
        }
        
        response = api_client.put(f"{BASE_URL}/api/company-settings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["logo_url"] == "/Matrix.png"
        
        print("Logo updated to Matrix.png")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_fiches(self, api_client):
        """Delete test fiches"""
        # Get all fiches
        response = api_client.get(f"{BASE_URL}/api/fiches")
        if response.status_code != 200:
            pytest.skip("Could not get fiches list")
        
        fiches = response.json().get("fiches", [])
        deleted = 0
        
        for fiche in fiches:
            if fiche.get("title", "").startswith("TEST_"):
                del_response = api_client.delete(f"{BASE_URL}/api/fiches/{fiche['id']}")
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test fiches")
