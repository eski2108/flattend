# WALLET SYSTEM - SCHEMA & BEST PRACTICES

## Date: November 30, 2025
## Critical: Must Read for All Developers

---

## ⚠️ CORRECT WALLET SCHEMA

### Database Collection: `wallets`

**CORRECT FORMAT (MUST USE THIS):**
```javascript
{
  user_id: "string",           // User identifier
  currency: "string",          // Currency code (GBP, BTC, ETH, etc.)
  available_balance: Number,   // Funds available for use
  locked_balance: Number,      // Funds locked in trades/escrow
  total_balance: Number,       // available + locked
  created_at: Date,
  last_updated: Date
}
```

**IMPORTANT:** One document per currency per user.

**Example:**
```javascript
// User has GBP, BTC, and ETH = 3 separate documents
{user_id: "abc123", currency: "GBP", total_balance: 10000, ...}
{user_id: "abc123", currency: "BTC", total_balance: 0.5, ...}
{user_id: "abc123", currency: "ETH", total_balance: 10, ...}
```

### ❌ WRONG FORMAT (DO NOT USE):
```javascript
// WRONG: Nested balances object
{
  user_id: "abc123",
  balances: {
    GBP: {balance: 10000},
    BTC: {balance: 0.5},
    ETH: {balance: 10}
  }
}
```

---

## 🛠️ WALLET SERVICE - ALWAYS USE THIS

### Import:
```python
from wallet_service import WalletService

wallet_service = WalletService(db)
```

### Operations:

**1. Credit (Add Funds):**
```python
await wallet_service.credit(
    user_id="abc123",
    currency="GBP",
    amount=100.50,
    transaction_type="deposit",  # deposit|earning|refund|transfer_in|referral_commission
    reference_id="deposit_xyz",
    metadata={"source": "bank_transfer"}
)
```

**2. Debit (Remove Funds):**
```python
await wallet_service.debit(
    user_id="abc123",
    currency="GBP",
    amount=50.25,
    transaction_type="withdrawal",  # withdrawal|payment|fee|transfer_out
    reference_id="withdraw_xyz"
)
```

**3. Lock Funds (Escrow/Reserves):**
```python
await wallet_service.lock_funds(
    user_id="abc123",
    currency="BTC",
    amount=0.001,
    reason="p2p_trade",
    reference_id="trade_xyz"
)
```

**4. Unlock Funds:**
```python
await wallet_service.unlock_funds(
    user_id="abc123",
    currency="BTC",
    amount=0.001,
    reference_id="trade_xyz"
)
```

**5. Get Balance:**
```python
balance = await wallet_service.get_balance("abc123", "GBP")
# Returns: {available: 9950.25, locked: 0, total: 9950.25}
```

**6. Get All Balances:**
```python
balances = await wallet_service.get_all_balances("abc123")
# Returns: [{currency: "GBP", available_balance: 9950.25, ...}, {currency: "BTC", ...}]
```

---

## 👥 USER REGISTRATION - MUST INITIALIZE WALLETS

### Helper Function:
```python
async def initialize_user_wallets(user_id: str, initial_balances: dict = None):
    """
    Initialize wallets for new user
    CALL THIS IMMEDIATELY AFTER USER CREATION
    """
    wallet_service = get_wallet_service()
    
    # Default: Create empty wallets for main currencies
    if initial_balances is None:
        initial_balances = {'GBP': 0, 'BTC': 0, 'ETH': 0, 'USDT': 0}
    
    for currency, amount in initial_balances.items():
        if amount > 0:
            await wallet_service.credit(
                user_id, currency, amount, 
                'initial_balance', 'user_registration'
            )
        else:
            # Create empty wallet
            await db.wallets.insert_one({
                "user_id": user_id,
                "currency": currency,
                "available_balance": 0.0,
                "locked_balance": 0.0,
                "total_balance": 0.0,
                "created_at": datetime.now(timezone.utc),
                "last_updated": datetime.now(timezone.utc)
            })
```

### In Registration Endpoint:
```python
@api_router.post("/auth/register")
async def register_user(request):
    # ... create user account ...
    
    # CRITICAL: Initialize wallets
    await initialize_user_wallets(user_account.user_id)
    
    return {"success": True, "user_id": user_account.user_id}
```

---

## 📊 API RESPONSE FORMAT

### Backend Endpoint: `/api/wallets/balances/{user_id}`

**Response Format:**
```json
{
  "success": true,
  "user_id": "abc123",
  "balances": [
    {
      "currency": "GBP",
      "available_balance": 10000.0,
      "locked_balance": 0.0,
      "total_balance": 10000.0,
      "usd_price": 1.27,
      "usd_value": 12700.0,
      "price_gbp": 1.0,
      "gbp_value": 10000.0
    },
    {
      "currency": "BTC",
      "available_balance": 0.5,
      "locked_balance": 0.0,
      "total_balance": 0.5,
      "usd_price": 91000.0,
      "usd_value": 45500.0,
      "price_gbp": 71610.0,
      "gbp_value": 35805.0
    }
  ],
  "total_usd": 58200.0,
  "last_updated": "2025-11-30T21:00:00Z"
}
```

**Field Definitions:**
- `available_balance`: Funds user can spend/withdraw
- `locked_balance`: Funds in trades/escrow (not spendable)
- `total_balance`: available + locked
- `price_gbp`: Current GBP price per unit
- `gbp_value`: total_balance × price_gbp
- `usd_price`: Current USD price per unit
- `usd_value`: total_balance × usd_price

---

## 💻 FRONTEND INTEGRATION

### Loading Wallet Data:
```javascript
const loadWalletData = async (userId) => {
  const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
  
  // VALIDATION (prevents errors)
  if (!response.data || !Array.isArray(response.data.balances)) {
    throw new Error('Invalid wallet response');
  }
  
  // Validate each balance has required fields
  response.data.balances.forEach((bal, idx) => {
    if (!bal.currency || bal.total_balance === undefined) {
      throw new Error(`Invalid balance at index ${idx}`);
    }
  });
  
  const balances = response.data.balances;
  
  // Calculate total portfolio value
  const totalGBP = balances.reduce((sum, bal) => {
    return sum + (bal.gbp_value || 0);  // Use gbp_value field
  }, 0);
  
  setTotalPortfolioGBP(totalGBP);
  setBalances(balances);
};
```

### Displaying Balances:
```javascript
// Total portfolio
<div>Total: £{totalPortfolioGBP.toFixed(2)}</div>

// Individual currencies
{balances.map(bal => (
  <div key={bal.currency}>
    <span>{bal.currency}</span>
    <span>{bal.total_balance} {bal.currency}</span>
    <span>£{bal.gbp_value.toFixed(2)}</span>
  </div>
))}
```

---

## 🔒 DATABASE INDEXES (REQUIRED)

```javascript
// Unique index: One wallet per user per currency
db.wallets.createIndex({user_id: 1, currency: 1}, {unique: true});

// Fast user queries
db.wallets.createIndex({user_id: 1});

// Fast currency queries
db.wallets.createIndex({currency: 1});
```

---

## ❌ COMMON MISTAKES TO AVOID

### 1. Direct Database Writes
```python
# ❌ WRONG
await db.wallets.update_one(
    {"user_id": user_id},
    {"$inc": {"balances.GBP.balance": 100}}
)

# ✅ CORRECT
await wallet_service.credit(user_id, "GBP", 100, "deposit", "ref")
```

### 2. Not Initializing Wallets on Registration
```python
# ❌ WRONG
@api_router.post("/auth/register")
async def register_user(request):
    user = create_user(...)
    return {"success": True}  # Wallet not created!

# ✅ CORRECT
@api_router.post("/auth/register")
async def register_user(request):
    user = create_user(...)
    await initialize_user_wallets(user.user_id)  # Create wallets
    return {"success": True}
```

### 3. Wrong Field Names in Frontend
```javascript
// ❌ WRONG
const total = balances.reduce((sum, bal) => sum + bal.value_gbp, 0);

// ✅ CORRECT
const total = balances.reduce((sum, bal) => sum + (bal.gbp_value || 0), 0);
```

### 4. Not Handling Multiple User IDs
```python
# Always use the user_id from the authenticated session
# Don't hardcode user_ids for testing
user = get_current_user(request)
await wallet_service.credit(user.user_id, "GBP", 100, ...)
```

---

## 🧪 TESTING

### Test New User Wallet Creation:
```python
# 1. Create user
user_id = await create_user(email="test@test.com", ...)

# 2. Initialize wallets
await initialize_user_wallets(user_id)

# 3. Verify wallets created
balances = await wallet_service.get_all_balances(user_id)
assert len(balances) >= 4  # GBP, BTC, ETH, USDT
assert all(b['total_balance'] == 0 for b in balances)
```

### Test Credit/Debit:
```python
# Credit GBP
await wallet_service.credit(user_id, "GBP", 1000, "test", "ref")

# Check balance
bal = await wallet_service.get_balance(user_id, "GBP")
assert bal['total'] == 1000
assert bal['available'] == 1000

# Debit GBP
await wallet_service.debit(user_id, "GBP", 100, "test", "ref")

bal = await wallet_service.get_balance(user_id, "GBP")
assert bal['total'] == 900
```

---

## 📝 SUMMARY - MUST DO

1. ✅ **ALWAYS use wallet_service** for all wallet operations
2. ✅ **ALWAYS initialize wallets** on user registration
3. ✅ **NEVER write to wallets directly** (use wallet_service methods)
4. ✅ **VALIDATE API responses** in frontend
5. ✅ **USE correct field names**: `gbp_value`, `total_balance`, `available_balance`
6. ✅ **ONE document per currency** (not nested objects)
7. ✅ **CREATE indexes** for performance
8. ✅ **TEST wallet operations** before deployment

---

*This document is the single source of truth for wallet operations.*
*Any deviation from this schema will cause issues.*
*Keep this updated as system evolves.*
