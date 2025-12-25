#!/usr/bin/env python3
"""
Test: LIVE mode 2FA enforcement
Proves that LIVE trading is blocked without 2FA enabled.
"""

import asyncio
import sys
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'coinhub')

async def test_live_mode_2fa_enforcement():
    print("\n" + "="*70)
    print("  TEST: LIVE MODE 2FA ENFORCEMENT")
    print("="*70)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create a test user WITHOUT 2FA
    test_user_id = "test-user-no-2fa-12345"
    test_bot_id = "test-bot-live-12345"
    
    # Clean up any existing test data
    await db.users.delete_many({"user_id": test_user_id})
    await db.two_factor_auth.delete_many({"user_id": test_user_id})
    await db.trading_bots.delete_many({"bot_id": test_bot_id})
    await db.bot_configs.delete_many({"bot_id": test_bot_id})
    
    # Create test user WITHOUT 2FA
    await db.users.insert_one({
        "user_id": test_user_id,
        "email": "test-no-2fa@test.com",
        "two_factor_enabled": False,  # 2FA NOT enabled
        "live_trading_acknowledged": True
    })
    
    print("\n✓ Created test user WITHOUT 2FA enabled")
    
    # Import the validator
    from bot_execution_engine import LiveModeValidator
    
    # Inject db into the module
    import bot_execution_engine
    bot_execution_engine.db = db
    
    # Test 1: check_2fa_for_live_trading should FAIL
    print("\n" + "-"*50)
    print("TEST 1: check_2fa_for_live_trading()")
    print("-"*50)
    
    allowed, error = await LiveModeValidator.check_2fa_for_live_trading(test_user_id)
    
    if not allowed and "2FA_REQUIRED" in error:
        print(f"✅ PASS: LIVE trading correctly BLOCKED")
        print(f"   Error: {error}")
    else:
        print(f"❌ FAIL: Expected block, got allowed={allowed}")
        return False
    
    # Test 2: validate_live_mode should FAIL with 2FA error
    print("\n" + "-"*50)
    print("TEST 2: validate_live_mode()")
    print("-"*50)
    
    is_valid, error = await LiveModeValidator.validate_live_mode(
        user_id=test_user_id,
        bot_id=test_bot_id,
        pair="BTCUSD",
        required_balance=100,
        explicit_confirmation=True
    )
    
    if not is_valid and "2FA_REQUIRED" in error:
        print(f"✅ PASS: LIVE mode validation correctly FAILED")
        print(f"   Error contains 2FA requirement: Yes")
    else:
        print(f"❌ FAIL: Expected 2FA error, got valid={is_valid}, error={error}")
        return False
    
    # Test 3: Now ENABLE 2FA and verify it passes (2FA check only)
    print("\n" + "-"*50)
    print("TEST 3: With 2FA ENABLED")
    print("-"*50)
    
    # Enable 2FA for the user
    await db.users.update_one(
        {"user_id": test_user_id},
        {"$set": {"two_factor_enabled": True}}
    )
    await db.two_factor_auth.insert_one({
        "user_id": test_user_id,
        "secret": "TESTSECRET123456",
        "enabled": True
    })
    
    allowed, msg = await LiveModeValidator.check_2fa_for_live_trading(test_user_id)
    
    if allowed:
        print(f"✅ PASS: 2FA check passes when enabled")
        print(f"   Message: {msg}")
    else:
        print(f"❌ FAIL: Expected pass with 2FA, got error={msg}")
        return False
    
    # Cleanup
    await db.users.delete_many({"user_id": test_user_id})
    await db.two_factor_auth.delete_many({"user_id": test_user_id})
    await db.trading_bots.delete_many({"bot_id": test_bot_id})
    await db.bot_configs.delete_many({"bot_id": test_bot_id})
    
    print("\n" + "="*70)
    print("  ✅ ALL TESTS PASSED - LIVE MODE 2FA ENFORCEMENT WORKING")
    print("="*70)
    
    client.close()
    return True

if __name__ == "__main__":
    result = asyncio.run(test_live_mode_2fa_enforcement())
    exit(0 if result else 1)
