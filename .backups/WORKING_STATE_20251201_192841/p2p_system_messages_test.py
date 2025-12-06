#!/usr/bin/env python3
"""
Test P2P System Messages and Chat Integration
"""

import requests
import json
import time
from datetime import datetime

BACKEND_URL = "https://tradepanel-12.preview.emergentagent.com/api"

def test_system_messages():
    """Test if system messages are created during P2P flow"""
    print("🔍 Testing P2P System Messages...")
    
    # Use the trade ID from our previous test
    trade_id = "fe81567d-40d2-4e4c-8e95-b1d6f8d80b1f"
    
    # Try different message endpoints
    endpoints_to_test = [
        f"/p2p/trade/{trade_id}/messages",
        f"/p2p/trade/{trade_id}/chat",
        f"/trade-chat/{trade_id}/messages",
        f"/chat/{trade_id}/messages"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}")
            print(f"GET {endpoint} -> {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("messages"):
                    print(f"✅ Found messages: {len(data['messages'])}")
                    for msg in data["messages"]:
                        print(f"   - {msg.get('sender_type', 'unknown')}: {msg.get('content', msg.get('message', 'no content'))}")
                else:
                    print(f"   No messages found")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Exception: {str(e)}")
    
    # Test if we can send a message
    try:
        message_data = {
            "trade_id": trade_id,
            "user_id": "3116bffc-9efd-409d-9fdb-9d673c6b31b5",  # buyer ID from test
            "message": "Test message from buyer"
        }
        
        response = requests.post(f"{BACKEND_URL}/p2p/trade/{trade_id}/send-message", json=message_data)
        print(f"POST /p2p/trade/{trade_id}/send-message -> {response.status_code}")
        if response.status_code == 200:
            print("✅ Message sent successfully")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {str(e)}")

if __name__ == "__main__":
    test_system_messages()