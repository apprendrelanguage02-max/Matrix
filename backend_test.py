import requests
import sys
import json
from datetime import datetime
import time

class NewsAppTester:
    def __init__(self, base_url="https://responsive-redesign-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.passed_tests.append(f"{name} - Status: {response.status_code}")
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                    self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                    self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   🔑 Token obtained for user: {response.get('user', {}).get('username', 'Unknown')}")
            return True
        return False

    def test_rate_limiting(self):
        """Test rate limiting on login endpoint (10/minute)"""
        print("\n🔍 Testing Rate Limiting on /auth/login...")
        failed_attempts = 0
        
        # Try to make 12 login attempts quickly (should be rate limited after 10)
        for i in range(12):
            url = f"{self.base_url}/api/auth/login"
            try:
                response = requests.post(url, json={"email": "invalid@test.com", "password": "invalid"})
                if response.status_code == 429:  # Rate limited
                    print(f"   ⚡ Rate limited after {i+1} attempts - Status: {response.status_code}")
                    if i >= 9:  # Should be rate limited around 10 attempts
                        self.tests_passed += 1
                        self.passed_tests.append("Rate limiting working correctly")
                        return True
                elif response.status_code == 401:  # Invalid credentials (expected)
                    continue
                else:
                    print(f"   Unexpected status: {response.status_code}")
            except Exception as e:
                print(f"   Error during rate limit test: {e}")
                
        print(f"❌ Rate limiting not working as expected")
        self.failed_tests.append("Rate limiting: Not working correctly")
        self.tests_run += 1
        return False

    def test_categories_endpoint(self):
        """Test GET /categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET", 
            "/categories",
            200
        )
        if success:
            categories = response.get('categories', [])
            expected_categories = ["Actualité", "Politique", "Sport", "Technologie", "Économie"]
            if set(categories) == set(expected_categories):
                print(f"   📋 All expected categories found: {categories}")
                return True
            else:
                print(f"   ❌ Categories mismatch. Expected: {expected_categories}, Got: {categories}")
                self.failed_tests.append(f"Categories mismatch: expected {expected_categories}, got {categories}")
        return False

    def test_create_article_without_category(self):
        """Test creating article without category (should fail)"""
        success, response = self.run_test(
            "Create Article Without Category",
            "POST",
            "/articles",
            422,  # Should return validation error
            data={
                "title": "Test Article",
                "content": "This is test content for validation"
            }
        )
        if success:
            print("   ✅ Validation correctly rejected article without category")
            return True
        return False

    def test_create_article_with_invalid_category(self):
        """Test creating article with invalid category"""
        success, response = self.run_test(
            "Create Article With Invalid Category",
            "POST",
            "/articles", 
            422,  # Should return validation error
            data={
                "title": "Test Article",
                "content": "This is test content for validation",
                "category": "InvalidCategory"
            }
        )
        if success:
            print("   ✅ Validation correctly rejected invalid category")
            return True
        return False

    def test_create_article_short_title(self):
        """Test creating article with short title"""
        success, response = self.run_test(
            "Create Article With Short Title",
            "POST",
            "/articles",
            422,  # Should return validation error
            data={
                "title": "AB",  # Less than 3 chars
                "content": "This is test content with enough characters",
                "category": "Sport"
            }
        )
        if success:
            print("   ✅ Validation correctly rejected short title")
            return True
        return False

    def test_create_valid_article(self):
        """Test creating valid article"""
        success, response = self.run_test(
            "Create Valid Article (Sport Category)",
            "POST", 
            "/articles",
            200,  # Should succeed
            data={
                "title": "Test Sport Article",
                "content": "This is a valid test article about sports with sufficient content",
                "category": "Sport"
            }
        )
        if success and 'id' in response:
            print(f"   ✅ Article created with ID: {response['id']}")
            return response['id']
        return None

    def test_rich_text_article_creation(self):
        """Test creating article with rich HTML content"""
        rich_content = """
        <h2>Titre de Section</h2>
        <p>Ceci est un paragraphe avec <strong>gras</strong>, <em>italique</em>, et <u>souligné</u>.</p>
        <ul>
            <li>Premier élément de liste</li>
            <li>Deuxième élément</li>
        </ul>
        <blockquote>Ceci est une citation importante</blockquote>
        <p><img src="https://via.placeholder.com/400x300" alt="Image test" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;margin:12px auto;display:block;" /></p>
        """
        
        success, response = self.run_test(
            "Create Rich Text Article",
            "POST", 
            "/articles",
            200,
            data={
                "title": "Article avec Rich Text",
                "content": rich_content,
                "category": "Technologie"
            }
        )
        if success and 'id' in response:
            print(f"   ✅ Rich text article created with ID: {response['id']}")
            return response['id']
        return None

    def test_html_sanitization_xss(self):
        """Test HTML sanitization against XSS"""
        malicious_content = """
        <h2>Article Normal</h2>
        <p>Contenu légitime</p>
        <script>alert('XSS Attack!');</script>
        <img src="x" onerror="alert('Image XSS')" />
        <div onclick="maliciousFunction()">Texte avec event handler</div>
        <a href="javascript:alert('Link XSS')">Lien malveillant</a>
        <iframe src="http://malicious.com"></iframe>
        """
        
        success, response = self.run_test(
            "XSS Sanitization Test", 
            "POST",
            "/articles",
            200,
            data={
                "title": "Test Sanitisation XSS",
                "content": malicious_content,
                "category": "Technologie"
            }
        )
        
        if success and 'id' in response:
            # Verify the content was sanitized
            article_id = response['id']
            success2, article = self.run_test(
                "Verify XSS Sanitization",
                "GET",
                f"/articles/{article_id}",
                200
            )
            
            if success2:
                content = article.get('content', '')
                # Check that malicious elements were removed
                if ('<script>' not in content and 
                    'onerror=' not in content and 
                    'onclick=' not in content and
                    'javascript:' not in content and
                    '<iframe>' not in content):
                    print(f"   ✅ XSS content successfully sanitized")
                    return True
                else:
                    print(f"   ❌ XSS sanitization failed. Dangerous content found: {content[:200]}...")
                    self.failed_tests.append("XSS sanitization: Dangerous content not removed")
            
        return False

    def test_get_articles_with_pagination(self):
        """Test articles with pagination"""
        success, response = self.run_test(
            "Get Articles With Pagination",
            "GET",
            "/articles",
            200,
            data={"page": 1, "limit": 5}
        )
        if success:
            required_keys = ['articles', 'total', 'page', 'pages', 'limit']
            if all(key in response for key in required_keys):
                print(f"   ✅ Pagination metadata: total={response['total']}, pages={response['pages']}, limit={response['limit']}")
                return True
            else:
                print(f"   ❌ Missing pagination keys. Got: {list(response.keys())}")
                self.failed_tests.append(f"Missing pagination metadata keys")
        return False

    def test_get_articles_by_category(self):
        """Test filtering articles by category"""
        success, response = self.run_test(
            "Filter Articles by Sport Category",
            "GET",
            "/articles",
            200,
            data={"category": "Sport"}
        )
        if success:
            articles = response.get('articles', [])
            sport_articles = [a for a in articles if a.get('category') == 'Sport']
            if len(sport_articles) == len(articles):
                print(f"   ✅ Category filtering working: {len(sport_articles)} Sport articles found")
                return True
            else:
                print(f"   ❌ Category filtering issue: {len(sport_articles)}/{len(articles)} are Sport articles")
                self.failed_tests.append("Category filtering not working correctly")
        return False

    def test_protected_routes_without_auth(self):
        """Test that protected routes require authentication"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Create Article Without Auth",
            "POST",
            "/articles",
            401,  # Should be unauthorized
            data={
                "title": "Unauthorized Test",
                "content": "This should not work without authentication",
                "category": "Actualité"
            }
        )
        
        # Restore token
        self.token = original_token
        
        if success:
            print("   ✅ Protected route correctly requires authentication")
            return True
        return False

    def test_profile_update(self):
        """Test profile update endpoint"""
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "/auth/profile",
            200,
            data={
                "username": "admin_updated",
                "phone": "+33 6 12 34 56 78",
                "country": "France",
                "address": "123 rue de la Paix, Paris",
                "bio": "Administrateur de test"
            }
        )
        if success:
            # Verify profile was updated
            success2, user_data = self.run_test(
                "Get Updated Profile",
                "GET", 
                "/auth/me",
                200
            )
            if success2:
                if (user_data.get('username') == 'admin_updated' and 
                    user_data.get('phone') == '+33 6 12 34 56 78'):
                    print("   ✅ Profile update successful and verified")
                    return True
                else:
                    print(f"   ❌ Profile not updated correctly: {user_data}")
                    self.failed_tests.append("Profile update: Values not saved correctly")
            return success2
        return False

    def test_password_change(self):
        """Test password change endpoint"""
        # First test with wrong current password
        success, response = self.run_test(
            "Change Password (Wrong Current)",
            "PUT",
            "/auth/password", 
            400,  # Should fail with wrong current password
            data={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            }
        )
        if success:
            print("   ✅ Correctly rejected wrong current password")
        
        # Test with correct current password
        success2, response2 = self.run_test(
            "Change Password (Correct)",
            "PUT", 
            "/auth/password",
            200,
            data={
                "current_password": "admin123", 
                "new_password": "admin123new"
            }
        )
        
        if success2:
            # Test login with new password
            old_token = self.token
            self.token = None
            
            success3, response3 = self.run_test(
                "Login with New Password",
                "POST",
                "/auth/login", 
                200,
                data={"email": "admin@newsapp.fr", "password": "admin123new"}
            )
            
            if success3:
                print("   ✅ Password change and new login successful")
                self.token = response3.get('token')
                
                # Change back to original password for other tests
                self.run_test(
                    "Reset Password to Original",
                    "PUT",
                    "/auth/password",
                    200, 
                    data={
                        "current_password": "admin123new",
                        "new_password": "admin123"
                    }
                )
                return True
            else:
                self.token = old_token
                return False
        return False

    def test_saved_articles_functionality(self):
        """Test saved articles endpoints"""
        # First create an article to save
        success, response = self.run_test(
            "Create Article for Saving Test",
            "POST",
            "/articles", 
            200,
            data={
                "title": "Article to Save", 
                "content": "This article will be saved and unsaved for testing",
                "category": "Actualité"
            }
        )
        
        if not success or 'id' not in response:
            print("   ❌ Failed to create test article")
            return False
            
        article_id = response['id']
        print(f"   📄 Created test article with ID: {article_id}")
        
        # Test saving the article
        success2, response2 = self.run_test(
            "Save Article",
            "POST", 
            f"/saved-articles/{article_id}",
            200
        )
        if not success2:
            return False
            
        # Check save status
        success3, response3 = self.run_test(
            "Get Save Status", 
            "GET",
            f"/saved-articles/{article_id}/status",
            200
        )
        if success3 and response3.get('is_saved'):
            print("   ✅ Article save status correctly returned true")
        else:
            print("   ❌ Save status not working")
            self.failed_tests.append("Saved articles: Status endpoint not working")
            return False
            
        # Get saved articles list
        success4, response4 = self.run_test(
            "Get Saved Articles List",
            "GET",
            "/saved-articles", 
            200
        )
        if success4:
            saved_articles = response4
            found_article = any(s.get('article_id') == article_id for s in saved_articles)
            if found_article:
                print(f"   ✅ Article found in saved list ({len(saved_articles)} total saved)")
            else:
                print(f"   ❌ Article not found in saved list")
                self.failed_tests.append("Saved articles: Article not in saved list")
                return False
        else:
            return False
            
        # Test unsaving the article
        success5, response5 = self.run_test(
            "Unsave Article",
            "DELETE",
            f"/saved-articles/{article_id}",
            200
        )
        if success5:
            # Verify it's no longer saved
            success6, response6 = self.run_test(
                "Verify Article Unsaved",
                "GET", 
                f"/saved-articles/{article_id}/status",
                200
            )
            if success6 and not response6.get('is_saved'):
                print("   ✅ Article successfully unsaved")
                return True
            else:
                print("   ❌ Article still marked as saved after unsave")
                self.failed_tests.append("Saved articles: Unsave not working")
                
        return False

    def test_saved_articles_protection(self):
        """Test that saved articles routes require authentication"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Saved Articles Without Auth",
            "GET",
            "/saved-articles",
            401  # Should be unauthorized
        )
        
        # Restore token
        self.token = original_token
        
        if success:
            print("   ✅ Saved articles route correctly requires authentication")
            return True
        return False

def main():
    # Setup
    tester = NewsAppTester("https://responsive-redesign-8.preview.emergentagent.com")
    
    print("🚀 Starting Matrix News App Backend Tests")
    print(f"Testing against: {tester.base_url}")
    print("=" * 60)

    # Test 1: Categories endpoint
    print("\n📋 Testing Categories System")
    tester.test_categories_endpoint()

    # Test 2: Rate limiting
    print("\n⚡ Testing Rate Limiting")
    tester.test_rate_limiting()

    # Test 3: Admin login
    print("\n🔐 Testing Authentication")
    if not tester.test_login("admin@newsapp.fr", "admin123"):
        print("❌ Admin login failed, stopping protected route tests")
        return 1

    # Test 4: Article validation tests
    print("\n📝 Testing Article Validation")
    tester.test_create_article_without_category()
    tester.test_create_article_with_invalid_category() 
    tester.test_create_article_short_title()

    # Test 5: Valid article creation
    print("\n✅ Testing Valid Article Creation")
    article_id = tester.test_create_valid_article()

    # Test 6: Rich text article creation
    print("\n📝 Testing Rich Text Editor Content")
    rich_article_id = tester.test_rich_text_article_creation()

    # Test 7: HTML Sanitization (XSS Protection)
    print("\n🛡️  Testing HTML Sanitization")
    tester.test_html_sanitization_xss()

    # Test 8: Pagination
    print("\n📄 Testing Pagination")
    tester.test_get_articles_with_pagination()

    # Test 9: Category filtering 
    print("\n🏷️  Testing Category Filtering")
    tester.test_get_articles_by_category()

    # Test 10: Protected routes
    print("\n🔒 Testing Route Protection")
    tester.test_protected_routes_without_auth()
    
    # Test 11: Profile update functionality  
    print("\n👤 Testing Profile Update")
    tester.test_profile_update()
    
    # Test 12: Password change functionality
    print("\n🔑 Testing Password Change")
    tester.test_password_change()
    
    # Test 13: Saved articles functionality
    print("\n📚 Testing Saved Articles") 
    tester.test_saved_articles_functionality()
    
    # Test 14: Saved articles protection
    print("\n🔒 Testing Saved Articles Protection")
    tester.test_saved_articles_protection()

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 BACKEND TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for test in tester.failed_tests:
            print(f"   • {test}")
    
    if tester.passed_tests:
        print(f"\n✅ PASSED TESTS:")
        for test in tester.passed_tests:
            print(f"   • {test}")

    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate > 80 else 1

if __name__ == "__main__":
    sys.exit(main())