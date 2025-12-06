# MongoDB Atlas Setup Guide for CoinHubX

## 🚨 CRITICAL: Current Situation

**Problem:** The backend is currently using a LOCAL MongoDB instance (`mongodb://localhost:27017`) which is:
- ❌ NOT persistent across deployments
- ❌ NOT backed up
- ❌ Missing production user data
- ❌ Will be wiped if the container restarts

**Your production data is in MongoDB Atlas, but the connection is failing due to:**
1. SSL/TLS handshake errors
2. Server IP not whitelisted in Atlas
3. Potentially incorrect connection string

---

## Step 1: Get Your CORRECT MongoDB Atlas Connection String

### Option A: If you know which cluster is correct

**You mentioned two Atlas clusters in the logs:**
1. `coinhubx.4sdvl.mongodb.net`
2. `cluster0.ctczzad.mongodb.net`

**Which one contains your production data?** To find out:

1. Log into https://cloud.mongodb.com/
2. Look at your clusters
3. Click on each cluster and check:
   - Database size (the one with data will be larger)
   - Last activity timestamp
   - Database names (look for `cryptobank` or `coinhubx_production`)

### Option B: Get a fresh connection string

1. Log into MongoDB Atlas: https://cloud.mongodb.com/
2. Select your project
3. Click on your cluster (the one with your production data)
4. Click **"Connect"**
5. Choose **"Connect your application"**
6. Select **"Python"** and version **"3.11 or later"**
7. Copy the connection string (it will look like):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Replace `<password>` with your actual database password

---

## Step 2: Whitelist the Server IP in Atlas

**This is CRITICAL** - Atlas blocks all connections by default.

### Find your server's public IP:

```bash
curl -s https://api.ipify.org
```

OR check the error logs for the IP being rejected.

### Whitelist it in Atlas:

1. In MongoDB Atlas, go to **Network Access** (left sidebar)
2. Click **"+ ADD IP ADDRESS"**
3. Enter your server's public IP address
4. Add a comment like "CoinHubX Production Server"
5. Click **"Confirm"**

**Alternative:** For testing, you can temporarily allow access from anywhere:
- Click **"ALLOW ACCESS FROM ANYWHERE"**
- This adds `0.0.0.0/0` (⚠️ less secure, only for testing)

---

## Step 3: Test the Connection

Once you have:
✅ Correct connection string
✅ Server IP whitelisted

Test it:

```bash
cd /app/backend
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    # REPLACE WITH YOUR ACTUAL CONNECTION STRING
    mongo_url = "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
    
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        # Test the connection
        await client.admin.command('ping')
        print("✅ SUCCESS: Connected to MongoDB Atlas!")
        
        # List databases
        dbs = await client.list_database_names()
        print(f"\n📊 Available databases: {dbs}")
        
        # Check for production data
        for db_name in ['cryptobank', 'coinhubx_production']:
            if db_name in dbs:
                db = client[db_name]
                collections = await db.list_collection_names()
                print(f"\n✅ Found database: {db_name}")
                print(f"   Collections: {collections}")
                
                # Count users
                user_count = await db.users.count_documents({})
                print(f"   Users: {user_count}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        print("\nCommon issues:")
        print("1. Server IP not whitelisted in Atlas")
        print("2. Wrong password in connection string")
        print("3. Network/firewall blocking port 27017")

asyncio.run(test())
PYEOF
```

---

## Step 4: Update Backend Configuration

**Once the test succeeds**, update the backend:

### Method 1: Via Environment Variable (RECOMMENDED)

```bash
# In Emergent dashboard, set the environment variable:
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=cryptobank  # or coinhubx_production, whichever has your data
```

### Method 2: Via .env file (TEMPORARY - will be overwritten on deploy)

```bash
cd /app/backend
nano .env
# Update these lines:
MONGO_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=cryptobank
```

Then restart:
```bash
sudo supervisorctl restart backend
```

---

## Step 5: Verify Production Data

After connecting to Atlas, verify your production data is accessible:

```bash
# Test login endpoint
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coinhubx.net","password":"1231123"}'

# Should return user data and token, not "Invalid credentials"
```

```bash
# Test trading pairs
curl http://localhost:8001/api/trading/pairs
# Should return your actual trading pairs from production
```

---

## Common Atlas Connection Errors

### Error: "SSL handshake failed"
**Solution:** Remove `tlsAllowInvalidCertificates=true` from connection string. Use standard SSL.

### Error: "Server selection timeout"
**Solutions:**
1. Server IP not whitelisted → Add it in Atlas Network Access
2. Wrong connection string → Get fresh one from Atlas
3. Firewall blocking port 27017 → Check with: `nc -zv cluster0.xxxxx.mongodb.net 27017`

### Error: "Authentication failed"
**Solutions:**
1. Wrong password in connection string
2. User doesn't have permissions → Check Database Access in Atlas

---

## 🎯 What I Need From You

To complete the MongoDB Atlas setup, please provide:

1. **✅ Which Atlas cluster is correct?**
   - `coinhubx.4sdvl.mongodb.net`
   - `cluster0.ctczzad.mongodb.net`
   - Or a fresh connection string from Atlas

2. **✅ Which database name?**
   - `cryptobank`
   - `coinhubx_production`
   - Other?

3. **✅ Server IP whitelisting:**
   - I can get the server IP with `curl https://api.ipify.org`
   - You need to add it in Atlas → Network Access

4. **✅ Confirmation:**
   - Have you added the server IP to Atlas Network Access?
   - Have you verified the password in the connection string?

---

## Current Status

```
❌ MongoDB Atlas: NOT CONNECTED
✅ Local MongoDB: CONNECTED (temporary, will be wiped)
✅ Backend API: RUNNING (using local DB with limited data)
⚠️ Production Data: INACCESSIBLE (in Atlas)
```

**Next Steps:**
1. You whitelist server IP in Atlas
2. You provide correct connection string
3. I update backend config
4. I restart backend
5. ✅ Production data accessible

---

**Created:** 2025-12-06 02:10 UTC  
**Status:** AWAITING ATLAS CREDENTIALS AND IP WHITELISTING
