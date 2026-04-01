"""
Iteration 36 - OTP Registration Bug Fixes Testing
Tests for:
1. POST /api/auth/register with NEW email → creates account + otp_sent:true
2. POST /api/auth/register with EXISTING pending_verification email → returns 200 (not 400!) with otp_sent:true and existing_pending:true
3. POST /api/auth/register with EXISTING active email → returns 400 "Cet email est deja utilise"
4. POST /api/auth/send-otp is NOT blocked by global rate limiter (can be called multiple times)
5. POST /api/auth/verify-otp with correct code → 200 with token
6. POST /api/auth/verify-otp with wrong code → 400 "Code incorrect"
7. POST /api/auth/verify-otp with expired code → 400 with expiration message
"""
import pytest
import requests
import os
import uuid
import hashlib
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "matrixguinea@gmail.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def test_email_new():
    """Generate unique email for new user test"""
    return f"test_new_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture(scope="module")
def test_email_pending():
    """Generate unique email for pending verification test"""
    return f"test_pending_{uuid.uuid4().hex[:8]}@example.com"


class TestRegisterNewUser:
    """Test 1: POST /api/auth/register with NEW email creates account + otp_sent:true"""
    
    def test_register_new_user_returns_otp_sent_true(self, api_client, test_email_new):
        """Register a completely new user - should return otp_sent:true"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test New User",
            "username": f"test_new_{uuid.uuid4().hex[:6]}",
            "email": test_email_new,
            "password": "testpass123",
            "role": "visiteur"
        })
        
        print(f"Register new user response: {response.status_code} - {response.text}")
        
        # Should return 200 (success)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Must have otp_sent:true
        assert data.get("otp_sent") == True, f"Expected otp_sent:true, got {data}"
        # Must have user_id
        assert "user_id" in data, f"Expected user_id in response, got {data}"
        # Must have email
        assert data.get("email") == test_email_new, f"Expected email={test_email_new}, got {data}"
        # Should NOT have existing_pending (this is a new user)
        assert data.get("existing_pending") != True, f"New user should not have existing_pending:true"
        
        print(f"✓ New user registration successful with otp_sent:true")


class TestRegisterExistingPendingUser:
    """Test 2: POST /api/auth/register with EXISTING pending_verification email returns 200 with otp_sent:true and existing_pending:true"""
    
    def test_register_existing_pending_returns_200_with_new_otp(self, api_client, test_email_pending):
        """First register a user, then try to register again with same email - should return 200 with new OTP"""
        
        # Step 1: Register the user first time
        username1 = f"test_pending_{uuid.uuid4().hex[:6]}"
        response1 = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Pending User",
            "username": username1,
            "email": test_email_pending,
            "password": "testpass123",
            "role": "visiteur"
        })
        
        print(f"First registration response: {response1.status_code} - {response1.text}")
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Step 2: Try to register again with same email (user is pending_verification)
        username2 = f"test_pending2_{uuid.uuid4().hex[:6]}"
        response2 = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Pending User 2",
            "username": username2,
            "email": test_email_pending,
            "password": "testpass456",
            "role": "visiteur"
        })
        
        print(f"Second registration (existing pending) response: {response2.status_code} - {response2.text}")
        
        # CRITICAL BUG FIX: Should return 200, NOT 400!
        assert response2.status_code == 200, f"Expected 200 for existing pending user, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        # Must have otp_sent:true (new OTP was sent)
        assert data.get("otp_sent") == True, f"Expected otp_sent:true, got {data}"
        # Must have existing_pending:true
        assert data.get("existing_pending") == True, f"Expected existing_pending:true, got {data}"
        # Must have user_id
        assert "user_id" in data, f"Expected user_id in response, got {data}"
        
        print(f"✓ Existing pending user re-registration returns 200 with new OTP")


class TestRegisterExistingActiveUser:
    """Test 3: POST /api/auth/register with EXISTING active email returns 400"""
    
    def test_register_existing_active_returns_400(self, api_client):
        """Try to register with admin email (active user) - should return 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Active User",
            "username": f"test_active_{uuid.uuid4().hex[:6]}",
            "email": "matrixguinea@gmail.com",  # Admin email (active)
            "password": "testpass123",
            "role": "visiteur"
        })
        
        print(f"Register existing active user response: {response.status_code} - {response.text}")
        
        # Should return 400
        assert response.status_code == 400, f"Expected 400 for existing active user, got {response.status_code}"
        
        data = response.json()
        # Should contain "deja utilise" message
        assert "deja utilise" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower(), \
            f"Expected 'deja utilise' in error message, got {data}"
        
        print(f"✓ Existing active user registration returns 400 with correct message")


class TestSendOtpNotRateLimited:
    """Test 4: POST /api/auth/send-otp is NOT blocked by global rate limiter"""
    
    def test_send_otp_multiple_times_not_blocked_by_global_limiter(self, api_client, test_email_pending):
        """Call send-otp multiple times - should not be blocked by global rate limiter (only per-email limiter)"""
        
        # Call send-otp 3 times in quick succession
        # Global rate limiter allows 30 requests/minute, but send-otp has its own 5/minute per email
        # The key test is that send-otp is NOT blocked by the global limiter
        
        for i in range(3):
            response = api_client.post(f"{BASE_URL}/api/auth/send-otp", json={
                "email": test_email_pending
            })
            print(f"send-otp call {i+1}: {response.status_code} - {response.text}")
            
            # First few calls should succeed (200) or hit per-email rate limit (429)
            # But should NOT get blocked by global rate limiter with different error
            if response.status_code == 429:
                # Per-email rate limit is expected after 5 calls
                data = response.json()
                assert "tentatives" in data.get("detail", "").lower() or "patienter" in data.get("detail", "").lower(), \
                    f"Expected per-email rate limit message, got {data}"
                print(f"✓ Per-email rate limit hit (expected behavior)")
                break
            else:
                assert response.status_code == 200, f"Expected 200 or 429, got {response.status_code}: {response.text}"
        
        print(f"✓ send-otp is not blocked by global rate limiter")


class TestVerifyOtpCorrectCode:
    """Test 5: POST /api/auth/verify-otp with correct code returns 200 with token"""
    
    def test_verify_otp_with_known_code(self, api_client):
        """Create a user with known OTP hash and verify it"""
        import pymongo
        
        # Connect to MongoDB directly to insert a known OTP
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        test_email = f"test_verify_{uuid.uuid4().hex[:8]}@example.com"
        test_code = "123456"
        code_hash = hashlib.sha256(test_code.encode()).hexdigest()
        
        # Create a pending user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.users.insert_one({
            "id": user_id,
            "full_name": "Test Verify User",
            "username": f"test_verify_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ufn/P0SqS",  # dummy hash
            "role": "visiteur",
            "status": "pending_verification",
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
        })
        
        # Insert known OTP
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        db.otp_codes.delete_many({"email": test_email})
        db.otp_codes.insert_one({
            "email": test_email,
            "code_hash": code_hash,
            "created_at": now,
            "expires_at": expires_at,
            "attempts": 0,
            "max_attempts": 5,
            "verified": False,
        })
        
        # Now verify with the known code
        response = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": test_email,
            "otp": test_code
        })
        
        print(f"Verify OTP response: {response.status_code} - {response.text}")
        
        # Should return 200 with token
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, f"Expected token in response, got {data}"
        assert "user" in data, f"Expected user in response, got {data}"
        assert data["user"]["email"] == test_email, f"Expected email={test_email}, got {data['user']}"
        
        # Cleanup
        db.users.delete_one({"id": user_id})
        db.otp_codes.delete_many({"email": test_email})
        client.close()
        
        print(f"✓ verify-otp with correct code returns 200 with token")


class TestVerifyOtpWrongCode:
    """Test 6: POST /api/auth/verify-otp with wrong code returns 400 'Code incorrect'"""
    
    def test_verify_otp_with_wrong_code(self, api_client):
        """Verify with wrong code - should return 400 with 'Code incorrect'"""
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        test_email = f"test_wrong_{uuid.uuid4().hex[:8]}@example.com"
        correct_code = "123456"
        wrong_code = "654321"
        code_hash = hashlib.sha256(correct_code.encode()).hexdigest()
        
        # Create a pending user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.users.insert_one({
            "id": user_id,
            "full_name": "Test Wrong Code User",
            "username": f"test_wrong_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ufn/P0SqS",
            "role": "visiteur",
            "status": "pending_verification",
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
        })
        
        # Insert OTP
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        db.otp_codes.delete_many({"email": test_email})
        db.otp_codes.insert_one({
            "email": test_email,
            "code_hash": code_hash,
            "created_at": now,
            "expires_at": expires_at,
            "attempts": 0,
            "max_attempts": 5,
            "verified": False,
        })
        
        # Verify with wrong code
        response = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": test_email,
            "otp": wrong_code
        })
        
        print(f"Verify OTP wrong code response: {response.status_code} - {response.text}")
        
        # Should return 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should contain "incorrect" in message
        assert "incorrect" in data.get("detail", "").lower(), \
            f"Expected 'incorrect' in error message, got {data}"
        
        # Cleanup
        db.users.delete_one({"id": user_id})
        db.otp_codes.delete_many({"email": test_email})
        client.close()
        
        print(f"✓ verify-otp with wrong code returns 400 with 'Code incorrect'")


class TestVerifyOtpExpiredCode:
    """Test 7: POST /api/auth/verify-otp with expired code returns 400 with expiration message"""
    
    def test_verify_otp_with_expired_code(self, api_client):
        """Verify with expired code - should return 400 with expiration message"""
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        test_email = f"test_expired_{uuid.uuid4().hex[:8]}@example.com"
        test_code = "123456"
        code_hash = hashlib.sha256(test_code.encode()).hexdigest()
        
        # Create a pending user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        db.users.insert_one({
            "id": user_id,
            "full_name": "Test Expired Code User",
            "username": f"test_expired_{uuid.uuid4().hex[:6]}",
            "email": test_email,
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/ufn/P0SqS",
            "role": "visiteur",
            "status": "pending_verification",
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
        })
        
        # Insert EXPIRED OTP (expired 10 minutes ago)
        expired_at = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        db.otp_codes.delete_many({"email": test_email})
        db.otp_codes.insert_one({
            "email": test_email,
            "code_hash": code_hash,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
            "expires_at": expired_at,
            "attempts": 0,
            "max_attempts": 5,
            "verified": False,
        })
        
        # Verify with expired code
        response = api_client.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": test_email,
            "otp": test_code
        })
        
        print(f"Verify OTP expired code response: {response.status_code} - {response.text}")
        
        # Should return 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should contain "expire" in message
        assert "expire" in data.get("detail", "").lower(), \
            f"Expected 'expire' in error message, got {data}"
        
        # Cleanup
        db.users.delete_one({"id": user_id})
        db.otp_codes.delete_many({"email": test_email})
        client.close()
        
        print(f"✓ verify-otp with expired code returns 400 with expiration message")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self, api_client):
        """Clean up all test users created during testing"""
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        # Delete test users
        result = db.users.delete_many({"email": {"$regex": "^test_"}})
        print(f"Cleaned up {result.deleted_count} test users")
        
        # Delete test OTP codes
        result = db.otp_codes.delete_many({"email": {"$regex": "^test_"}})
        print(f"Cleaned up {result.deleted_count} test OTP codes")
        
        client.close()
        print(f"✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
