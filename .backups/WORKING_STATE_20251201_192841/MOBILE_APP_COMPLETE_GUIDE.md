# Coin Hub X - Mobile App Complete Implementation Guide

## 📱 Project Overview

This document provides the complete implementation for the Coin Hub X React Native mobile app with full P2P marketplace functionality.

---

## 🏗️ Project Structure

```
/app/mobile/
├── android/              # Android native code (auto-generated)
├── ios/                  # iOS native code (auto-generated)
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Button.js     ✅ COMPLETE
│   │   ├── Input.js      ✅ COMPLETE
│   │   └── Card.js       ✅ COMPLETE
│   ├── config/
│   │   ├── api.js        ✅ COMPLETE - Axios setup with interceptors
│   │   ├── colors.js     ✅ COMPLETE - Dark neon theme
│   │   └── constants.js  ✅ COMPLETE - Platform config
│   ├── context/
│   │   └── AuthContext.js ✅ COMPLETE - Authentication state
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js     ✅ COMPLETE
│   │   │   └── RegisterScreen.js  ✅ COMPLETE
│   │   ├── Marketplace/
│   │   │   ├── MarketplaceScreen.js    🔴 TO IMPLEMENT
│   │   │   └── CreateOfferScreen.js    🔴 TO IMPLEMENT
│   │   ├── Trade/
│   │   │   ├── PreviewOrderScreen.js   🔴 TO IMPLEMENT
│   │   │   └── TradeScreen.js          🔴 TO IMPLEMENT
│   │   ├── Orders/
│   │   │   └── MyOrdersScreen.js       🔴 TO IMPLEMENT
│   │   ├── Wallet/
│   │   │   └── WalletScreen.js         🔴 TO IMPLEMENT
│   │   └── Settings/
│   │       └── SettingsScreen.js       🔴 TO IMPLEMENT
│   ├── services/
│   │   ├── p2pService.js      ✅ COMPLETE - All P2P API calls
│   │   └── walletService.js   ✅ COMPLETE - Wallet & withdrawal
│   └── App.js            ✅ COMPLETE - Navigation setup
├── .env                  ✅ COMPLETE - Configuration
├── package.json          ✅ COMPLETE
└── README.md            🔴 TO CREATE
```

---

## ✅ What's Already Complete

1. **Project Infrastructure** (100%)
   - Package.json with all dependencies
   - Navigation setup (Stack + Bottom Tabs)
   - Theme configuration (dark neon matching web)
   - Environment configuration

2. **API Layer** (100%)
   - Complete P2P service with all endpoints
   - Wallet service with withdrawal
   - Axios interceptors for auth
   - Error handling

3. **Authentication** (100%)
   - Login screen with validation
   - Register screen with validation
   - Auth context with AsyncStorage
   - Auto-login on app restart

4. **Reusable Components** (100%)
   - Button (primary, outline, variants)
   - Input (with labels, errors)
   - Card component

---

## 🔴 Critical Path Screens to Implement

### Priority 1: Marketplace Screen

**File**: `/app/mobile/src/screens/Marketplace/MarketplaceScreen.js`

**Requirements**:
- Display list of offers (FlatList)
- Filters for: Crypto (BTC/ETH/USDT), Fiat Currency (12 currencies), Payment Method (9 methods)
- Each offer card shows:
  - Seller name, verification badge
  - Price per unit
  - Available amount
  - Payment methods (icons)
  - Min/Max limits
  - Seller requirements tags
- "Create Offer" button (navigation to CreateOfferScreen)
- Tap offer → Navigate to PreviewOrderScreen with offer data

**API Calls**:
```javascript
// Get config
const config = await p2pService.getConfig();

// Get offers
const { offers } = await p2pService.getOffers({
  cryptoCurrency: 'BTC',
  fiatCurrency: 'USD',
  paymentMethod: 'wise'
});
```

**Key Implementation Points**:
- Use RefreshControl for pull-to-refresh
- Filter state management
- Currency symbol display from config
- Responsive card layout

---

### Priority 2: Preview Order Screen

**File**: `/app/mobile/src/screens/Trade/PreviewOrderScreen.js`

**Requirements**:
- Receive navigation params: `{ sellOrderId, cryptoAmount }`
- Display seller info section:
  - Avatar/Icon
  - Username
  - Verification badge (if verified)
  - Total trades, completion rate
  - Average release time
- Display advertiser requirements (tags)
- Display order details:
  - "You Receive": Large, bold fiat amount
  - "You Sell": Crypto amount
  - Price per unit
  - Min/Max limits
- Payment method selection (radio buttons)
- Escrow protection notice
- Validate amount against min/max
- "Confirm & Start Trade" button

**API Calls**:
```javascript
// Preview order
const { preview } = await p2pService.previewOrder(
  sellOrderId,
  user.user_id,
  cryptoAmount
);

// Create trade on confirm
const { trade } = await p2pService.createTrade(
  sellOrderId,
  user.user_id,
  cryptoAmount,
  selectedPaymentMethod
);

// Navigate to TradeScreen
navigation.navigate('Trade', { tradeId: trade.trade_id });
```

**Error Handling**:
- Below min: Show error "Minimum purchase is X BTC"
- Above max: Show error "Maximum purchase is X BTC"
- Insufficient balance: Show error from backend

---

### Priority 3: Trade Screen

**File**: `/app/mobile/src/screens/Trade/TradeScreen.js`

**Requirements**:
- Receive navigation params: `{ tradeId }`
- Poll trade details every 5 seconds
- Display sections:
  1. **Escrow Banner** (if escrow_locked)
     - Green banner: "X BTC Locked in Escrow"
     - Shield icon
  2. **Timer Section** (if pending)
     - Countdown timer (MM:SS format)
     - Auto-update every second
     - Warning color when < 5 minutes
  3. **Trade Details Card**
     - Amount, Total Price
     - Payment method (with icon and time)
     - Buyer/Seller name
     - Trade ID (truncated)
  4. **Status Badge**
     - Color-coded: pending (blue), paid (orange), released (green), etc.
  5. **Action Buttons**
     - "I Have Paid" (buyer, if status = pending_payment)
     - "Release Crypto" (seller, if status = buyer_marked_paid)
     - "Cancel Trade" (if status = pending_payment)
  6. **Trade Chat**
     - FlatList of messages
     - Input + Send button
     - Auto-scroll to bottom
     - Distinguish buyer/seller messages

**API Calls**:
```javascript
// Get trade details
const { trade, seller, buyer_name, time_remaining_seconds } = 
  await p2pService.getTradeDetails(tradeId);

// Mark as paid
await p2pService.markPaid(tradeId, user.user_id);

// Release crypto
await p2pService.releaseCrypto(tradeId, user.user_id);

// Cancel
await p2pService.cancelTrade(tradeId, user.user_id);

// Get messages
const { messages } = await p2pService.getTradeMessages(tradeId);

// Send message
await p2pService.sendTradeMessage(tradeId, user.user_id, role, message);
```

**Timer Logic**:
```javascript
const [timeLeft, setTimeLeft] = useState(time_remaining_seconds);

useEffect(() => {
  const interval = setInterval(() => {
    setTimeLeft(prev => Math.max(0, prev - 1));
  }, 1000);
  return () => clearInterval(interval);
}, []);

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

---

### Priority 4: My Orders Screen

**File**: `/app/mobile/src/screens/Orders/MyOrdersScreen.js`

**Requirements**:
- Filter tabs: All, Active, Buying, Selling, Completed
- Display list of trades (FlatList)
- Each trade card shows:
  - Badge: "BUYING" or "SELLING"
  - Amount and fiat total
  - Status badge (color-coded)
  - Escrow indicator (if locked)
  - Trade ID
  - Timestamp
- Pull to refresh
- Tap trade → Navigate to TradeScreen
- Auto-refresh every 10 seconds

**API Calls**:
```javascript
const { trades } = await p2pService.getUserTrades(user.user_id);
```

**Filtering Logic**:
```javascript
const getFilteredTrades = () => {
  switch (filter) {
    case 'active':
      return trades.filter(t => 
        ['pending_payment', 'buyer_marked_paid'].includes(t.status)
      );
    case 'buying':
      return trades.filter(t => t.buyer_id === user.user_id);
    case 'selling':
      return trades.filter(t => t.seller_id === user.user_id);
    case 'completed':
      return trades.filter(t => t.status === 'released');
    default:
      return trades;
  }
};
```

---

### Priority 5: Wallet Screen

**File**: `/app/mobile/src/screens/Wallet/WalletScreen.js`

**Requirements**:
- Display crypto balances (BTC, ETH, USDT)
- Each balance card shows:
  - Currency name and icon
  - Total balance
  - Locked balance (if any)
  - Available balance
  - Withdraw button
- Withdrawal modal:
  - Amount input
  - Wallet address input
  - Real-time fee calculation (1.5%)
  - Breakdown display:
    - Amount Entered
    - Withdrawal Fee (1.5%)
    - You Will Receive
  - "⚡ Fee automatically routed to platform wallet"
  - Confirm button

**API Calls**:
```javascript
// Get balance
const { balances } = await walletService.getBalance(user.user_id);

// Get fee config
const { fee_percent } = await walletService.getWithdrawalFeeConfig();

// Withdraw
const result = await walletService.withdraw(
  user.user_id,
  currency,
  amount,
  walletAddress
);
```

**Fee Calculation**:
```javascript
const calculateFee = (amount, feePercent = 1.5) => {
  const fee = (amount * feePercent) / 100;
  const netAmount = amount - fee;
  return { fee, netAmount };
};

// Usage
const { fee, netAmount } = calculateFee(withdrawAmount, 1.5);
```

---

## 🟡 Secondary Screens (Basic Implementation)

### Settings Screen

**File**: `/app/mobile/src/screens/Settings/SettingsScreen.js`

**Simple Version** (no full implementation needed):
```javascript
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { COLORS } from '../../config/colors';

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.info}>Logged in as: {user?.email}</Text>
      <Button title=\"Logout\" onPress={handleLogout} variant=\"danger\" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 24 },
  info: { color: COLORS.textSecondary, marginBottom: 24 },
});

export default SettingsScreen;
```

### Create Offer Screen

**File**: `/app/mobile/src/screens/Marketplace/CreateOfferScreen.js`

**Placeholder** (can be completed later):
```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

const CreateOfferScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Offer</Text>
      <Text style={styles.subtitle}>
        TODO: Implement offer creation form
      </Text>
      <Text style={styles.note}>
        Features needed:{'\n'}
        • Crypto amount input{'\n'}
        • Price per unit{'\n'}
        • Min/Max limits{'\n'}
        • Payment method selection{'\n'}
        • Seller requirements
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 16 },
  subtitle: { color: COLORS.textSecondary, fontSize: 16, marginBottom: 24 },
  note: { color: COLORS.textMuted, fontSize: 14, lineHeight: 24 },
});

export default CreateOfferScreen;
```

---

## 🚀 Development Setup

### Prerequisites

- Node.js >= 16
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- CocoaPods (for iOS)

### Installation

```bash
cd /app/mobile

# Install dependencies
yarn install

# iOS only
cd ios && pod install && cd ..

# Start Metro bundler
yarn start

# Run on Android
yarn android

# Run on iOS
yarn ios
```

### Configuration

Edit `.env` file:

```bash
# For Android Emulator
API_BASE_URL=http://10.0.2.2:8001

# For iOS Simulator
API_BASE_URL=http://localhost:8001

# For Physical Device (replace with your machine's IP)
API_BASE_URL=http://192.168.1.100:8001

# For Production
API_BASE_URL=https://api.coinhubx.com
```

---

## 📦 Building for Production

### Android APK/AAB

1. **Generate Keystore**:
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore coinhubx.keystore -alias coinhubx -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing** (`android/gradle.properties`):
```properties
COINHUBX_UPLOAD_STORE_FILE=coinhubx.keystore
COINHUBX_UPLOAD_KEY_ALIAS=coinhubx
COINHUBX_UPLOAD_STORE_PASSWORD=your_password
COINHUBX_UPLOAD_KEY_PASSWORD=your_password
```

3. **Build Release**:
```bash
cd android
./gradlew assembleRelease    # APK
./gradlew bundleRelease       # AAB (for Play Store)
```

4. **Output**:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS IPA

1. **Open Xcode**:
```bash
open ios/CoinHubX.xcworkspace
```

2. **Configure Signing**:
- Select project in Xcode
- Go to Signing & Capabilities
- Select your Team
- Ensure Bundle Identifier is unique: `com.coinhubx.app`

3. **Archive**:
- Product → Archive
- Distribute App → App Store Connect or Ad Hoc

4. **TestFlight**:
- Upload to App Store Connect
- Add internal/external testers
- Share TestFlight link

---

## 🌐 Update Web Landing Page

### Add Download App Section

**File**: `/app/frontend/src/pages/LandingPage.js`

Add this section before the footer:

```javascript
{/* Download App Section */}
<section className=\"download-app-section\" id=\"download-app\">
  <div className=\"download-content\">
    <h2 className=\"section-title\">Download Coin Hub X App</h2>
    <p className=\"section-subtitle\">
      Trade crypto on the go. Available on iOS and Android.
    </p>
    <div className=\"download-buttons\">
      <a 
        href=\"https://coinhubx.com/ios\" 
        className=\"app-store-button\"
        target=\"_blank\"
        rel=\"noopener noreferrer\"
      >
        <img src=\"/app-store-badge.png\" alt=\"Download on App Store\" />
      </a>
      <a 
        href=\"https://coinhubx.com/android\" 
        className=\"play-store-button\"
        target=\"_blank\"
        rel=\"noopener noreferrer\"
      >
        <img src=\"/play-store-badge.png\" alt=\"Get it on Google Play\" />
      </a>
    </div>
  </div>
</section>
```

Add CSS to `/app/frontend/src/App.css`:

```css
.download-app-section {
  padding: 6rem 2rem;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1));
}

.download-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.download-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.app-store-button img,
.play-store-button img {
  height: 60px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.app-store-button:hover img,
.play-store-button:hover img {
  transform: scale(1.05);
}
```

### Add "Download App" Button to Hero

In the hero section, add:

```javascript
<button
  onClick={() => document.getElementById('download-app').scrollIntoView({ behavior: 'smooth' })}
  className=\"download-app-hero-btn\"
>
  📱 Download Mobile App
</button>
```

---

## 📚 API Integration Reference

All API calls use the same backend as the web version. The mobile app connects to:

**Development**: `http://10.0.2.2:8001/api` (Android Emulator)  
**Production**: `https://api.coinhubx.com/api`

### Key Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | User login |
| `/auth/register` | POST | User registration |
| `/p2p/config` | GET | Get currencies & payment methods |
| `/p2p/offers` | GET | Get filtered offers |
| `/p2p/preview-order` | POST | Preview order before trade |
| `/p2p/create-trade` | POST | Create trade & lock escrow |
| `/p2p/trade/{id}` | GET | Get trade details |
| `/p2p/mark-paid` | POST | Buyer marks payment sent |
| `/p2p/release-crypto` | POST | Seller releases from escrow |
| `/p2p/cancel-trade` | POST | Cancel pending trade |
| `/p2p/trades/user/{id}` | GET | Get user's trades |
| `/p2p/trade/message` | POST | Send trade chat message |
| `/p2p/trade/{id}/messages` | GET | Get trade messages |
| `/crypto-bank/withdraw` | POST | Withdraw with 1.5% fee |

---

## ✅ Testing Checklist

### Before Building

- [ ] Update `.env` with production API URL
- [ ] Test all critical path screens
- [ ] Verify API calls work
- [ ] Test on both iOS and Android
- [ ] Check error handling
- [ ] Verify timer countdown
- [ ] Test withdrawal fee calculation
- [ ] Confirm escrow lock/release

### Manual Testing Flow

1. Register → Login
2. Browse Marketplace with filters
3. Select offer → Preview Order
4. Confirm → Trade created (verify escrow locked)
5. Mark as Paid
6. Release Crypto (from seller account)
7. Check My Orders (status: completed)
8. Withdraw crypto (verify 1.5% fee deducted)

---

## 🎯 Next Steps

1. **Implement Priority Screens** (in order):
   - MarketplaceScreen
   - PreviewOrderScreen  
   - TradeScreen
   - MyOrdersScreen
   - WalletScreen

2. **Test Critical Path** end-to-end

3. **Build APK/IPA** following instructions above

4. **Update Web Landing Page** with download buttons

5. **Deploy Backend** to production (if not already)

6. **Submit to App Stores**:
   - Google Play Console
   - Apple App Store Connect

---

## 📞 Support

For development questions, refer to:
- React Native Docs: https://reactnative.dev/
- React Navigation: https://reactnavigation.org/
- Backend API: Check `/app/P2P_TESTING_REPORT.md`

---

## 🏁 Summary

**What's Complete**:
- ✅ Full project structure
- ✅ API layer with all P2P endpoints
- ✅ Authentication flow
- ✅ Navigation setup
- ✅ Reusable components
- ✅ Configuration

**What Needs Implementation**:
- 🔴 5 Critical Path screens (detailed specs provided above)
- 🟡 2 Secondary screens (simple placeholders provided)

**External Developer Tasks**:
- Implement the 5 critical screens using the detailed specs
- Test end-to-end flow
- Build APK/AAB and IPA
- Submit to app stores

**Estimated Time**: 16-24 hours for experienced React Native developer

All infrastructure, API integration, and documentation is ready. The remaining work is primarily UI implementation following the provided specifications.
