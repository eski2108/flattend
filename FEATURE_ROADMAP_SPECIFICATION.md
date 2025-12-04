# CoinHubX Feature Roadmap & Implementation Plan

**Date:** December 4, 2025  
**Status:** Planning & Specification Phase  
**Priority Order:** P2P Functional → Fraud/Risk/Admin → Alerts UI → Advanced Features

---

## Priority 1: P2P-Related Functional Features

### 1.1 Auto-Expire Inactive P2P Offers ⭐ HIGH PRIORITY

**Objective:** Automatically expire stale P2P listings to keep marketplace fresh and active.

#### Backend Implementation:

**Database Schema Updates:**
```javascript
// p2p_listings collection
{
  listing_id: "uuid",
  status: "active" | "paused" | "expired" | "cancelled",
  created_at: "2025-12-04T10:00:00Z",
  last_active_at: "2025-12-04T14:30:00Z",  // NEW
  auto_expire_hours: 48,  // NEW (configurable per listing or global)
  expired_at: null,  // NEW (timestamp when expired)
  expired_reason: null  // NEW ("auto_expire" | "manual" | "admin")
}
```

**Configuration:**
```javascript
// platform_settings collection
{
  setting_id: "p2p_auto_expire",
  auto_expire_hours: 48,  // Default 48 hours
  notify_before_expiry_hours: 6,  // Warn 6 hours before
  auto_expire_enabled: true
}
```

**Scheduled Job:**
```python
# /app/backend/jobs/auto_expire_listings.py
import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def auto_expire_listings():
    """
    Runs every 15 minutes to expire inactive P2P listings
    """
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME')]
    
    # Get settings
    settings = await db.platform_settings.find_one({"setting_id": "p2p_auto_expire"})
    if not settings or not settings.get("auto_expire_enabled", True):
        return
    
    expire_hours = settings.get("auto_expire_hours", 48)
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=expire_hours)
    
    # Find stale listings
    result = await db.p2p_listings.update_many(
        {
            "status": "active",
            "last_active_at": {"$lt": cutoff_time.isoformat()}
        },
        {
            "$set": {
                "status": "expired",
                "expired_at": datetime.now(timezone.utc).isoformat(),
                "expired_reason": "auto_expire"
            }
        }
    )
    
    print(f"✅ Auto-expired {result.modified_count} listings")
    
    # Send notifications (to be implemented)
    # await notify_sellers_of_expiry(...)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(auto_expire_listings())
```

**Activity Tracking:**
```python
# Update last_active_at whenever:
# - Someone views the listing
# - Someone creates an order from the listing
# - Seller updates the listing

async def track_listing_activity(listing_id: str):
    await db.p2p_listings.update_one(
        {"listing_id": listing_id},
        {"$set": {"last_active_at": datetime.now(timezone.utc).isoformat()}}
    )
```

**API Endpoints:**
```python
# GET /api/p2p/listings/expired/{user_id}
# POST /api/p2p/listings/republish/{listing_id}
```

#### Frontend Implementation:

**Seller Dashboard - Expired Tab:**
```jsx
<Tabs>
  <Tab label="Active" />
  <Tab label="Paused" />
  <Tab label="Expired" />  // NEW
</Tabs>

// Expired listings section
<div className="expired-listings">
  {expiredListings.map(listing => (
    <ListingCard
      listing={listing}
      badge="Expired"
      actions={
        <button onClick={() => republish(listing.id)}>
          Republish
        </button>
      }
    />
  ))}
</div>
```

**Implementation Estimate:** 6-8 hours

---

### 1.2 Daily P2P Volume Leaderboard ⭐ HIGH PRIORITY

**Objective:** Public leaderboard showing top P2P traders by volume and performance.

#### Backend Implementation:

**Aggregation Endpoint:**
```python
# /app/backend/p2p_leaderboard.py

class P2PLeaderboard:
    async def get_leaderboard(
        self, 
        timeframe: str = "7d",  # "24h", "7d", "30d", "all"
        limit: int = 50
    ):
        # Calculate date range
        if timeframe == "24h":
            start_date = datetime.now(timezone.utc) - timedelta(hours=24)
        elif timeframe == "7d":
            start_date = datetime.now(timezone.utc) - timedelta(days=7)
        elif timeframe == "30d":
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        else:
            start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        # Aggregate trades by user
        pipeline = [
            {
                "$match": {
                    "status": "completed",
                    "completed_at": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$seller_id",
                    "total_volume_gbp": {"$sum": "$fiat_amount"},
                    "total_trades": {"$sum": 1},
                    "avg_release_time": {"$avg": "$release_time_seconds"}
                }
            },
            {"$sort": {"total_volume_gbp": -1}},
            {"$limit": limit}
        ]
        
        results = await self.db.p2p_trades.aggregate(pipeline).to_list(limit)
        
        # Enrich with user data
        leaderboard = []
        for idx, result in enumerate(results):
            user = await self.user_service.get_user_by_id(result["_id"])
            if user:
                # Calculate completion rate
                total_orders = await self.db.p2p_trades.count_documents({
                    "seller_id": result["_id"],
                    "created_at": {"$gte": start_date.isoformat()}
                })
                completion_rate = (result["total_trades"] / total_orders * 100) if total_orders > 0 else 0
                
                leaderboard.append({
                    "rank": idx + 1,
                    "user_id": result["_id"],
                    "username": user.get("username") or user.get("full_name", "User"),
                    "country": user.get("country", "Unknown"),
                    "total_volume_gbp": round(result["total_volume_gbp"], 2),
                    "total_trades": result["total_trades"],
                    "completion_rate": round(completion_rate, 2),
                    "avg_release_time_seconds": int(result.get("avg_release_time", 0)),
                    "badges": user.get("badges", [])
                })
        
        return leaderboard
```

**API Endpoint:**
```python
@api_router.get("/p2p/leaderboard")
async def get_p2p_leaderboard(
    timeframe: str = "7d",
    limit: int = 50
):
    service = P2PLeaderboard(db)
    leaderboard = await service.get_leaderboard(timeframe, limit)
    return {
        "success": True,
        "timeframe": timeframe,
        "leaderboard": leaderboard
    }
```

#### Frontend Implementation:

**Public Leaderboard Page:**
```jsx
// /app/frontend/src/pages/P2PLeaderboard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoTrophy, IoMedal, IoPodium } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function P2PLeaderboard() {
  const [timeframe, setTimeframe] = useState('7d');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const loadLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${API}/api/p2p/leaderboard?timeframe=${timeframe}`
      );
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <IoTrophy className="text-yellow-400" />;
    if (rank === 2) return <IoMedal className="text-gray-400" />;
    if (rank === 3) return <IoMedal className="text-orange-400" />;
    return <span className="text-gray-500">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏆 Top P2P Traders
          </h1>
          <p className="text-gray-400">Leading traders ranked by volume and performance</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-3 mb-6 justify-center">
          {['24h', '7d', '30d', 'all'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                timeframe === tf
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-300">Rank</th>
                <th className="px-6 py-4 text-left text-gray-300">Trader</th>
                <th className="px-6 py-4 text-right text-gray-300">Volume (GBP)</th>
                <th className="px-6 py-4 text-right text-gray-300">Trades</th>
                <th className="px-6 py-4 text-right text-gray-300">Success Rate</th>
                <th className="px-6 py-4 text-right text-gray-300">Avg Release</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((trader, idx) => (
                <tr
                  key={trader.user_id}
                  className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(trader.rank)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{trader.username}</span>
                      {trader.badges.map(badge => (
                        <span key={badge} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-green-400 font-medium">
                    £{trader.total_volume_gbp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {trader.total_trades}
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {trader.completion_rate}%
                  </td>
                  <td className="px-6 py-4 text-right text-gray-300">
                    {Math.floor(trader.avg_release_time_seconds / 60)}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Implementation Estimate:** 8-10 hours

---

### 1.3 User Trading Badges ⭐ HIGH PRIORITY

**Objective:** Award performance-based badges to users to incentivize good trading behavior.

#### Badge Definitions:

```javascript
// Badge rules
const BADGE_RULES = {
  fast_seller: {
    name: "Fast Seller ⚡",
    description: "Average release time under 5 minutes",
    icon: "⚡",
    color: "#3B82F6",
    requirements: {
      min_trades: 20,
      max_avg_release_seconds: 300
    }
  },
  trusted_seller: {
    name: "Trusted Seller ✓",
    description: "98%+ completion rate with 50+ trades",
    icon: "✓",
    color: "#10B981",
    requirements: {
      min_trades: 50,
      min_completion_rate: 98.0
    }
  },
  high_volume: {
    name: "High Volume 💎",
    description: "Traded over £10,000",
    icon: "💎",
    color: "#8B5CF6",
    requirements: {
      min_volume_gbp: 10000
    }
  },
  whale: {
    name: "Whale 🐋",
    description: "Traded over £100,000",
    icon: "🐋",
    color: "#EC4899",
    requirements: {
      min_volume_gbp: 100000
    }
  },
  veteran: {
    name: "Veteran 🎖️",
    description: "Completed 500+ trades",
    icon: "🎖️",
    color: "#F59E0B",
    requirements: {
      min_trades: 500
    }
  }
};
```

#### Backend Implementation:

**Badge Calculator:**
```python
# /app/backend/badge_system.py

class BadgeSystem:
    BADGE_RULES = {
        "fast_seller": {
            "min_trades": 20,
            "max_avg_release_seconds": 300
        },
        "trusted_seller": {
            "min_trades": 50,
            "min_completion_rate": 98.0
        },
        "high_volume": {
            "min_volume_gbp": 10000
        },
        "whale": {
            "min_volume_gbp": 100000
        },
        "veteran": {
            "min_trades": 500
        }
    }
    
    async def calculate_user_badges(self, user_id: str) -> list:
        """
        Calculate which badges a user has earned
        """
        # Get user stats
        stats = await self.get_user_stats(user_id)
        
        earned_badges = []
        
        # Check each badge
        for badge_id, rules in self.BADGE_RULES.items():
            if self.check_badge_requirements(stats, rules):
                earned_badges.append(badge_id)
        
        return earned_badges
    
    async def get_user_stats(self, user_id: str) -> dict:
        """
        Get aggregated user trading statistics
        """
        pipeline = [
            {"$match": {"seller_id": user_id}},
            {
                "$group": {
                    "_id": None,
                    "total_trades": {"$sum": 1},
                    "completed_trades": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                    "total_volume": {"$sum": "$fiat_amount"},
                    "avg_release_time": {"$avg": "$release_time_seconds"}
                }
            }
        ]
        
        result = await self.db.p2p_trades.aggregate(pipeline).to_list(1)
        
        if not result:
            return {
                "total_trades": 0,
                "completed_trades": 0,
                "total_volume": 0,
                "avg_release_time": 0,
                "completion_rate": 0
            }
        
        stats = result[0]
        stats["completion_rate"] = (
            (stats["completed_trades"] / stats["total_trades"] * 100)
            if stats["total_trades"] > 0 else 0
        )
        
        return stats
    
    def check_badge_requirements(self, stats: dict, rules: dict) -> bool:
        """
        Check if user meets badge requirements
        """
        if "min_trades" in rules and stats["total_trades"] < rules["min_trades"]:
            return False
        
        if "max_avg_release_seconds" in rules and stats["avg_release_time"] > rules["max_avg_release_seconds"]:
            return False
        
        if "min_completion_rate" in rules and stats["completion_rate"] < rules["min_completion_rate"]:
            return False
        
        if "min_volume_gbp" in rules and stats["total_volume"] < rules["min_volume_gbp"]:
            return False
        
        return True
    
    async def recalculate_all_badges(self):
        """
        Scheduled job to recalculate badges for all active users
        """
        users = await self.db.user_accounts.find(
            {"kyc_verified": True},
            {"user_id": 1}
        ).to_list(None)
        
        updated = 0
        for user in users:
            user_id = user["user_id"]
            badges = await self.calculate_user_badges(user_id)
            
            await self.user_service.update_user(user_id, {"badges": badges})
            updated += 1
        
        print(f"✅ Recalculated badges for {updated} users")
```

**Scheduled Job:**
```python
# /app/backend/jobs/recalculate_badges.py
# Run daily at 2 AM

import asyncio
from badge_system import BadgeSystem

async def main():
    badge_system = BadgeSystem(db)
    await badge_system.recalculate_all_badges()

if __name__ == "__main__":
    asyncio.run(main())
```

#### Frontend Implementation:

**Badge Component:**
```jsx
// /app/frontend/src/components/BadgeIcon.js

const BADGE_CONFIG = {
  fast_seller: { icon: '⚡', color: '#3B82F6', label: 'Fast Seller' },
  trusted_seller: { icon: '✓', color: '#10B981', label: 'Trusted' },
  high_volume: { icon: '💎', color: '#8B5CF6', label: 'High Volume' },
  whale: { icon: '🐋', color: '#EC4899', label: 'Whale' },
  veteran: { icon: '🎖️', color: '#F59E0B', label: 'Veteran' }
};

export function BadgeIcon({ badge, size = 'sm' }) {
  const config = BADGE_CONFIG[badge];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-${size}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
      title={config.label}
    >
      {config.icon}
    </span>
  );
}

export function BadgeList({ badges }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map(badge => <BadgeIcon key={badge} badge={badge} />)}
    </div>
  );
}
```

**Implementation Estimate:** 6-8 hours

---

### 1.4 Automatic Receipts for Completed Orders ⭐ MEDIUM PRIORITY

**Objective:** Generate receipts for all completed P2P orders (and later swaps/instant buys).

#### Backend Implementation:

**Receipt Generator:**
```python
# /app/backend/receipt_system.py

class ReceiptSystem:
    async def generate_receipt(self, order_id: str, order_type: str = "p2p") -> dict:
        """
        Generate receipt for completed order
        """
        if order_type == "p2p":
            order = await self.db.p2p_trades.find_one({"trade_id": order_id})
            collection = "p2p_receipts"
        elif order_type == "swap":
            order = await self.db.swap_transactions.find_one({"transaction_id": order_id})
            collection = "swap_receipts"
        else:
            order = await self.db.admin_liquidity_transactions.find_one({"transaction_id": order_id})
            collection = "instant_receipts"
        
        if not order:
            raise ValueError("Order not found")
        
        # Get user details
        buyer = await self.user_service.get_user_by_id(order.get("buyer_id"))
        seller = await self.user_service.get_user_by_id(order.get("seller_id"))
        
        # Create receipt
        receipt = {
            "receipt_id": str(uuid.uuid4()),
            "order_id": order_id,
            "order_type": order_type,
            "buyer_id": order.get("buyer_id"),
            "buyer_name": buyer.get("username") or buyer.get("full_name"),
            "seller_id": order.get("seller_id"),
            "seller_name": seller.get("username") or seller.get("full_name"),
            "crypto_currency": order.get("crypto_currency"),
            "crypto_amount": order.get("crypto_amount"),
            "fiat_currency": order.get("fiat_currency", "GBP"),
            "fiat_amount": order.get("fiat_amount"),
            "price_per_unit": order.get("price_per_unit"),
            "payment_method": order.get("payment_method"),
            "platform_fee": order.get("platform_fee", 0),
            "net_amount": order.get("net_amount"),
            "completed_at": order.get("completed_at"),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store receipt
        await self.db[collection].insert_one(receipt)
        
        return receipt
```

**API Endpoints:**
```python
# GET /api/receipts/{user_id}
# GET /api/receipts/order/{order_id}
# GET /api/receipts/download/{receipt_id}  # Future: PDF
```

#### Frontend Implementation:

**Receipts Page:**
```jsx
// /app/frontend/src/pages/Receipts.js

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // List view
  return (
    <div className="receipts-page">
      <h1>Order Receipts</h1>
      <div className="receipt-list">
        {receipts.map(receipt => (
          <ReceiptCard
            key={receipt.receipt_id}
            receipt={receipt}
            onClick={() => setSelectedReceipt(receipt)}
          />
        ))}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
```

**Implementation Estimate:** 6-8 hours

---

## Priority 2: Fraud/Risk/Admin Control

### 2.1 Admin Fraud Rules and Risk Flags ⭐ HIGH PRIORITY

**Objective:** Monitor and flag risky user behavior for admin review.

#### Backend Implementation:

**Risk Detection Rules:**
```python
# /app/backend/fraud_detection.py

class FraudDetection:
    RISK_RULES = {
        "high_cancellation_rate": {
            "threshold": 30.0,  # 30% cancellation rate
            "min_orders": 10
        },
        "multiple_disputes": {
            "threshold": 3,  # 3+ disputes
            "timeframe_days": 30
        },
        "duplicate_bank_details": {
            "check": True
        },
        "same_ip_multiple_accounts": {
            "threshold": 3,  # 3+ accounts from same IP
            "timeframe_days": 7
        },
        "rapid_account_switching": {
            "threshold": 5,  # 5+ logins from different accounts in short time
            "timeframe_hours": 1
        }
    }
    
    async def check_user_risk(self, user_id: str) -> dict:
        """
        Check if user meets any risk criteria
        """
        risk_flags = []
        
        # Check cancellation rate
        cancellation_rate = await self.get_cancellation_rate(user_id)
        if cancellation_rate > self.RISK_RULES["high_cancellation_rate"]["threshold"]:
            risk_flags.append({
                "type": "high_cancellation_rate",
                "severity": "medium",
                "value": cancellation_rate,
                "message": f"Cancellation rate: {cancellation_rate:.1f}%"
            })
        
        # Check disputes
        recent_disputes = await self.get_recent_disputes(user_id)
        if recent_disputes >= self.RISK_RULES["multiple_disputes"]["threshold"]:
            risk_flags.append({
                "type": "multiple_disputes",
                "severity": "high",
                "value": recent_disputes,
                "message": f"{recent_disputes} disputes in last 30 days"
            })
        
        # Check duplicate bank details
        duplicate_accounts = await self.check_duplicate_bank_details(user_id)
        if duplicate_accounts:
            risk_flags.append({
                "type": "duplicate_bank_details",
                "severity": "high",
                "value": len(duplicate_accounts),
                "message": f"Same bank details as {len(duplicate_accounts)} other accounts",
                "related_accounts": duplicate_accounts
            })
        
        # Store risk flags
        if risk_flags:
            await self.db.user_accounts.update_one(
                {"user_id": user_id},
                {"$set": {
                    "risk_flags": risk_flags,
                    "risk_checked_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {
            "user_id": user_id,
            "has_risks": len(risk_flags) > 0,
            "risk_count": len(risk_flags),
            "flags": risk_flags
        }
```

**API Endpoints:**
```python
# GET /api/admin/fraud/flagged-users
# GET /api/admin/fraud/user/{user_id}
# POST /api/admin/fraud/review
# POST /api/admin/fraud/block-user
```

#### Frontend Implementation:

**Admin Fraud Dashboard:**
```jsx
// /app/frontend/src/pages/admin/FraudDashboard.js

export default function FraudDashboard() {
  const [flaggedUsers, setFlaggedUsers] = useState([]);

  return (
    <div className="fraud-dashboard">
      <h1>Risk & Fraud Monitoring</h1>
      
      <div className="flagged-users-list">
        {flaggedUsers.map(user => (
          <UserRiskCard
            key={user.user_id}
            user={user}
            flags={user.risk_flags}
            onReview={() => handleReview(user.user_id)}
            onBlock={() => handleBlock(user.user_id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Implementation Estimate:** 10-12 hours

---

## Priority 3: Price Alerts UI

### 3.1 In-App Price Alerts ⭐ MEDIUM PRIORITY

**Objective:** Allow users to set and manage price alerts from within the platform.

#### Backend Implementation:

**API Endpoints (if not existing):**
```python
# POST /api/alerts/create
# GET /api/alerts/{user_id}
# PUT /api/alerts/{alert_id}/toggle
# DELETE /api/alerts/{alert_id}
```

#### Frontend Implementation:

**Price Alerts Page:**
```jsx
// /app/frontend/src/pages/PriceAlerts.js

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="price-alerts-page">
      <h1>Price Alerts</h1>
      
      <button onClick={() => setShowCreate(true)}>
        + New Alert
      </button>

      <div className="alerts-list">
        {alerts.map(alert => (
          <AlertCard
            key={alert.alert_id}
            alert={alert}
            onToggle={() => toggleAlert(alert.alert_id)}
            onDelete={() => deleteAlert(alert.alert_id)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onCreate={(alert) => createAlert(alert)}
        />
      )}
    </div>
  );
}
```

**Implementation Estimate:** 4-6 hours

---

## Priority 4: Advanced/Optional Features

### 4.1 Multi-Language Support Structure
### 4.2 Custom Themes / Colour Modes
### 4.3 Webhooks for External Partners
### 4.4 Marketplace Boost / Promote System

**These are documented but marked as Phase 2 implementation.**

---

## Implementation Timeline

### Phase 1 (Week 1-2): P2P Core Features
- Auto-expire listings (Day 1-2)
- Trading badges (Day 3-4)
- Leaderboard (Day 5-6)
- Receipts (Day 7-8)

### Phase 2 (Week 3): Fraud & Admin
- Fraud detection rules (Day 1-3)
- Admin fraud dashboard (Day 4-5)

### Phase 3 (Week 4): Alerts & Polish
- Price alerts UI (Day 1-2)
- Testing & bug fixes (Day 3-5)

### Phase 4 (Future): Advanced Features
- Multi-language structure
- Theme customization
- Webhooks
- Boost system

---

## Technical Considerations

### Scheduled Jobs:
- Need cron or background task runner
- Suggested: Use Python `schedule` library or system cron
- Jobs: Auto-expire (15 min), Badge recalc (daily), Fraud check (hourly)

### Performance:
- Leaderboard aggregation can be heavy → Cache results (15 min TTL)
- Badge recalculation → Run off-peak hours
- Receipt generation → Async/background task

### Database Indexes:
```javascript
// Required indexes
db.p2p_listings.createIndex({"last_active_at": 1, "status": 1})
db.p2p_trades.createIndex({"seller_id": 1, "status": 1})
db.p2p_trades.createIndex({"completed_at": 1})
db.user_accounts.createIndex({"risk_flags": 1})
```

---

## Testing Strategy

### Unit Tests:
- Badge calculation logic
- Risk detection rules
- Receipt generation

### Integration Tests:
- Auto-expire job
- Leaderboard aggregation
- Fraud detection pipeline

### Manual Testing:
- UI responsiveness
- Badge display across pages
- Receipt download
- Admin fraud workflow

---

**End of Specification Document**

**Status:** Ready for implementation prioritization and development kickoff.
