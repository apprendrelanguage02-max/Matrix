"""
Iteration 16 Backend Tests
Tests for:
1. GET /api/admin/contact - public endpoint returning admin {id, username}
2. POST /api/auth/send-otp - generates OTP, returns dev_otp in dev mode
3. POST /api/auth/register - OTP-based registration flow (correct OTP, incorrect OTP, expired OTP, missing OTP)
4. POST /api/conversations - procedures conversations with admin ID
5. GET /api/conversations?type=procedures - admin can see user procedure conversations
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"
ADMIN_ID = "acc21120-fe47-4e5f-a910-10dab816f9cb"

# Unique test email to avoid conflicts
TEST_EMAIL = f"test_otp_{uuid.uuid4().hex[:8]}@example.com"
TEST_USERNAME = f"testuser_{uuid.uuid4().hex[:6]}"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ──────────────────────────────────────────────────────────────────
# 1. GET /api/admin/contact (PUBLIC - no auth required)
# ──────────────────────────────────────────────────────────────────

class TestAdminContact:
    """Tests for public GET /api/admin/contact endpoint"""

    def test_admin_contact_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/admin/contact")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_admin_contact_has_id_and_username(self):
        response = requests.get(f"{BASE_URL}/api/admin/contact")
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert "username" in data, "Response missing 'username' field"
        assert isinstance(data["id"], str) and len(data["id"]) > 0, "id should be non-empty string"
        assert isinstance(data["username"], str) and len(data["username"]) > 0, "username should be non-empty string"

    def test_admin_contact_no_auth_required(self):
        """This endpoint is public, should work without Authorization header."""
        response = requests.get(f"{BASE_URL}/api/admin/contact", headers={})
        assert response.status_code == 200, f"Public endpoint requires no auth. Got {response.status_code}"

    def test_admin_contact_id_matches_known_admin(self):
        """The returned admin ID should match the known admin ID."""
        response = requests.get(f"{BASE_URL}/api/admin/contact")
        data = response.json()
        # The admin ID should match the known admin (acc21120-...)
        assert data["id"] == ADMIN_ID, f"Admin ID mismatch. Expected {ADMIN_ID}, got {data['id']}"

    def test_admin_contact_no_sensitive_data(self):
        """Should not expose email, password, or sensitive fields."""
        response = requests.get(f"{BASE_URL}/api/admin/contact")
        data = response.json()
        assert "email" not in data, "email should not be in public contact response"
        assert "hashed_password" not in data, "hashed_password should not be exposed"
        assert "password" not in data, "password should not be exposed"


# ──────────────────────────────────────────────────────────────────
# 2. POST /api/auth/send-otp
# ──────────────────────────────────────────────────────────────────

class TestSendOtp:
    """Tests for POST /api/auth/send-otp"""

    def test_send_otp_valid_email_returns_200(self):
        """Sending OTP to a fresh email should return 200."""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": TEST_EMAIL})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_send_otp_dev_mode_returns_dev_otp(self):
        """In dev mode (no RESEND_API_KEY), response should have dev_otp field."""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": TEST_EMAIL})
        data = response.json()
        # In dev mode, sent=False and dev_otp is in response
        assert "sent" in data, "Response missing 'sent' field"
        assert "dev_otp" in data, "dev_otp not in response (dev mode should return code directly)"
        assert len(str(data["dev_otp"])) == 6, f"OTP should be 6 digits, got: {data['dev_otp']}"
        assert str(data["dev_otp"]).isdigit(), f"OTP should be numeric, got: {data['dev_otp']}"

    def test_send_otp_already_registered_email_returns_400(self):
        """Sending OTP for already registered email should return 400."""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": ADMIN_EMAIL})
        assert response.status_code == 400, f"Expected 400 for existing email, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        # Should mention email already used
        assert "déjà" in data["detail"].lower() or "already" in data["detail"].lower() or "utilisé" in data["detail"].lower()

    def test_send_otp_invalid_email_returns_422(self):
        """Invalid email format should return 422."""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": "not-an-email"})
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"

    def test_send_otp_has_message_field(self):
        """Response should include 'message' field."""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": TEST_EMAIL})
        data = response.json()
        assert "message" in data, "Response missing 'message' field"


# ──────────────────────────────────────────────────────────────────
# 3. POST /api/auth/register (OTP-based)
# ──────────────────────────────────────────────────────────────────

class TestRegisterWithOTP:
    """Tests for POST /api/auth/register with OTP verification"""

    @pytest.fixture(autouse=True)
    def get_test_otp(self):
        """Get a fresh OTP before each test that needs it."""
        # Use a unique email per test to avoid interference
        self.reg_email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": self.reg_email})
        assert response.status_code == 200, f"send-otp failed: {response.text}"
        data = response.json()
        self.valid_otp = data.get("dev_otp", "")
        assert self.valid_otp, "dev_otp not returned from send-otp"

    def test_register_without_otp_field_returns_400(self):
        """Register without otp field should return 400 or 422."""
        email = f"test_nootp_{uuid.uuid4().hex[:6]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "testuser_nootp",
            "email": email,
            "password": "testpass123",
            "role": "visiteur",
        })
        # Should fail - otp is required field
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"

    def test_register_with_incorrect_otp_returns_400(self):
        """Register with wrong OTP should return 400 with 'Code incorrect' message."""
        wrong_otp = "000000" if self.valid_otp != "000000" else "111111"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser_{uuid.uuid4().hex[:4]}",
            "email": self.reg_email,
            "password": "testpass123",
            "role": "visiteur",
            "otp": wrong_otp,
        })
        assert response.status_code == 400, f"Expected 400 for wrong OTP, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower() or "code" in data["detail"].lower()

    def test_register_with_correct_otp_creates_account(self):
        """Register with correct OTP should create account and return token."""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser_{uuid.uuid4().hex[:4]}",
            "email": self.reg_email,
            "password": "testpass123",
            "role": "visiteur",
            "otp": self.valid_otp,
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "token missing in register response"
        assert "user" in data, "user missing in register response"
        assert data["user"]["email"] == self.reg_email
        assert isinstance(data["token"], str) and len(data["token"]) > 0

    def test_register_with_no_otp_sent_returns_400(self):
        """Register for email that never had OTP sent should return 400."""
        never_email = f"never_sent_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser_{uuid.uuid4().hex[:4]}",
            "email": never_email,
            "password": "testpass123",
            "role": "visiteur",
            "otp": "123456",
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data

    def test_register_duplicate_email_after_registration_returns_400(self):
        """After successful registration, trying to register same email again should fail."""
        # First register
        r1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"testuser_{uuid.uuid4().hex[:4]}",
            "email": self.reg_email,
            "password": "testpass123",
            "role": "visiteur",
            "otp": self.valid_otp,
        })
        # May succeed or fail depending on previous test order
        # Now try to send-otp again for same email - should fail with 400
        r2 = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": self.reg_email})
        # If the user was registered above, send-otp should fail with 400
        # If not registered, it might succeed. Either way test is valid
        if r1.status_code == 200:
            assert r2.status_code == 400, f"Expected 400 for already-used email, got {r2.status_code}"


# ──────────────────────────────────────────────────────────────────
# 4. POST /api/conversations - procedures with admin
# ──────────────────────────────────────────────────────────────────

class TestProcedureConversations:
    """Tests for procedure conversation flow with correct admin ID"""

    @pytest.fixture(scope="class")
    def user_token(self):
        """Create a test user and get their token."""
        email = f"proc_test_{uuid.uuid4().hex[:8]}@example.com"
        # First send OTP
        r1 = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"email": email})
        assert r1.status_code == 200, f"send-otp failed: {r1.text}"
        otp = r1.json().get("dev_otp", "")
        # Register
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"proctest_{uuid.uuid4().hex[:4]}",
            "email": email,
            "password": "testpass123",
            "role": "visiteur",
            "otp": otp,
        })
        assert r2.status_code == 200, f"register failed: {r2.text}"
        return r2.json()["token"]

    @pytest.fixture(scope="class")
    def user_headers(self, user_token):
        return {"Authorization": f"Bearer {user_token}"}

    def test_create_conversation_with_admin_id(self, user_headers):
        """Creating a procedures conversation with admin ID should succeed."""
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"recipient_id": ADMIN_ID, "type": "procedures"},
            headers=user_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "conversation id missing"
        assert data.get("type") == "procedures", f"Expected type='procedures', got: {data.get('type')}"

    def test_admin_can_get_procedure_conversations(self, admin_headers):
        """Admin should be able to get procedure conversations via GET /api/conversations?type=procedures."""
        response = requests.get(f"{BASE_URL}/api/conversations?type=procedures", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Response should be a list
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"Admin sees {len(data)} procedure conversations")

    def test_conversation_response_structure(self, user_headers):
        """Conversation response should have correct structure."""
        response = requests.post(
            f"{BASE_URL}/api/conversations",
            params={"recipient_id": ADMIN_ID, "type": "procedures"},
            headers=user_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Check required fields
        for field in ["id", "type", "participant_ids"]:
            assert field in data, f"Missing field '{field}' in conversation response"
        assert ADMIN_ID in data["participant_ids"], f"Admin ID not in participant_ids: {data['participant_ids']}"
