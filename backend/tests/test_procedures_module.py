"""
Test Procedures Module - Iteration 25
Testing the complete procedures management system:
- CRUD procedures with steps and quick_actions
- Procedure stats
- File upload/download to cloud storage
- Chat actions CRUD
- Reference data (categories, countries)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "admin123"

# Existing procedure ID for testing
EXISTING_PROCEDURE_ID = "62cfc5a7-0bee-4179-9996-ac31366f5c98"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

# ─── Reference Data Endpoints ───────────────────────────────────────────────────

class TestReferenceData:
    """Test reference data endpoints (categories, countries, languages)"""
    
    def test_get_categories(self):
        """GET /api/procedures/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/procedures/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        assert "id" in data[0]
        assert "name" in data[0]
        # Check expected categories exist
        category_ids = [c["id"] for c in data]
        assert "visa_immigration" in category_ids
        assert "etudes" in category_ids
        print(f"✓ GET /api/procedures/categories - Found {len(data)} categories")
    
    def test_get_countries(self):
        """GET /api/procedures/countries returns list with flags"""
        response = requests.get(f"{BASE_URL}/api/procedures/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure includes flag
        assert "id" in data[0]
        assert "name" in data[0]
        assert "flag" in data[0]
        # Check expected countries
        country_ids = [c["id"] for c in data]
        assert "canada" in country_ids
        assert "france" in country_ids
        assert "guinee" in country_ids
        print(f"✓ GET /api/procedures/countries - Found {len(data)} countries with flags")
    
    def test_get_languages(self):
        """GET /api/procedures/languages returns available languages"""
        response = requests.get(f"{BASE_URL}/api/procedures/languages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        lang_ids = [l["id"] for l in data]
        assert "fr" in lang_ids
        assert "en" in lang_ids
        print(f"✓ GET /api/procedures/languages - Found {len(data)} languages")
    
    def test_get_complexity_levels(self):
        """GET /api/procedures/complexity-levels returns complexity options"""
        response = requests.get(f"{BASE_URL}/api/procedures/complexity-levels")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "facile" in data
        assert "modere" in data
        assert "difficile" in data
        print(f"✓ GET /api/procedures/complexity-levels - Found {len(data)} levels")

# ─── Procedures List & Stats ────────────────────────────────────────────────────

class TestProceduresList:
    """Test procedures listing and stats"""
    
    def test_get_procedures_paginated(self):
        """GET /api/procedures returns paginated list with enriched data"""
        response = requests.get(f"{BASE_URL}/api/procedures", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "procedures" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        if data["total"] > 0:
            proc = data["procedures"][0]
            # Verify enriched data fields
            assert "category_name" in proc
            assert "country_name" in proc
            assert "country_flag" in proc
            assert "steps" in proc
            assert "files" in proc
            assert "id" in proc
            assert "title" in proc
            print(f"✓ GET /api/procedures - Found {data['total']} procedures, page {data['page']}/{data['pages']}")
        else:
            print("✓ GET /api/procedures - No procedures found (empty list)")
    
    def test_get_procedures_with_filters(self):
        """GET /api/procedures with category and country filters"""
        response = requests.get(f"{BASE_URL}/api/procedures", params={
            "category": "visa_immigration",
            "country": "canada"
        })
        assert response.status_code == 200
        data = response.json()
        # Verify filter works (may return 0 or more results)
        assert "procedures" in data
        print(f"✓ GET /api/procedures filtered - Found {data['total']} matching visa_immigration/canada")
    
    def test_get_procedures_search(self):
        """GET /api/procedures with search term"""
        response = requests.get(f"{BASE_URL}/api/procedures", params={"search": "visa"})
        assert response.status_code == 200
        data = response.json()
        assert "procedures" in data
        print(f"✓ GET /api/procedures search='visa' - Found {data['total']} results")
    
    def test_get_procedures_stats_requires_admin(self, admin_headers):
        """GET /api/procedures/stats returns statistics (admin only)"""
        response = requests.get(f"{BASE_URL}/api/procedures/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total" in data
        assert "published" in data
        assert "drafts" in data
        assert "active" in data
        assert "total_files" in data
        assert "total_chat_actions" in data
        assert "total_views" in data
        assert "by_category" in data
        assert "by_country" in data
        
        print(f"✓ GET /api/procedures/stats - Total: {data['total']}, Published: {data['published']}, Drafts: {data['drafts']}")
    
    def test_get_stats_unauthenticated_fails(self):
        """GET /api/procedures/stats without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/procedures/stats")
        assert response.status_code in [401, 403]
        print("✓ GET /api/procedures/stats unauthenticated - Correctly returns 401/403")

# ─── Single Procedure & CRUD ────────────────────────────────────────────────────

class TestProcedureCRUD:
    """Test procedure create, read, update, delete"""
    
    def test_get_existing_procedure(self):
        """GET /api/procedures/{id} returns procedure with enriched data"""
        response = requests.get(f"{BASE_URL}/api/procedures/{EXISTING_PROCEDURE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["id"] == EXISTING_PROCEDURE_ID
        assert "title" in data
        assert "steps" in data
        assert "country_name" in data
        assert "country_flag" in data
        assert "category_name" in data
        assert "files" in data
        
        print(f"✓ GET /api/procedures/{EXISTING_PROCEDURE_ID} - '{data['title']}' with {len(data['steps'])} steps")
    
    def test_get_nonexistent_procedure_returns_404(self):
        """GET /api/procedures/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/procedures/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ GET /api/procedures/invalid-id - Correctly returns 404")
    
    def test_create_procedure_with_steps(self, admin_headers):
        """POST /api/procedures creates procedure with steps and quick_actions"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Procedure_{test_id}",
            "description": "Test procedure description for automated testing",
            "category": "visa_immigration",
            "country": "canada",
            "language": "fr",
            "complexity": "modere",
            "active": True,
            "status": "draft",
            "keywords": ["test", "automated", "visa"],
            "steps": [
                {
                    "title": "Step 1 - Preparation des documents",
                    "description": "Rassembler tous les documents necessaires",
                    "required_documents": ["Passeport valide", "Photos d'identite"],
                    "mandatory": True
                },
                {
                    "title": "Step 2 - Soumission en ligne",
                    "description": "Remplir le formulaire en ligne",
                    "required_documents": ["Formulaire DS-160"],
                    "mandatory": True
                }
            ],
            "quick_actions": [
                {"label": "Telecharger formulaire", "action_type": "download"},
                {"label": "Prendre rendez-vous", "action_type": "navigate"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/procedures", json=payload, headers=admin_headers)
        assert response.status_code == 200  # FastAPI returns 200 by default
        data = response.json()
        
        # Verify created procedure
        assert "id" in data
        assert data["title"] == payload["title"]
        assert len(data["steps"]) == 2
        assert data["steps"][0]["title"] == "Step 1 - Preparation des documents"
        assert data["steps"][0]["mandatory"] == True
        assert len(data["quick_actions"]) == 2
        assert data["country"] == "canada"
        assert data["category"] == "visa_immigration"
        assert data["version"] == 1
        
        created_id = data["id"]
        print(f"✓ POST /api/procedures - Created procedure '{data['title']}' with ID {created_id}")
        
        # Store for cleanup
        return created_id
    
    def test_update_procedure_increments_version(self, admin_headers):
        """PUT /api/procedures/{id} updates procedure and increments version"""
        # First create a test procedure
        create_payload = {
            "title": f"TEST_Update_Proc_{str(uuid.uuid4())[:8]}",
            "description": "Original description",
            "category": "etudes",
            "country": "france",
            "status": "draft",
            "steps": [{"title": "Original Step", "description": "Test", "mandatory": True}]
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        proc_id = create_response.json()["id"]
        original_version = create_response.json()["version"]
        
        # Update the procedure
        update_payload = {
            "title": "TEST_Updated Title",
            "description": "Updated description",
            "status": "published",
            "steps": [
                {"title": "Updated Step 1", "description": "Updated", "mandatory": True},
                {"title": "New Step 2", "description": "Added", "mandatory": False}
            ]
        }
        update_response = requests.put(f"{BASE_URL}/api/procedures/{proc_id}", json=update_payload, headers=admin_headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        # Verify update
        assert updated_data["title"] == "TEST_Updated Title"
        assert updated_data["status"] == "published"
        assert len(updated_data["steps"]) == 2
        assert updated_data["version"] == original_version + 1
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/procedures/{proc_id}")
        assert get_response.status_code == 200
        assert get_response.json()["title"] == "TEST_Updated Title"
        
        print(f"✓ PUT /api/procedures/{proc_id} - Updated and version incremented to {updated_data['version']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{proc_id}", headers=admin_headers)
    
    def test_delete_procedure(self, admin_headers):
        """DELETE /api/procedures/{id} deletes procedure"""
        # Create a test procedure first
        create_payload = {
            "title": f"TEST_Delete_Proc_{str(uuid.uuid4())[:8]}",
            "category": "autre",
            "country": "guinee",
            "status": "draft"
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        proc_id = create_response.json()["id"]
        
        # Delete the procedure
        delete_response = requests.delete(f"{BASE_URL}/api/procedures/{proc_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/procedures/{proc_id}")
        assert get_response.status_code == 404
        
        print(f"✓ DELETE /api/procedures/{proc_id} - Procedure deleted successfully")
    
    def test_create_procedure_unauthenticated_fails(self):
        """POST /api/procedures without auth returns 401/403"""
        payload = {"title": "Test", "category": "autre", "country": "guinee"}
        response = requests.post(f"{BASE_URL}/api/procedures", json=payload)
        assert response.status_code in [401, 403]
        print("✓ POST /api/procedures unauthenticated - Correctly returns 401/403")

# ─── Procedure Files ────────────────────────────────────────────────────────────

class TestProcedureFiles:
    """Test file upload and listing for procedures"""
    
    def test_list_procedure_files(self):
        """GET /api/procedures/{id}/files returns file list"""
        response = requests.get(f"{BASE_URL}/api/procedures/{EXISTING_PROCEDURE_ID}/files")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            file_item = data[0]
            assert "id" in file_item
            assert "file_name" in file_item
            assert "procedure_id" in file_item
            print(f"✓ GET /api/procedures/{EXISTING_PROCEDURE_ID}/files - Found {len(data)} files")
        else:
            print(f"✓ GET /api/procedures/{EXISTING_PROCEDURE_ID}/files - No files attached")
    
    def test_upload_file_to_procedure(self, admin_headers):
        """POST /api/procedures/{id}/files uploads file to cloud storage"""
        # Create a test procedure first
        create_payload = {
            "title": f"TEST_FileUpload_Proc_{str(uuid.uuid4())[:8]}",
            "category": "documents_administratifs",
            "country": "france",
            "status": "draft"
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        proc_id = create_response.json()["id"]
        
        # Upload a test file (text file)
        files = {
            "file": ("test_document.txt", b"This is test content for the file upload.", "text/plain")
        }
        upload_headers = {"Authorization": admin_headers["Authorization"]}
        upload_response = requests.post(
            f"{BASE_URL}/api/procedures/{proc_id}/files",
            files=files,
            headers=upload_headers
        )
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        
        # Verify file metadata
        assert "id" in file_data
        assert file_data["procedure_id"] == proc_id
        assert file_data["file_name"] == "test_document.txt"
        assert "storage_path" in file_data
        
        print(f"✓ POST /api/procedures/{proc_id}/files - File uploaded successfully")
        
        # Verify file appears in list
        list_response = requests.get(f"{BASE_URL}/api/procedures/{proc_id}/files")
        assert list_response.status_code == 200
        assert len(list_response.json()) == 1
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{proc_id}", headers=admin_headers)
    
    def test_download_file(self):
        """GET /api/procedures/files/{file_id}/download returns file content"""
        # First get files from existing procedure
        files_response = requests.get(f"{BASE_URL}/api/procedures/{EXISTING_PROCEDURE_ID}/files")
        if files_response.status_code == 200 and len(files_response.json()) > 0:
            file_id = files_response.json()[0]["id"]
            download_response = requests.get(f"{BASE_URL}/api/procedures/files/{file_id}/download")
            assert download_response.status_code == 200
            assert len(download_response.content) > 0
            print(f"✓ GET /api/procedures/files/{file_id}/download - File downloaded successfully")
        else:
            pytest.skip("No files available to test download")
    
    def test_upload_invalid_file_type_fails(self, admin_headers):
        """POST /api/procedures/{id}/files rejects invalid file types"""
        # Create test procedure
        create_payload = {
            "title": f"TEST_InvalidFile_Proc_{str(uuid.uuid4())[:8]}",
            "category": "autre",
            "country": "guinee"
        }
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=admin_headers)
        proc_id = create_response.json()["id"]
        
        # Try to upload an executable (not allowed)
        files = {
            "file": ("malicious.exe", b"fake executable content", "application/x-executable")
        }
        upload_headers = {"Authorization": admin_headers["Authorization"]}
        upload_response = requests.post(
            f"{BASE_URL}/api/procedures/{proc_id}/files",
            files=files,
            headers=upload_headers
        )
        assert upload_response.status_code == 400
        print("✓ POST /api/procedures/{id}/files - Correctly rejects invalid file type")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{proc_id}", headers=admin_headers)

# ─── Chat Actions ───────────────────────────────────────────────────────────────

class TestChatActions:
    """Test chat actions CRUD"""
    
    def test_list_chat_actions(self):
        """GET /api/chat-actions returns list of chat actions"""
        response = requests.get(f"{BASE_URL}/api/chat-actions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            action = data[0]
            assert "id" in action
            assert "title" in action
            assert "country_name" in action
            assert "country_flag" in action
            print(f"✓ GET /api/chat-actions - Found {len(data)} chat actions")
        else:
            print("✓ GET /api/chat-actions - No chat actions configured")
    
    def test_create_chat_action(self, admin_headers):
        """POST /api/chat-actions creates a new chat action"""
        payload = {
            "title": f"TEST_ChatAction_{str(uuid.uuid4())[:8]}",
            "country": "canada",
            "procedure_id": EXISTING_PROCEDURE_ID
        }
        response = requests.post(f"{BASE_URL}/api/chat-actions", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["title"] == payload["title"]
        assert data["country"] == "canada"
        assert data["country_name"] == "Canada"
        assert data["country_flag"] == "ca"
        
        created_id = data["id"]
        print(f"✓ POST /api/chat-actions - Created chat action '{data['title']}'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat-actions/{created_id}", headers=admin_headers)
    
    def test_update_chat_action(self, admin_headers):
        """PUT /api/chat-actions/{id} updates chat action"""
        # Create first
        create_payload = {
            "title": f"TEST_UpdateAction_{str(uuid.uuid4())[:8]}",
            "country": "france"
        }
        create_response = requests.post(f"{BASE_URL}/api/chat-actions", json=create_payload, headers=admin_headers)
        action_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "title": "TEST_Updated Action Title",
            "country": "allemagne"
        }
        update_response = requests.put(f"{BASE_URL}/api/chat-actions/{action_id}", json=update_payload, headers=admin_headers)
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert data["title"] == "TEST_Updated Action Title"
        assert data["country"] == "allemagne"
        assert data["country_name"] == "Allemagne"
        
        print(f"✓ PUT /api/chat-actions/{action_id} - Chat action updated")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat-actions/{action_id}", headers=admin_headers)
    
    def test_delete_chat_action(self, admin_headers):
        """DELETE /api/chat-actions/{id} deletes chat action"""
        # Create first
        create_payload = {
            "title": f"TEST_DeleteAction_{str(uuid.uuid4())[:8]}",
            "country": "guinee"
        }
        create_response = requests.post(f"{BASE_URL}/api/chat-actions", json=create_payload, headers=admin_headers)
        action_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/chat-actions/{action_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] == True
        
        print(f"✓ DELETE /api/chat-actions/{action_id} - Chat action deleted")

# ─── Cleanup ────────────────────────────────────────────────────────────────────

class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    def test_cleanup_test_procedures(self, admin_headers):
        """Delete all TEST_ prefixed procedures"""
        response = requests.get(f"{BASE_URL}/api/procedures", params={"limit": 100})
        if response.status_code == 200:
            procedures = response.json().get("procedures", [])
            deleted_count = 0
            for proc in procedures:
                if proc.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/procedures/{proc['id']}", headers=admin_headers)
                    if del_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleanup - Deleted {deleted_count} test procedures")
        else:
            print("✓ Cleanup - Could not fetch procedures list")
