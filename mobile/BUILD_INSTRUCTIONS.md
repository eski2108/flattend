# CoinHubX Mobile App - Build Instructions

## ✅ App Synchronization Complete - LATEST UPDATE (Nov 2024)

The mobile app has been fully synchronized with the web application including ALL NEW FEATURES:

### Latest Features Added:
- ✅ **Currency Conversion System** - 37+ world currencies with GBP default
  - Currency selector with country flags and search
  - Real-time exchange rates
  - User preference saved to backend
- ✅ **KYC Verification System** - Complete identity verification flow
  - 3-step wizard (Personal Info → Documents → Review)
  - Document upload (ID front/back, selfie, proof of address)
  - Status tracking (Pending, Approved, Rejected)
  - Tier-based limits
- ✅ **Live Price Ticker** - Scrolling crypto prices on Markets screen
- ✅ **Referral Dashboard** - Dual-tier referral system
- ✅ **Responsive Sizing** - Optimized for all screen sizes (small phones to tablets)

### Core Features:
- ✅ Professional Logo component (shield design with gradient)
- ✅ Updated color scheme (Cyan #00F0FF → Purple #A855F7)
- ✅ 12+ cryptocurrency support (BTC, ETH, USDT, BNB, SOL, XRP, ADA, DOGE, MATIC, LTC, AVAX, DOT)
- ✅ 9 global payment methods
- ✅ 12 fiat currencies
- ✅ Fee structure (1% trade, 1% withdrawal, 20% referral)
- ✅ Honest presentation (no fake statistics)
- ✅ All auth screens updated with new branding

### Responsive Design:
- ✅ Small phones (360x640) - Optimized spacing and font sizes
- ✅ Standard phones (375x667, 390x844) - Perfect layout
- ✅ Large phones (414x896) - Enhanced spacing
- ✅ Tablets (768x1024+) - Adaptive grid layouts
- All text sizes scale appropriately
- Touch targets minimum 44x44 points
- Safe area handling for notched devices

---

## 📱 Building the Android APK

### Prerequisites:
1. **Node.js** (v16+) - Already installed
2. **Java JDK** (11 or 17)
3. **Android SDK** & **Android Studio**
4. **Gradle**

### Method 1: Using Android Studio (Recommended)

#### Step 1: Open Project
```bash
cd /app/mobile
# Open the android folder in Android Studio
```

#### Step 2: Install Dependencies
```bash
yarn install
```

#### Step 3: Build APK
In Android Studio:
1. Open `/app/mobile/android` folder
2. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete
4. APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

### Method 2: Using Command Line

#### Step 1: Navigate to mobile directory
```bash
cd /app/mobile
```

#### Step 2: Install dependencies
```bash
yarn install
```

#### Step 3: Generate Release APK
```bash
cd android
./gradlew assembleRelease
```

#### Step 4: Find your APK
The APK will be located at:
```
/app/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Troubleshooting

### Issue: "SDK location not found"
**Solution:** Create `local.properties` file in `/app/mobile/android/`:
```
sdk.dir=/path/to/Android/Sdk
```

### Issue: "Gradle build failed"
**Solution:** 
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Issue: "react-native-svg not linking"
**Solution:**
```bash
cd /app/mobile
yarn install
cd android
./gradlew clean
```

---

## 🎯 Testing the App

### Run on Android Emulator:
```bash
cd /app/mobile
yarn android
```

### Run on Physical Device:
1. Enable USB debugging on your Android device
2. Connect via USB
3. Run: `yarn android`

---

## 📦 APK Distribution

Once built, you can distribute the APK by:
1. **Email/Cloud:** Upload to Google Drive, Dropbox, etc.
2. **QR Code:** Use a file sharing service and generate QR code
3. **TestFlight Alternative:** Use services like AppCenter or Firebase App Distribution

---

## ⚠️ Important Notes

1. **Backend URL:** The app is configured to connect to:
   ```
   https://spottrading-fix.preview.emergentagent.com/api
   ```

2. **Permissions:** The app requests:
   - Internet access
   - Network state

3. **Security:** For production release:
   - Generate a proper signing key
   - Update `android/app/build.gradle` with signing config
   - Never commit signing keys to git

---

## 🚀 Next Steps

After building the APK:
1. Install on your Android device
2. Test all features:
   - Registration & Login
   - Marketplace browsing
   - Creating sell offers
   - P2P trading flow
   - Wallet operations
   - Referral system

3. Verify the new branding and 12+ cryptocurrencies are showing correctly

---

## 📞 Support

If you encounter any issues during the build process, common solutions:
- Clear gradle cache: `cd android && ./gradlew clean`
- Reinstall dependencies: `rm -rf node_modules && yarn install`
- Check Java version: `java -version` (should be 11 or 17)
- Verify Android SDK is installed and ANDROID_HOME is set

---

**App Version:** 1.0.0  
**Package Name:** com.coinhubx  
**Min SDK:** 21 (Android 5.0)  
**Target SDK:** 33 (Android 13)
