# LIVE TESTNET DRY RUN - EXACT COMMANDS

Run these from YOUR machine (not the blocked server).

## Prerequisites
- Python 3.9+
- `pip install httpx`

## Backend URL
```
BACKEND=https://coinhub-rescue.preview.emergentagent.com
USER_ID=no2fa-curl-test
```

---

## 1. POST /api/exchange/test-connection

```bash
curl -s -X POST "$BACKEND/api/exchange/test-connection" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{"exchange": "binance_testnet"}' | python3 -m json.tool
```

**Expected:** `{"success": true, "connected": true, "balances": [...]}`

---

## 2. GET /api/exchange/candles (verify source)

```bash
curl -s "$BACKEND/api/exchange/candles/BTCUSDT/1h?limit=5&adapter_type=binance_testnet" \
  -H "X-User-Id: $USER_ID" | python3 -m json.tool
```

**Check:** `source.exchange` = `binance_testnet`, `source.is_live_exchange` = `true`

---

## 3. POST /api/bots/create (LIVE mode)

```bash
curl -s -X POST "$BACKEND/api/bots/create" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "bot_type": "simple",
    "pair": "BTCUSDT",
    "params": {
      "mode": "live",
      "exchange": "binance_testnet",
      "allocation": 10,
      "strategy": "manual",
      "timeframe": "1h"
    }
  }' | python3 -m json.tool
```

**Expected:** `{"success": true, "bot_id": "..."}` or 403 if 2FA not enabled.

---

## 4. POST /api/bots/start

```bash
BOT_ID="<bot_id from step 3>"

curl -s -X POST "$BACKEND/api/bots/start" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d "{\"bot_id\": \"$BOT_ID\"}" | python3 -m json.tool
```

---

## 5. Direct Order Test (Python script)

Save as `test_binance_order.py` and run locally:

```python
import asyncio
import time
import hmac
import hashlib
import httpx
import json

API_KEY = "HaNKMSA6JcjMUKxubwyhjuNP4MHf2gDJj4JpFAPKEeNZFjo0aTnGyUlvEvOW2Ar9"
API_SECRET = "g15VmXRG3goSXGaaugWossCeqRbjZS9sh5UodGm4WPlj0alOca6rlyjfAjq594ua"
BASE_URL = "https://testnet.binance.vision"

def sign(params: dict) -> dict:
    params["timestamp"] = int(time.time() * 1000)
    query = "&".join([f"{k}={v}" for k, v in sorted(params.items())])
    sig = hmac.new(API_SECRET.encode(), query.encode(), hashlib.sha256).hexdigest()
    params["signature"] = sig
    return params

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {"X-MBX-APIKEY": API_KEY}
        
        # 1. Test ping
        print("=== PING ===")
        r = await client.get(f"{BASE_URL}/api/v3/ping")
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
        
        if r.status_code != 200:
            print("Binance testnet not reachable from this machine.")
            return
        
        # 2. Get account
        print("\n=== ACCOUNT ===")
        params = sign({})
        r = await client.get(f"{BASE_URL}/api/v3/account", params=params, headers=headers)
        print(f"Status: {r.status_code}")
        data = r.json()
        if r.status_code == 200:
            balances = [b for b in data.get("balances", []) if float(b["free"]) > 0]
            print(f"Balances: {json.dumps(balances[:5], indent=2)}")
        else:
            print(f"Error: {data}")
            return
        
        # 3. Place LIMIT order (won't fill - price too low)
        print("\n=== PLACE ORDER ===")
        order_params = sign({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "LIMIT",
            "timeInForce": "GTC",
            "quantity": "0.001",
            "price": "50000.00"
        })
        r = await client.post(f"{BASE_URL}/api/v3/order", params=order_params, headers=headers)
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        
        if r.status_code == 200:
            order_id = r.json().get("orderId")
            
            # 4. Cancel order
            print("\n=== CANCEL ORDER ===")
            cancel_params = sign({"symbol": "BTCUSDT", "orderId": order_id})
            r = await client.delete(f"{BASE_URL}/api/v3/order", params=cancel_params, headers=headers)
            print(f"Status: {r.status_code}")
            print(f"Response: {json.dumps(r.json(), indent=2)}")

asyncio.run(main())
```

---

## 6. Verify Audit/Ledger (after bot runs)

```bash
# Check audit log
curl -s "$BACKEND/api/admin/audit-log?user_id=$USER_ID&limit=5" \
  -H "X-User-Id: admin_user_001" | python3 -m json.tool

# Check ledger
curl -s "$BACKEND/api/admin/ledger?user_id=$USER_ID&limit=5" \
  -H "X-User-Id: admin_user_001" | python3 -m json.tool
```

---

## Summary

Run steps 1-5 from a machine that can reach `testnet.binance.vision`.
The server at `monitorcrypto.preview.emergentagent.com` is geo-blocked.
