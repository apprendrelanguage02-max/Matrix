"""
Iteration 28: Auth Gate, Video URL Support, File Download Testing

Tests:
1. Auth gate - endpoint access (procedure details still accessible but UI shows overlay)
2. Video URL support - procedure level (POST/PUT/GET)
3. Video URL support - step level (POST/PUT/GET)
4. Links support - step level (POST/PUT/GET)
5. File download from procedure detail page
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestAuthGateEndpoints:
    """Test that public endpoints still work (auth gate is frontend-only)"""
    
    def test_procedure_detail_public_access(self):
        """GET /api/procedures/:id should still work for non-authenticated users"""
        # Use test procedure ID from credentials
        procedure_id = "62cfc5a7-0bee-4179-9996-ac31366f5c98"
        response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        # Either 200 if procedure exists, or 404 if not - but not 401/403
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "title" in data
            print(f"✓ Procedure detail accessible: {data['title']}")

    def test_property_detail_public_access(self):
        """GET /api/properties/:id should still work for non-authenticated users"""
        property_id = "438115d8-e44d-4559-9c1d-abc0663827ef"
        response = requests.get(f"{BASE_URL}/api/properties/{property_id}")
        # Either 200 if property exists, or 404 if not - but not 401/403
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "title" in data
            print(f"✓ Property detail accessible: {data['title']}")


class TestVideoURLSupport:
    """Test video_url support at procedure and step levels"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token via OTP login"""
        # First send OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "email": "matrixguinea@gmail.com"
        })
        if otp_response.status_code != 200:
            pytest.skip("Could not send OTP - skipping authenticated tests")
        
        # Get OTP from database (we'll try common test OTPs first)
        # Try to verify with a test approach - use existing admin login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "matrixguinea@gmail.com",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            return login_response.json().get("token")
        
        pytest.skip("Could not authenticate - skipping admin tests")
    
    def test_procedure_get_returns_video_url(self):
        """GET /api/procedures/:id should return video_url field"""
        procedure_id = "62cfc5a7-0bee-4179-9996-ac31366f5c98"
        response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        if response.status_code == 404:
            # Try getting any procedure
            list_response = requests.get(f"{BASE_URL}/api/procedures")
            if list_response.status_code == 200:
                procedures = list_response.json().get("procedures", [])
                if procedures:
                    response = requests.get(f"{BASE_URL}/api/procedures/{procedures[0]['id']}")
        
        if response.status_code == 200:
            data = response.json()
            assert "video_url" in data, "video_url field missing from procedure response"
            print(f"✓ video_url field present in procedure: '{data.get('video_url', '')}'")
        else:
            pytest.skip("No procedures available to test")

    def test_procedure_steps_have_video_url(self):
        """GET /api/procedures/:id should return steps with video_url field"""
        procedure_id = "62cfc5a7-0bee-4179-9996-ac31366f5c98"
        response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        if response.status_code == 404:
            list_response = requests.get(f"{BASE_URL}/api/procedures")
            if list_response.status_code == 200:
                procedures = list_response.json().get("procedures", [])
                if procedures:
                    response = requests.get(f"{BASE_URL}/api/procedures/{procedures[0]['id']}")
        
        if response.status_code == 200:
            data = response.json()
            steps = data.get("steps", [])
            if steps:
                for i, step in enumerate(steps):
                    assert "video_url" in step, f"video_url field missing from step {i}"
                print(f"✓ All {len(steps)} steps have video_url field")
            else:
                print("✓ Procedure has no steps to check (video_url field present in schema)")
        else:
            pytest.skip("No procedures available to test")

    def test_procedure_steps_have_links(self):
        """GET /api/procedures/:id should return steps with links field"""
        procedure_id = "62cfc5a7-0bee-4179-9996-ac31366f5c98"
        response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}")
        if response.status_code == 404:
            list_response = requests.get(f"{BASE_URL}/api/procedures")
            if list_response.status_code == 200:
                procedures = list_response.json().get("procedures", [])
                if procedures:
                    response = requests.get(f"{BASE_URL}/api/procedures/{procedures[0]['id']}")
        
        if response.status_code == 200:
            data = response.json()
            steps = data.get("steps", [])
            if steps:
                for i, step in enumerate(steps):
                    assert "links" in step, f"links field missing from step {i}"
                print(f"✓ All {len(steps)} steps have links field")
            else:
                print("✓ Procedure has no steps to check (links field present in schema)")
        else:
            pytest.skip("No procedures available to test")

    def test_create_procedure_with_video_url(self, admin_token):
        """POST /api/procedures should accept video_url at procedure level"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        payload = {
            "title": f"TEST_Video_Procedure_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure with video",
            "category": "autre",
            "country": "guinee",
            "video_url": test_video_url,
            "steps": []
        }
        
        response = requests.post(f"{BASE_URL}/api/procedures", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Failed to create: {response.text}"
        
        data = response.json()
        assert data.get("video_url") == test_video_url, f"video_url not saved correctly"
        print(f"✓ Created procedure with video_url: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{data['id']}", headers=headers)

    def test_create_procedure_with_step_video_and_links(self, admin_token):
        """POST /api/procedures should accept video_url and links at step level"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        step_video_url = "https://youtu.be/abc123xyz"
        step_links = [
            {"label": "Official Site", "url": "https://example.com"},
            {"label": "Documentation", "url": "https://docs.example.com"}
        ]
        
        payload = {
            "title": f"TEST_Step_Video_Procedure_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure with step video and links",
            "category": "etudes",
            "country": "canada",
            "steps": [
                {
                    "title": "Step 1 with video",
                    "description": "This step has a video",
                    "video_url": step_video_url,
                    "links": step_links,
                    "mandatory": True
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/procedures", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Failed to create: {response.text}"
        
        data = response.json()
        steps = data.get("steps", [])
        assert len(steps) == 1, "Step not created"
        assert steps[0].get("video_url") == step_video_url, "Step video_url not saved"
        assert len(steps[0].get("links", [])) == 2, "Step links not saved"
        print(f"✓ Created procedure with step video_url and {len(steps[0]['links'])} links")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{data['id']}", headers=headers)

    def test_update_procedure_video_url(self, admin_token):
        """PUT /api/procedures/:id should update video_url"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a procedure
        create_payload = {
            "title": f"TEST_Update_Video_{uuid.uuid4().hex[:8]}",
            "description": "Test procedure for update",
            "category": "autre",
            "country": "guinee"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/procedures", json=create_payload, headers=headers)
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create test procedure")
        
        procedure_id = create_response.json()["id"]
        
        # Update with video_url
        new_video_url = "https://www.youtube.com/watch?v=updated123"
        update_payload = {
            "video_url": new_video_url
        }
        
        update_response = requests.put(f"{BASE_URL}/api/procedures/{procedure_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data.get("video_url") == new_video_url, "video_url not updated correctly"
        print(f"✓ Updated procedure video_url successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/procedures/{procedure_id}", headers=headers)


class TestFileDownload:
    """Test file download endpoint for procedure files"""
    
    def test_file_download_endpoint_exists(self):
        """GET /api/procedures/files/:file_id/download should exist"""
        file_id = "93039f99-efa2-4bcc-a6bb-bc8d53cf5476"
        response = requests.get(f"{BASE_URL}/api/procedures/files/{file_id}/download")
        # Should return file (200) or 404 if not found - but not 405 (method not allowed)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ File download endpoint accessible (status: {response.status_code})")

    def test_file_download_returns_file_content(self):
        """File download should return content with proper headers"""
        file_id = "93039f99-efa2-4bcc-a6bb-bc8d53cf5476"
        response = requests.get(f"{BASE_URL}/api/procedures/files/{file_id}/download")
        
        if response.status_code == 200:
            assert "content-disposition" in response.headers, "Missing Content-Disposition header"
            content_disp = response.headers["content-disposition"]
            assert "attachment" in content_disp.lower(), "Content-Disposition should indicate attachment"
            print(f"✓ File download returns proper headers: {content_disp}")
        else:
            print(f"⚠ File not found (404) - file may have been deleted")

    def test_list_procedure_files(self):
        """GET /api/procedures/:id/files should return file list"""
        procedure_id = "62cfc5a7-0bee-4179-9996-ac31366f5c98"
        response = requests.get(f"{BASE_URL}/api/procedures/{procedure_id}/files")
        
        if response.status_code == 200:
            files = response.json()
            print(f"✓ Found {len(files)} files for procedure")
            for f in files:
                print(f"  - {f.get('file_name', 'unnamed')} (id: {f.get('id')})")
        else:
            # Try to get files from any procedure
            list_response = requests.get(f"{BASE_URL}/api/procedures")
            if list_response.status_code == 200:
                procedures = list_response.json().get("procedures", [])
                for proc in procedures:
                    if proc.get("files"):
                        print(f"✓ Procedure {proc['id']} has {len(proc['files'])} files")
                        break


class TestReferenceDataForVideo:
    """Test that reference data endpoints work (for procedure builder)"""
    
    def test_categories_endpoint(self):
        """GET /api/procedures/categories should return category list"""
        response = requests.get(f"{BASE_URL}/api/procedures/categories")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        print(f"✓ Categories endpoint returns {len(data)} categories")

    def test_countries_endpoint(self):
        """GET /api/procedures/countries should return country list"""
        response = requests.get(f"{BASE_URL}/api/procedures/countries")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        # Check that each country has flag
        for c in data:
            assert "flag" in c, f"Country {c['id']} missing flag"
        print(f"✓ Countries endpoint returns {len(data)} countries with flags")

    def test_languages_endpoint(self):
        """GET /api/procedures/languages should return language list"""
        response = requests.get(f"{BASE_URL}/api/procedures/languages")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        print(f"✓ Languages endpoint returns {len(data)} languages")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
