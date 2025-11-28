# CoinHubX - Local Setup Instructions

## 📦 What You Have

The `coinhubx-complete.zip` file contains:
- ✅ Backend (FastAPI + Python)
- ✅ Frontend (React)
- ✅ Mobile App (React Native)
- ✅ All configuration files

---

## 🚀 Quick Start Guide

### Prerequisites

Install these first:
1. **Node.js** (v16+) - https://nodejs.org
2. **Python** (3.9+) - https://python.org
3. **MongoDB** - https://www.mongodb.com/try/download/community
4. **Yarn** - Run: `npm install -g yarn`

---

## 🖥️ Backend Setup

### 1. Extract & Navigate
```bash
# Extract the zip file
unzip coinhubx-complete.zip
cd coinhubx-complete/backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
The `.env` file is already included. Update if needed:
```
MONGO_URL=mongodb://localhost:27017
```

### 5. Start MongoDB
```bash
# On Windows (if installed as service):
net start MongoDB

# On Mac:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
```

### 6. Start Backend
```bash
python server.py
```

**Backend will run on:** `http://localhost:8001`

---

## 🌐 Frontend Setup

### 1. Navigate to Frontend
```bash
cd ../frontend
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Configure Environment
The `.env` file is already included:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Start Frontend
```bash
yarn start
```

**Frontend will open at:** `http://localhost:3000`

---

## 📱 Mobile App Setup

### Option 1: Run with Expo (Fastest - No Build Required)

#### 1. Navigate to Mobile
```bash
cd ../mobile
```

#### 2. Install Dependencies
```bash
yarn install
```

#### 3. Start Expo
```bash
npx expo start
```

#### 4. Scan QR Code
- **Android:** Download "Expo Go" from Play Store, scan QR
- **iOS:** Download "Expo Go" from App Store, scan QR

---

### Option 2: Build Native APK (Android)

Requires Android Studio + Android SDK installed.

#### 1. Install Dependencies
```bash
cd mobile
yarn install
```

#### 2. Build APK
```bash
cd android
./gradlew assembleRelease
```

#### 3. Find APK
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## ✅ Verify Installation

### Test Backend
```bash
curl http://localhost:8001/api/health
```

### Test Frontend
Open browser: `http://localhost:3000`

---

## 📋 What's Included

### Features
- ✅ P2P Crypto Marketplace
- ✅ Escrow System
- ✅ Dual Referral System (Private £10 bonus + Public)
- ✅ Wallet Management (12+ cryptocurrencies)
- ✅ Manual Deposit/Withdrawal System
- ✅ Live Price Ticker (all pages)
- ✅ Markets Page with live prices
- ✅ Admin Dashboard
- ✅ Dispute Resolution

### Supported Cryptocurrencies
BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOGE, MATIC, LTC, AVAX, DOT

---

## 🎨 Design Theme

- **Colors:** Cyan (#00F0FF) → Purple (#A855F7) gradient
- **Style:** Dark neon theme (C1 Design)
- **Consistent** across web and mobile

---

## 🔧 Troubleshooting

### Backend won't start
- Check MongoDB is running: `mongod --version`
- Check port 8001 is available

### Frontend won't start
- Delete `node_modules` and `yarn.lock`
- Run `yarn install` again
- Check port 3000 is available

### Mobile app won't connect
- Ensure backend is running
- Check `.env` has correct API_BASE_URL
- Both phone and computer must be on same WiFi

---

## 📞 Common Commands

### Backend
```bash
# Start backend
cd backend
python server.py

# Check logs (if using supervisor)
tail -f /var/log/supervisor/backend.err.log
```

### Frontend
```bash
# Start frontend
cd frontend
yarn start

# Build for production
yarn build
```

### Mobile
```bash
# Start with Expo
cd mobile
npx expo start

# Build APK
cd mobile/android
./gradlew assembleRelease
```

---

## 🎯 Default Admin Access

Create admin account through the registration flow, then update the database:
```javascript
// In MongoDB
db.user_accounts.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

---

## 🌟 Key Features to Test

1. **Register/Login** - Create account
2. **Markets Page** - View live crypto prices
3. **P2P Trading** - Create offer, accept trade
4. **Wallet** - Add addresses, request withdrawal
5. **Referrals** - Generate private/public codes
6. **Price Ticker** - See live prices scrolling at top

---

## 📚 Additional Resources

- **Mobile Screens Overview:** `/mobile/APP_SCREENS_OVERVIEW.md`
- **Mobile Build Guide:** `/mobile/BUILD_INSTRUCTIONS.md`
- **Backend API:** Runs on port 8001
- **Frontend:** Runs on port 3000

---

## 💡 Tips

- Start **backend first**, then frontend
- Keep MongoDB running in background
- For mobile: Use Expo Go app for fastest testing
- Check browser console for any errors
- Backend API docs (if needed): `http://localhost:8001/docs`

---

**Your project is ready to run!** 🚀

If you encounter issues:
1. Check all prerequisites are installed
2. Ensure MongoDB is running
3. Verify ports 3000 and 8001 are available
4. Check `.env` files have correct values
