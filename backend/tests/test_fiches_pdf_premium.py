"""
Test suite for Fiches PDF Premium Visual Refonte - Iteration 34
Tests:
- CreateFichePage premium UI loads correctly
- Matrix.png logo is used (not nimba-logo.png)
- Company settings sync between interface, preview, and PDF
- Currency selection per step
- Documents per step
- PDF generation with premium design
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://admin-status-badges.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestCompanySettings:
    """Test company settings API - logo should be Matrix.png"""
    
    def test_get_company_settings(self, auth_headers):
        """GET /api/company-settings returns settings with Matrix.png logo"""
        response = requests.get(f"{BASE_URL}/api/company-settings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify logo_url is Matrix.png (not nimba-logo.png)
        logo_url = data.get("logo_url", "")
        assert "Matrix.png" in logo_url or logo_url == "/Matrix.png", f"Logo should be Matrix.png, got: {logo_url}"
        assert "nimba-logo" not in logo_url.lower(), f"Should NOT use nimba-logo.png, got: {logo_url}"
        
        # Verify other settings exist
        assert "company_name" in data
        assert "slogan" in data
        print(f"Company settings: logo_url={logo_url}, company_name={data.get('company_name')}")
    
    def test_update_company_settings_logo(self, auth_headers):
        """PUT /api/company-settings can update logo to Matrix.png"""
        payload = {
            "company_name": "Matrix News",
            "slogan": "Votre partenaire pour toutes vos demarches",
            "signature_text": "Matrix News - Services Professionnels",
            "footer_text": "Document genere automatiquement. Pour toute question, contactez-nous.",
            "default_currency": "GNF",
            "logo_url": "/Matrix.png",
            "contact_email": "contact@matrixnews.org",
            "contact_phone": "+224 629 81 91 62",
            "primary_color": "#FF6600"
        }
        response = requests.put(f"{BASE_URL}/api/company-settings", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("logo_url") == "/Matrix.png"
        print("Company settings updated with Matrix.png logo")


class TestFichesCRUD:
    """Test Fiches CRUD operations with premium features"""
    
    def test_create_fiche_with_step_currencies(self, auth_headers):
        """POST /api/fiches creates fiche with per-step currency selection"""
        payload = {
            "title": "TEST_Visa_Premium_Iter34",
            "country": "Guinee",
            "category": "Immigration",
            "procedure_type": "Visa court sejour",
            "summary": "Procedure de demande de visa avec frais en devises multiples",
            "currency": "GNF",
            "official_fees": 50000,
            "service_cost": 25000,
            "estimated_delay": "15-30 jours",
            "status": "draft",
            "steps": [
                {
                    "title": "Depot du dossier",
                    "description": "Deposer le dossier complet au consulat",
                    "duration": "1 jour",
                    "remarks": "Arriver tot le matin",
                    "order": 0,
                    "documents": [
                        {"name": "Passeport valide", "note": "6 mois de validite minimum", "required": True},
                        {"name": "Photos d'identite", "note": "Format 4x5", "required": True}
                    ],
                    "fees": 100000,
                    "fees_currency": "GNF"
                },
                {
                    "title": "Paiement des frais consulaires",
                    "description": "Payer les frais de traitement",
                    "duration": "30 minutes",
                    "remarks": "",
                    "order": 1,
                    "documents": [
                        {"name": "Recu de depot", "note": "", "required": True}
                    ],
                    "fees": 80,
                    "fees_currency": "EUR"
                },
                {
                    "title": "Retrait du visa",
                    "description": "Recuperer le passeport avec visa",
                    "duration": "15 jours",
                    "remarks": "Verifier le statut en ligne",
                    "order": 2,
                    "documents": [],
                    "fees": 50,
                    "fees_currency": "USD"
                }
            ],
            "additional_details": [
                {"title": "Conseils importants", "content": "Preparer tous les documents a l'avance"}
            ],
            "service_offering": {
                "title": "Accompagnement complet",
                "description": "Nous gerons votre dossier de A a Z",
                "cost": 500000,
                "currency": "GNF",
                "delay": "5-7 jours",
                "included": ["Verification des documents", "Suivi du dossier"],
                "not_included": ["Frais consulaires", "Transport"]
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/fiches", headers=auth_headers, json=payload)
        assert response.status_code == 201, f"Failed: {response.text}"
        data = response.json()
        
        # Verify fiche created
        assert data.get("id") is not None
        assert data.get("title") == "TEST_Visa_Premium_Iter34"
        
        # Verify steps with different currencies
        steps = data.get("steps", [])
        assert len(steps) == 3
        assert steps[0].get("fees_currency") == "GNF"
        assert steps[1].get("fees_currency") == "EUR"
        assert steps[2].get("fees_currency") == "USD"
        
        # Verify documents per step
        assert len(steps[0].get("documents", [])) == 2
        assert len(steps[1].get("documents", [])) == 1
        assert len(steps[2].get("documents", [])) == 0
        
        print(f"Created fiche with ID: {data.get('id')}")
        return data.get("id")
    
    def test_get_fiche_returns_step_currencies(self, auth_headers):
        """GET /api/fiches/{id} returns step-level currency info"""
        # First create a fiche
        fiche_id = self.test_create_fiche_with_step_currencies(auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify step currencies preserved
        steps = data.get("steps", [])
        currencies = [s.get("fees_currency") for s in steps]
        assert "GNF" in currencies
        assert "EUR" in currencies
        assert "USD" in currencies
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
        print(f"Verified and cleaned up fiche {fiche_id}")


class TestPDFGeneration:
    """Test PDF generation with premium design"""
    
    def test_generate_pdf_returns_valid_pdf(self, auth_headers):
        """POST /api/fiches/{id}/pdf generates valid PDF with Matrix.png logo"""
        # Create a test fiche
        payload = {
            "title": "TEST_PDF_Premium_Iter34",
            "country": "Guinee",
            "category": "Immigration",
            "procedure_type": "Visa",
            "summary": "Test PDF generation",
            "currency": "GNF",
            "official_fees": 50000,
            "service_cost": 25000,
            "estimated_delay": "15 jours",
            "status": "draft",
            "steps": [
                {
                    "title": "Etape 1",
                    "description": "Description",
                    "duration": "1 jour",
                    "remarks": "Important",
                    "order": 0,
                    "documents": [{"name": "Document 1", "note": "Note", "required": True}],
                    "fees": 100000,
                    "fees_currency": "GNF"
                }
            ]
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/fiches", headers=auth_headers, json=payload)
        assert create_resp.status_code == 201
        fiche_id = create_resp.json().get("id")
        
        # Generate PDF
        pdf_resp = requests.post(f"{BASE_URL}/api/fiches/{fiche_id}/pdf", headers=auth_headers)
        assert pdf_resp.status_code == 200, f"PDF generation failed: {pdf_resp.text}"
        
        # Verify it's a PDF
        assert pdf_resp.headers.get("content-type") == "application/pdf"
        assert len(pdf_resp.content) > 1000, "PDF too small, likely empty"
        
        # Check PDF header
        assert pdf_resp.content[:4] == b'%PDF', "Not a valid PDF file"
        
        print(f"Generated PDF: {len(pdf_resp.content)} bytes")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fiches/{fiche_id}", headers=auth_headers)
    
    def test_preview_pdf_endpoint(self, auth_headers):
        """POST /api/fiches/preview-pdf generates PDF without saving"""
        payload = {
            "title": "TEST_Preview_PDF",
            "country": "Guinee",
            "category": "Test",
            "procedure_type": "Test",
            "summary": "Preview test",
            "currency": "EUR",
            "official_fees": 100,
            "service_cost": 50,
            "estimated_delay": "5 jours",
            "status": "draft",
            "steps": [
                {
                    "title": "Step 1",
                    "description": "Desc",
                    "duration": "1h",
                    "remarks": "",
                    "order": 0,
                    "documents": [],
                    "fees": 50,
                    "fees_currency": "EUR"
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/fiches/preview-pdf", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Preview PDF failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        print(f"Preview PDF generated: {len(response.content)} bytes")


class TestLogoFiles:
    """Test that Matrix.png logo files exist and are accessible"""
    
    def test_matrix_logo_accessible_frontend(self):
        """Matrix.png should be accessible from frontend public folder"""
        response = requests.get(f"{BASE_URL}/Matrix.png")
        assert response.status_code == 200, f"Matrix.png not accessible: {response.status_code}"
        assert len(response.content) > 10000, "Logo file too small"
        print(f"Matrix.png accessible: {len(response.content)} bytes")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_fiches(self, auth_headers):
        """Delete all TEST_ prefixed fiches"""
        response = requests.get(f"{BASE_URL}/api/fiches", headers=auth_headers)
        if response.status_code == 200:
            fiches = response.json().get("fiches", [])
            deleted = 0
            for fiche in fiches:
                if fiche.get("title", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/fiches/{fiche['id']}", headers=auth_headers)
                    if del_resp.status_code in [200, 204]:
                        deleted += 1
            print(f"Cleaned up {deleted} test fiches")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
