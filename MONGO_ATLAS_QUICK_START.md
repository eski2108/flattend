# ⚡ MONGODB ATLAS - 5 MINUTE QUICK START

**Protect your production data in 5 minutes**

---

## Step 1: Sign Up (1 minute)

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Enter email and password
3. Verify email
4. Done!

---

## Step 2: Create Cluster (1 minute + 3 minute wait)

1. Click **"Build a Database"**
2. Choose **"Shared"** (FREE)
3. Provider: **AWS**
4. Region: **London (eu-west-2)**
5. Cluster Name: `coinhubx-production`
6. Click **"Create Cluster"**
7. ⏳ Wait 3 minutes for cluster to provision

---

## Step 3: Create User (1 minute)

1. Click **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Username: `coinhubx_admin`
4. Click **"Autogenerate Secure Password"**
5. **COPY THE PASSWORD IMMEDIATELY** ⚠️
6. Click **"Add User"**

---

## Step 4: Allow Network Access (30 seconds)

1. Click **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"ALLOW ACCESS FROM ANYWHERE"**
4. Confirm: `0.0.0.0/0`
5. Click **"Confirm"**

---

## Step 5: Get Connection String (1 minute)

1. Click **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string
5. Replace `<password>` with your actual password from Step 3

**Your Final Connection String:**
```
mongodb+srv://coinhubx_admin:YOUR_PASSWORD@coinhubx-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## Step 6: Set Production Environment Variable (1 minute)

**In Emergent Production Settings:**

```bash
MONGO_URL=mongodb+srv://coinhubx_admin:YOUR_PASSWORD@coinhubx-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## ✅ Done!

Your production data is now protected on MongoDB Atlas.

**Never gets wiped. Never gets reset. Always safe.**

---

## 🆘 Need Help?

See full guide: `/app/PRODUCTION_DATABASE_SETUP.md`