#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class NewsAppAPITester:
    def __init__(self, base_url="https://headline-press.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.visitor_token = None
        self.admin_user = None
        self.visitor_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_articles = []
        
        # Test credentials
        self.visitor_credentials = {
            "username": "Visiteur",
            "email": "visiteur@test.fr", 
            "password": "test123456"
        }
        self.admin_credentials = {
            "email": "admin@newsapp.fr",
            "password": "admin123"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                try:
                    return False, response.json()
                except:
                    return False, response.text

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "/",
            200
        )
        return success

    def test_login(self, email, password):
        """Test login with admin credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and isinstance(response, dict) and 'token' in response:
            self.token = response['token']
            self.user = response['user']
            print(f"   Logged in as: {self.user.get('username', 'Unknown')}")
            return True
        return False

    def test_get_public_articles(self):
        """Test getting public articles (should work without auth)"""
        success, response = self.run_test(
            "Get Public Articles",
            "GET",
            "/articles",
            200
        )
        if success:
            print(f"   Found {len(response)} public articles")
        return success, response

    def test_get_my_articles(self):
        """Test getting user's articles (requires auth)"""
        success, response = self.run_test(
            "Get My Articles",
            "GET",
            "/my-articles",
            200
        )
        if success:
            print(f"   Found {len(response)} user articles")
        return success, response

    def test_create_article(self, title, content, image_url=None):
        """Test creating a new article"""
        data = {
            "title": title,
            "content": content
        }
        if image_url:
            data["image_url"] = image_url
            
        success, response = self.run_test(
            "Create Article",
            "POST",
            "/articles",
            200,  # Based on the FastAPI code, create returns the created article
            data=data
        )
        if success and isinstance(response, dict) and 'id' in response:
            self.created_articles.append(response['id'])
            print(f"   Created article ID: {response['id']}")
            return True, response
        return False, response

    def test_get_article_by_id(self, article_id):
        """Test getting a specific article by ID"""
        success, response = self.run_test(
            f"Get Article {article_id}",
            "GET",
            f"/articles/{article_id}",
            200
        )
        return success, response

    def test_update_article(self, article_id, title=None, content=None, image_url=None):
        """Test updating an existing article"""
        data = {}
        if title:
            data["title"] = title
        if content:
            data["content"] = content
        if image_url is not None:  # Allow empty string
            data["image_url"] = image_url
            
        success, response = self.run_test(
            f"Update Article {article_id}",
            "PUT",
            f"/articles/{article_id}",
            200,
            data=data
        )
        return success, response

    def test_delete_article(self, article_id):
        """Test deleting an article"""
        success, response = self.run_test(
            f"Delete Article {article_id}",
            "DELETE",
            f"/articles/{article_id}",
            200
        )
        if success and article_id in self.created_articles:
            self.created_articles.remove(article_id)
        return success, response

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Unauthorized Access to My Articles",
            "GET",
            "/my-articles",
            401  # Should return Unauthorized
        )
        
        # Restore token
        self.token = original_token
        return not success  # We expect this to fail, so return True if it fails properly

def main():
    print("🚀 Testing NewsApp Backend API")
    print("=" * 50)
    
    # Initialize tester
    tester = NewsAppAPITester()
    
    # Test API root
    if not tester.test_root_endpoint():
        print("❌ API root endpoint failed, stopping tests")
        return 1

    # Test public articles (before login)
    public_success, public_articles = tester.test_get_public_articles()
    if not public_success:
        print("❌ Public articles endpoint failed")
        return 1

    # Test login with admin credentials
    if not tester.test_login("admin@newsapp.fr", "admin123"):
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test my articles (after login)
    my_success, my_articles = tester.test_get_my_articles()
    if not my_success:
        print("❌ My articles endpoint failed")
        return 1

    # Test article creation
    test_title = f"Article de Test {datetime.now().strftime('%H:%M:%S')}"
    test_content = "Ceci est un contenu de test pour vérifier la création d'articles."
    test_image = "https://via.placeholder.com/600x300/FF6600/FFFFFF?text=Test+Image"
    
    create_success, created_article = tester.test_create_article(
        test_title, test_content, test_image
    )
    if not create_success:
        print("❌ Article creation failed")
        return 1

    article_id = created_article.get('id') if isinstance(created_article, dict) else None
    if not article_id:
        print("❌ Created article has no ID")
        return 1

    # Test getting the created article
    if not tester.test_get_article_by_id(article_id)[0]:
        print("❌ Failed to retrieve created article")
        return 1

    # Test updating the article
    updated_title = f"Article Modifié {datetime.now().strftime('%H:%M:%S')}"
    if not tester.test_update_article(article_id, title=updated_title)[0]:
        print("❌ Article update failed")
        return 1

    # Test unauthorized access
    if not tester.test_unauthorized_access():
        print("❌ Authorization test failed")
        return 1

    # Test deleting the article
    if not tester.test_delete_article(article_id)[0]:
        print("❌ Article deletion failed")
        return 1

    # Verify article is deleted
    delete_verify_success, _ = tester.test_get_article_by_id(article_id)
    if delete_verify_success:
        print("❌ Article still exists after deletion")
        return 1
    else:
        print("✅ Article successfully deleted and not accessible")
        tester.tests_passed += 1
        tester.tests_run += 1

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Backend Test Results:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    success_rate = tester.tests_passed / tester.tests_run
    if success_rate >= 0.9:
        print("🎉 Backend tests PASSED!")
        return 0
    else:
        print("💥 Backend tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())