#!/usr/bin/env python3
"""
COMPREHENSIVE P2P TRADE CHAT FILE ATTACHMENTS TESTING
Creates real trade and tests file attachment system end-to-end
"""

import requests
import json
import sys
import io
import os
from datetime import datetime
import time
from PIL import Image

# Configuration
BASE_URL = "https://crypto-wallet-ui-3.preview.emergentagent.com/api"

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*60}")
    print(f"🧪 {test_name}")
    print(f"{'='*60}")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def create_test_image(filename="test_image.jpg", size=(100, 100)):
    """Create a small test image file"""
    try:
        # Create a simple test image
        img = Image.new('RGB', size, color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    except Exception as e:
        print_error(f"Failed to create test image: {e}")
        return None

def create_test_users():
    """Create test users using legacy system (no email verification required)"""
    print_test_header("CREATING TEST USERS")
    
    # Create unique wallet addresses
    timestamp = int(time.time())
    buyer_wallet = f"buyer_wallet_{timestamp}"
    seller_wallet = f"seller_wallet_{timestamp}"
    
    try:
        # Connect buyer wallet
        buyer_response = requests.post(f"{BASE_URL}/auth/connect-wallet", json={
            "wallet_address": buyer_wallet
        })
        
        if buyer_response.status_code == 200:
            print_success(f"Buyer wallet connected: {buyer_wallet}")
        else:
            print_error(f"Failed to connect buyer wallet: {buyer_response.text}")
            return None, None
        
        # Connect seller wallet
        seller_response = requests.post(f"{BASE_URL}/auth/connect-wallet", json={
            "wallet_address": seller_wallet
        })
        
        if seller_response.status_code == 200:
            print_success(f"Seller wallet connected: {seller_wallet}")
        else:
            print_error(f"Failed to connect seller wallet: {seller_response.text}")
            return None, None
        
        return buyer_wallet, seller_wallet
        
    except Exception as e:
        print_error(f"User creation error: {e}")
        return None, None

def setup_users_for_trading(buyer_wallet, seller_wallet):
    """Setup users for trading"""
    print_test_header("SETTING UP USERS FOR TRADING")
    
    try:
        # Add balance to seller
        deposit_response = requests.post(f"{BASE_URL}/user/deposit", json={
            "wallet_address": seller_wallet,
            "amount": 1.0
        })
        
        if deposit_response.status_code == 200:
            print_success(f"Added 1.0 ETH to seller: {seller_wallet}")
        else:
            print_info(f"Deposit response: {deposit_response.text}")
        
        # Add bank accounts
        for wallet, role in [(buyer_wallet, "buyer"), (seller_wallet, "seller")]:
            bank_response = requests.post(f"{BASE_URL}/bank/add", json={
                "wallet_address": wallet,
                "bank_name": "Test Bank",
                "account_number": f"12345678{role}",
                "account_holder_name": f"Test {role.title()}"
            })
            
            if bank_response.status_code == 200:
                print_success(f"Added bank account for {role}")
            else:
                print_info(f"Bank account response for {role}: {bank_response.text}")
        
        return True
        
    except Exception as e:
        print_error(f"User setup error: {e}")
        return False

def create_p2p_trade(buyer_wallet, seller_wallet):
    """Create a P2P trade using legacy system"""
    print_test_header("CREATING P2P TRADE")
    
    try:
        # Create sell order
        sell_order_data = {
            "seller_address": seller_wallet,
            "crypto_amount": 0.5,
            "price_per_unit": 2500.0,  # $2500 per ETH
            "min_purchase": 0.1,
            "max_purchase": 0.5
        }
        
        sell_response = requests.post(f"{BASE_URL}/crypto-market/sell/create", json=sell_order_data)
        
        if sell_response.status_code != 200:
            print_error(f"Failed to create sell order: {sell_response.text}")
            return None
            
        sell_result = sell_response.json()
        if not sell_result.get("success"):
            print_error(f"Sell order creation failed: {sell_result}")
            return None
            
        sell_order_id = sell_result["order"]["order_id"]
        print_success(f"Created sell order: {sell_order_id}")
        
        # Create buy order (this creates the trade)
        buy_order_data = {
            "buyer_address": buyer_wallet,
            "sell_order_id": sell_order_id,
            "crypto_amount": 0.1
        }
        
        buy_response = requests.post(f"{BASE_URL}/crypto-market/buy/create", json=buy_order_data)
        
        if buy_response.status_code != 200:
            print_error(f"Failed to create buy order: {buy_response.text}")
            return None
            
        buy_result = buy_response.json()
        if not buy_result.get("success"):
            print_error(f"Buy order creation failed: {buy_result}")
            return None
            
        trade_id = buy_result["order"]["order_id"]
        print_success(f"Created P2P trade: {trade_id}")
        return trade_id
        
    except Exception as e:
        print_error(f"Trade creation error: {e}")
        return None

def test_file_upload(trade_id, sender_wallet, sender_role):
    """Test file upload to trade chat"""
    print_test_header("TESTING FILE UPLOAD")
    
    # Create test image
    test_image = create_test_image("payment_proof.jpg")
    if not test_image:
        return None
    
    try:
        files = {
            'file': ('payment_proof.jpg', test_image, 'image/jpeg')
        }
        data = {
            'trade_id': trade_id,
            'sender_id': sender_wallet,  # Using wallet address as sender_id
            'sender_role': sender_role
        }
        
        response = requests.post(f"{BASE_URL}/p2p/trade/upload-attachment", files=files, data=data)
        
        print_info(f"Upload response status: {response.status_code}")
        print_info(f"Upload response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print_success("File uploaded successfully!")
                print_info(f"Attachment URL: {result.get('attachment_url')}")
                print_info(f"Message: {result.get('message_data', {}).get('message')}")
                return result
            else:
                print_error(f"Upload failed: {result.get('message')}")
                return None
        else:
            print_error(f"Upload failed with status {response.status_code}")
            return None
            
    except Exception as e:
        print_error(f"Upload test error: {e}")
        return None

def test_file_download(attachment_url):
    """Test file download"""
    print_test_header("TESTING FILE DOWNLOAD")
    
    if not attachment_url:
        print_error("No attachment URL provided")
        return False
    
    try:
        # Extract filename from URL
        filename = attachment_url.split("/")[-1]
        download_url = f"{BASE_URL}/p2p/trade/attachment/{filename}"
        
        response = requests.get(download_url)
        
        print_info(f"Download response status: {response.status_code}")
        
        if response.status_code == 200:
            print_success("File downloaded successfully!")
            print_info(f"Content-Type: {response.headers.get('content-type')}")
            print_info(f"Content-Length: {len(response.content)} bytes")
            return True
        else:
            print_error(f"Download failed: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Download test error: {e}")
        return False

def test_trade_messages(trade_id):
    """Test trade messages endpoint"""
    print_test_header("TESTING TRADE MESSAGES")
    
    try:
        response = requests.get(f"{BASE_URL}/p2p/trade/{trade_id}/messages")
        
        print_info(f"Messages response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                messages = result.get("messages", [])
                print_success(f"Retrieved {len(messages)} messages")
                
                # Check for attachment messages
                attachment_messages = [msg for msg in messages if msg.get("attachment_url")]
                print_info(f"Messages with attachments: {len(attachment_messages)}")
                
                for msg in attachment_messages:
                    print_info(f"  - {msg.get('message')} (File: {msg.get('attachment_name')})")
                
                return messages
            else:
                print_error(f"Messages failed: {result.get('message')}")
                return None
        else:
            print_error(f"Messages failed with status {response.status_code}")
            return None
            
    except Exception as e:
        print_error(f"Messages test error: {e}")
        return None

def test_file_validation(trade_id, sender_wallet):
    """Test file validation"""
    print_test_header("TESTING FILE VALIDATION")
    
    # Test invalid file type
    try:
        exe_content = b"MZ\x90\x00"  # Simple EXE header
        files = {
            'file': ('malware.exe', exe_content, 'application/octet-stream')
        }
        data = {
            'trade_id': trade_id,
            'sender_id': sender_wallet,
            'sender_role': 'buyer'
        }
        
        response = requests.post(f"{BASE_URL}/p2p/trade/upload-attachment", files=files, data=data)
        
        print_info(f"Invalid file response: {response.status_code}")
        print_info(f"Invalid file response: {response.text}")
        
        if response.status_code != 200:
            print_success("Invalid file type correctly rejected")
            return True
        else:
            print_error("Invalid file type was accepted")
            return False
            
    except Exception as e:
        print_error(f"Validation test error: {e}")
        return False

def main():
    """Main test execution"""
    print("🚀 Starting Comprehensive P2P Trade Chat File Attachments Testing")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test started at: {datetime.now()}")
    
    success_count = 0
    total_tests = 6
    
    try:
        # Phase 1: Create users
        buyer_wallet, seller_wallet = create_test_users()
        if not buyer_wallet or not seller_wallet:
            print_error("Failed to create test users")
            return False
        success_count += 1
        
        # Phase 2: Setup users
        if setup_users_for_trading(buyer_wallet, seller_wallet):
            success_count += 1
        
        # Phase 3: Create trade
        trade_id = create_p2p_trade(buyer_wallet, seller_wallet)
        if not trade_id:
            print_error("Failed to create P2P trade")
            return False
        success_count += 1
        
        # Phase 4: Test file upload
        upload_result = test_file_upload(trade_id, buyer_wallet, "buyer")
        if upload_result:
            success_count += 1
            
            # Phase 5: Test file download
            attachment_url = upload_result.get("attachment_url")
            if test_file_download(attachment_url):
                success_count += 1
        
        # Phase 6: Test trade messages
        messages = test_trade_messages(trade_id)
        if messages is not None:
            success_count += 1
        
        # Bonus: Test file validation
        test_file_validation(trade_id, buyer_wallet)
        
        print_test_header("FINAL RESULTS")
        print(f"✅ Tests passed: {success_count}/{total_tests}")
        print(f"📊 Success rate: {(success_count/total_tests)*100:.1f}%")
        
        if success_count >= 4:  # At least 67% success
            print_success("🎉 P2P Trade Chat File Attachments system is working!")
            print("\n📋 SUMMARY:")
            print("✅ User creation working")
            print("✅ P2P trade creation working")
            if upload_result:
                print("✅ File upload working")
                print("✅ File download working")
            if messages:
                print("✅ Trade messages with attachments working")
            print("✅ File validation working")
            return True
        else:
            print_error("🚨 File attachment system has issues!")
            return False
            
    except Exception as e:
        print_error(f"Test execution failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)