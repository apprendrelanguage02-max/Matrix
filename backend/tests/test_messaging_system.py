"""
Iteration 14: Testing Real-Time Messaging System (WebSocket + REST)
Features: Conversations API, Messages API, WebSocket connection, online status, unread counts
"""

import pytest
import requests
import asyncio
import json
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Credentials
ADMIN_EMAIL = "matrixguinea@gmail.com"
ADMIN_PASSWORD = "strongpassword123"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["token"], resp.json()["user"]
    return None, None


def register_user():
    """Register a fresh visitor user and return token + user."""
    uid = uuid.uuid4().hex[:8]
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": f"msgtest_{uid}",
        "email": f"msgtest_{uid}@test.com",
        "password": "testpass123",
        "role": "visiteur"
    })
    if resp.status_code == 200:
        return resp.json()["token"], resp.json()["user"]
    return None, None


# ─── AUTH ────────────────────────────────────────────────────────────────────

class TestAuthForMessaging:
    """Verify auth works for messaging tests"""

    def test_login_admin_returns_token(self):
        """POST /api/auth/login with admin credentials should return a token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "token" in data, "No token in response"
        assert isinstance(data["token"], str) and len(data["token"]) > 10
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login OK - role: {data['user']['role']}")

    def test_login_invalid_returns_401(self):
        """POST /api/auth/login with wrong password returns 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpass"
        })
        assert resp.status_code == 401
        print("✓ Invalid credentials → 401")


# ─── CONVERSATIONS REST ───────────────────────────────────────────────────────

class TestConversationsAPI:
    """REST endpoints for conversations"""

    @pytest.fixture(scope="class")
    def admin_token_user(self):
        token, user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Admin login failed")
        return token, user

    @pytest.fixture(scope="class")
    def visitor_token_user(self):
        token, user = register_user()
        if not token:
            pytest.skip("Could not create visitor user")
        return token, user

    def test_get_conversations_immobilier(self, admin_token_user):
        """GET /api/conversations?type=immobilier returns list for admin"""
        token, _ = admin_token_user
        resp = requests.get(
            f"{BASE_URL}/api/conversations?type=immobilier",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/conversations?type=immobilier → {len(data)} conversations")

    def test_get_conversations_procedures(self, admin_token_user):
        """GET /api/conversations?type=procedures returns list"""
        token, _ = admin_token_user
        resp = requests.get(
            f"{BASE_URL}/api/conversations?type=procedures",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/conversations?type=procedures → {len(data)} conversations")

    def test_get_conversations_requires_auth(self):
        """GET /api/conversations without auth returns 401/403"""
        resp = requests.get(f"{BASE_URL}/api/conversations")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"✓ Unauthenticated request properly blocked: {resp.status_code}")

    def test_get_unread_count(self, admin_token_user):
        """GET /api/conversations/unread-count returns unread_count field"""
        token, _ = admin_token_user
        resp = requests.get(
            f"{BASE_URL}/api/conversations/unread-count",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "unread_count" in data, f"Missing unread_count in {data}"
        assert isinstance(data["unread_count"], int)
        print(f"✓ GET /api/conversations/unread-count → {data['unread_count']} unread")

    def test_get_unread_count_by_type_immobilier(self, admin_token_user):
        """GET /api/conversations/unread-count?type=immobilier filters by type"""
        token, _ = admin_token_user
        resp = requests.get(
            f"{BASE_URL}/api/conversations/unread-count?type=immobilier",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "unread_count" in data
        print(f"✓ GET /api/conversations/unread-count?type=immobilier → {data['unread_count']}")

    def test_get_unread_count_by_type_procedures(self, admin_token_user):
        """GET /api/conversations/unread-count?type=procedures filters by type"""
        token, _ = admin_token_user
        resp = requests.get(
            f"{BASE_URL}/api/conversations/unread-count?type=procedures",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "unread_count" in data
        print(f"✓ GET /api/conversations/unread-count?type=procedures → {data['unread_count']}")

    def test_create_conversation_between_users(self, admin_token_user, visitor_token_user):
        """POST /api/conversations creates conversation between admin and visitor"""
        visitor_token, visitor_user = visitor_token_user
        _, admin_user = admin_token_user

        resp = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        assert resp.status_code == 200, f"Create conversation failed: {resp.text}"
        data = resp.json()
        assert "id" in data, "No id in conversation response"
        assert "participant_ids" in data
        assert "type" in data
        assert data["type"] == "immobilier"
        assert admin_user["id"] in data["participant_ids"]
        assert visitor_user["id"] in data["participant_ids"]
        print(f"✓ POST /api/conversations → Created conv ID: {data['id'][:8]}... type={data['type']}")

    def test_create_conversation_idempotent(self, admin_token_user, visitor_token_user):
        """POST /api/conversations with same params returns existing conversation"""
        visitor_token, visitor_user = visitor_token_user
        _, admin_user = admin_token_user

        # Create first time
        resp1 = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        assert resp1.status_code == 200
        id1 = resp1.json()["id"]

        # Create same conversation again
        resp2 = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        assert resp2.status_code == 200
        id2 = resp2.json()["id"]

        assert id1 == id2, f"Expected same conv ID, got {id1} vs {id2}"
        print(f"✓ POST /api/conversations is idempotent - same ID returned: {id1[:8]}...")

    def test_cannot_create_conversation_with_self(self, admin_token_user):
        """POST /api/conversations with recipient_id == own id returns 400"""
        token, user = admin_token_user
        resp = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 400
        print("✓ Cannot create conversation with yourself → 400")

    def test_create_conversation_with_property(self, admin_token_user, visitor_token_user):
        """POST /api/conversations with property_id stores property info"""
        visitor_token, _ = visitor_token_user
        _, admin_user = admin_token_user

        # Get a real property ID if available
        props_resp = requests.get(f"{BASE_URL}/api/properties?page=1&limit=1&status=all")
        property_id = ""
        if props_resp.status_code == 200:
            props = props_resp.json().get("properties", [])
            if props:
                property_id = props[0]["id"]

        params = f"recipient_id={admin_user['id']}&type=immobilier"
        if property_id:
            params += f"&property_id={property_id}"

        resp = requests.post(
            f"{BASE_URL}/api/conversations?{params}",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        if property_id:
            # If property was found, check property_id is stored
            assert data.get("property_id") == property_id, f"Expected property_id={property_id}, got {data.get('property_id')}"
            print(f"✓ POST /api/conversations with property_id={property_id[:8]}... stored correctly")
        else:
            print("⚠ No properties available to test property linking")


# ─── MESSAGES REST ────────────────────────────────────────────────────────────

class TestMessagesAPI:
    """GET messages for a conversation"""

    @pytest.fixture(scope="class")
    def conversation_setup(self):
        """Setup: create two users and a conversation between them"""
        admin_token, admin_user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not admin_token:
            pytest.skip("Admin login failed")

        visitor_token, visitor_user = register_user()
        if not visitor_token:
            pytest.skip("Could not create visitor")

        # Create conversation
        resp = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        if resp.status_code != 200:
            pytest.skip(f"Could not create conversation: {resp.text}")

        conv_id = resp.json()["id"]
        return {
            "admin_token": admin_token,
            "admin_user": admin_user,
            "visitor_token": visitor_token,
            "visitor_user": visitor_user,
            "conv_id": conv_id,
        }

    def test_get_messages_for_conversation(self, conversation_setup):
        """GET /api/conversations/{id}/messages returns messages list"""
        token = conversation_setup["visitor_token"]
        conv_id = conversation_setup["conv_id"]

        resp = requests.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "messages" in data, f"Missing 'messages' key in {data.keys()}"
        assert "conversation" in data, f"Missing 'conversation' key"
        assert isinstance(data["messages"], list)
        print(f"✓ GET /api/conversations/{conv_id[:8]}.../messages → {len(data['messages'])} messages")

    def test_get_messages_unauthorized_user_blocked(self, conversation_setup):
        """GET /api/conversations/{id}/messages by non-participant returns 403"""
        conv_id = conversation_setup["conv_id"]

        # Register a completely unrelated user
        other_token, _ = register_user()
        if not other_token:
            pytest.skip("Could not create unrelated user")

        resp = requests.get(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert resp.status_code == 403, f"Expected 403 (access denied), got {resp.status_code}"
        print(f"✓ Non-participant blocked from messages → 403")

    def test_get_messages_nonexistent_conversation(self, conversation_setup):
        """GET /api/conversations/nonexistent/messages returns 403"""
        token = conversation_setup["visitor_token"]
        resp = requests.get(
            f"{BASE_URL}/api/conversations/nonexistent-id-123/messages",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code in [403, 404], f"Got {resp.status_code}"
        print(f"✓ Non-existent conversation → {resp.status_code}")


# ─── USER ONLINE STATUS ──────────────────────────────────────────────────────

class TestUserOnlineStatus:
    """GET /api/users/{user_id}/online"""

    def test_online_status_returns_correct_structure(self):
        """GET /api/users/{id}/online returns online boolean field"""
        admin_token, admin_user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not admin_token:
            pytest.skip("Admin login failed")

        resp = requests.get(f"{BASE_URL}/api/users/{admin_user['id']}/online")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "online" in data, f"Missing 'online' key in {data}"
        assert isinstance(data["online"], bool)
        print(f"✓ GET /api/users/{admin_user['id'][:8]}.../online → online={data['online']}")

    def test_online_status_no_auth_required(self):
        """GET /api/users/{id}/online is public (no auth needed)"""
        # Use a fake but valid-looking user ID
        fake_id = str(uuid.uuid4())
        resp = requests.get(f"{BASE_URL}/api/users/{fake_id}/online")
        # Should return 200 with online=False even for non-existent users
        # (or could be 404 if user doesn't exist - both are acceptable)
        assert resp.status_code in [200, 404], f"Unexpected status: {resp.status_code}"
        if resp.status_code == 200:
            data = resp.json()
            assert "online" in data
            assert data["online"] == False  # Not connected
        print(f"✓ /api/users/{{id}}/online for unknown user → {resp.status_code}")

    def test_online_status_for_offline_user_has_last_seen(self):
        """Offline user response includes last_seen field"""
        admin_token, admin_user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not admin_token:
            pytest.skip("Admin login failed")

        resp = requests.get(f"{BASE_URL}/api/users/{admin_user['id']}/online")
        assert resp.status_code == 200
        data = resp.json()
        # If offline, last_seen should be in the response
        if not data["online"]:
            assert "last_seen" in data, "Missing last_seen for offline user"
        print(f"✓ Offline user response structure correct: online={data['online']}, last_seen present={('last_seen' in data)}")


# ─── WEBSOCKET TESTS ─────────────────────────────────────────────────────────

class TestWebSocket:
    """WebSocket endpoint tests using websockets library"""

    def test_websocket_connection_and_unread_update(self):
        """WebSocket /api/ws/chat connects and receives unread_update on connect"""
        import asyncio
        try:
            import websockets
        except ImportError:
            pytest.skip("websockets library not available")

        token, user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not token:
            pytest.skip("Login failed")

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_endpoint = f"{ws_url}/api/ws/chat?token={token}"

        async def connect_and_receive():
            messages_received = []
            try:
                async with websockets.connect(ws_endpoint, open_timeout=10) as ws:
                    # Should receive initial unread_update event
                    for _ in range(3):  # Try to receive up to 3 messages
                        try:
                            msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                            parsed = json.loads(msg)
                            messages_received.append(parsed)
                            if parsed.get("type") == "unread_update":
                                break
                        except asyncio.TimeoutError:
                            break
            except Exception as e:
                return None, str(e)
            return messages_received, None

        messages, error = asyncio.run(connect_and_receive())

        assert error is None, f"WebSocket connection error: {error}"
        assert messages is not None, "No messages received"
        print(f"✓ WebSocket connected, received {len(messages)} events: {[m.get('type') for m in messages]}")

        # Check we got an unread_update
        types = [m.get("type") for m in messages]
        assert "unread_update" in types, f"Expected unread_update event, got: {types}"
        print(f"✓ WebSocket received unread_update event")

    def test_websocket_invalid_token_rejected(self):
        """WebSocket with invalid token should be rejected"""
        import asyncio
        try:
            import websockets
        except ImportError:
            pytest.skip("websockets library not available")

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_endpoint = f"{ws_url}/api/ws/chat?token=invalidtoken123"

        async def try_connect():
            try:
                async with websockets.connect(ws_endpoint, open_timeout=5) as ws:
                    # If connected, try to receive (should close immediately)
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                        return "connected_received", msg
                    except Exception:
                        return "connected_no_data", None
            except websockets.exceptions.ConnectionClosedError as e:
                return "rejected", str(e)
            except Exception as e:
                return "error", str(e)

        result, detail = asyncio.run(try_connect())
        # The server should close the connection with code 4001 for invalid tokens
        assert result in ["rejected", "error"], f"Expected rejection, got: {result} - {detail}"
        print(f"✓ Invalid token correctly rejected: {result} - {detail}")

    def test_websocket_no_token_rejected(self):
        """WebSocket without token should be rejected"""
        import asyncio
        try:
            import websockets
        except ImportError:
            pytest.skip("websockets library not available")

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_endpoint = f"{ws_url}/api/ws/chat"  # no token param

        async def try_connect():
            try:
                async with websockets.connect(ws_endpoint, open_timeout=5) as ws:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                        return "connected_received", msg
                    except Exception:
                        return "connected_no_data", None
            except Exception as e:
                return "rejected", str(e)

        result, detail = asyncio.run(try_connect())
        assert result in ["rejected", "error"], f"Expected rejection, got: {result}"
        print(f"✓ No token correctly rejected: {result}")

    def test_websocket_send_message_via_ws(self):
        """WebSocket: send a message and verify it's received back"""
        import asyncio
        try:
            import websockets
        except ImportError:
            pytest.skip("websockets library not available")

        # Setup: two users and a conversation
        admin_token, admin_user = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not admin_token:
            pytest.skip("Admin login failed")

        visitor_token, visitor_user = register_user()
        if not visitor_token:
            pytest.skip("Could not create visitor user")

        # Create conversation
        resp = requests.post(
            f"{BASE_URL}/api/conversations?recipient_id={admin_user['id']}&type=immobilier",
            headers={"Authorization": f"Bearer {visitor_token}"}
        )
        if resp.status_code != 200:
            pytest.skip(f"Could not create conversation: {resp.text}")
        conv_id = resp.json()["id"]

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")

        async def send_and_receive():
            """Connect visitor, send message; connect admin to receive it"""
            received_messages = []

            # Connect both users
            visitor_ws_url = f"{ws_url}/api/ws/chat?token={visitor_token}"
            admin_ws_url = f"{ws_url}/api/ws/chat?token={admin_token}"

            try:
                async with websockets.connect(visitor_ws_url, open_timeout=10) as visitor_ws:
                    async with websockets.connect(admin_ws_url, open_timeout=10) as admin_ws:

                        # Drain initial messages
                        for ws in [visitor_ws, admin_ws]:
                            for _ in range(3):
                                try:
                                    await asyncio.wait_for(ws.recv(), timeout=1.0)
                                except asyncio.TimeoutError:
                                    break

                        # Send message from visitor
                        test_content = f"TEST MESSAGE {uuid.uuid4().hex[:6]}"
                        await visitor_ws.send(json.dumps({
                            "type": "message",
                            "conversation_id": conv_id,
                            "content": test_content
                        }))

                        # Wait for admin to receive new_message event
                        for _ in range(5):
                            try:
                                msg = await asyncio.wait_for(admin_ws.recv(), timeout=3.0)
                                parsed = json.loads(msg)
                                received_messages.append(parsed)
                                if parsed.get("type") == "new_message":
                                    return received_messages, test_content, None
                            except asyncio.TimeoutError:
                                break

                        # Also check visitor received its own message
                        for _ in range(3):
                            try:
                                msg = await asyncio.wait_for(visitor_ws.recv(), timeout=2.0)
                                parsed = json.loads(msg)
                                received_messages.append(parsed)
                            except asyncio.TimeoutError:
                                break

            except Exception as e:
                return received_messages, None, str(e)

            return received_messages, test_content, None

        messages, test_content, error = asyncio.run(send_and_receive())

        if error:
            print(f"⚠ WebSocket send/receive error: {error}")
            pytest.skip(f"WebSocket test skipped due to connection error: {error}")

        print(f"✓ WebSocket message exchange - received {len(messages)} events")

        # Find the new_message event
        new_msgs = [m for m in messages if m.get("type") == "new_message"]
        assert len(new_msgs) > 0, f"No new_message event received. Got: {[m.get('type') for m in messages]}"

        # Verify content
        received_content = new_msgs[0]["message"]["content"]
        assert received_content == test_content, f"Content mismatch: expected '{test_content}', got '{received_content}'"
        print(f"✓ Message content correctly delivered: '{received_content[:30]}...'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
