"""Monetization System for Coin Hub X

This module handles all monetization features including:
- Fee configurations
- Seller levels and verification
- Boosted listings
- Payment method fees
- Referral tier upgrades
- Arbitrage alerts subscriptions
- OTC desk
- Internal transfer fees
- Dispute penalties
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
import uuid

# Default Monetization Settings
DEFAULT_MONETIZATION_SETTINGS = {
    "setting_id": "default_monetization",
    
    # OFFICIAL COINHUBX FEE STRUCTURE (17 REVENUE STREAMS)
    # TRADING & WALLET FEES
    "instant_buy_fee_percent": 1.5,
    "instant_sell_fee_percent": 1.0,
    "crypto_swap_fee_percent": 2.5,
    "p2p_express_fee_percent": 1.5,
    "p2p_trade_fee_percent": 1.0,
    "crypto_withdrawal_fee_percent": 1.0,
    "crypto_deposit_fee_percent": 0.0,  # FREE
    
    # PAYMENT FEES
    "paypal_to_paypal_fee_percent": 3.0,
    
    # SAVINGS / STAKING / INTERNAL OPS
    "early_withdrawal_penalty_percent": 4.0,
    "staking_admin_fee_percent": 10.0,
    "admin_liquidity_spread_percent": 0.25,
    "cross_wallet_conversion_fee_percent": 1.0,
    "internal_transfer_fee_percent": 0.0,  # FREE
    
    # SERVICE / PLATFORM MONETIZATION (flat GBP)
    "priority_support_fee_gbp": 2.99,
    "p2p_advert_promotion_fee_gbp": 20.0,
    
    # REFERRALS (payout, NOT a fee)
    "referral_commission_percent": 20.0,
    
    # DISPUTE HANDLING (flat GBP)
    "p2p_dispute_fee_gbp": 1.50,
    
    # Payment Method Fees (in percent, added to transaction)
    "payment_method_fees": {
        "paypal": 2.0,  # +2%
        "cashapp": 1.0,  # +1%
        "cash_app": 1.0,  # Alias
        "revolut": 0.5,  # +0.5%
        "bank_transfer": 0.0,  # 0%
        "faster_payments": 0.0,
        "sepa": 0.0,
        "wise": 0.0
    },
    
    # Boosted Listings (in GBP)
    "boost_1h_price": 10.0,  # £10 for 1 hour boost
    "boost_6h_price": 20.0,  # £20 for 6 hours boost
    "boost_24h_price": 50.0,  # £50 for 24 hours boost
    
    # Seller Features (in GBP)
    "seller_verification_price": 25.0,  # £25 for verification badge
    "seller_silver_upgrade_price": 20.0,  # £20 for Silver level
    "seller_gold_upgrade_price": 50.0,  # £50 for Gold level
    
    # Seller Level Fee Reductions (in percent off the standard P2P fee)
    "silver_fee_reduction_percent": 0.5,  # Silver pays 2.5% instead of 3%
    "gold_fee_reduction_percent": 1.0,  # Gold pays 2% instead of 3%
    
    # Referral Tier Upgrades (in GBP)
    "referral_tier_30_percent_price": 20.0,  # £20 to upgrade to 30% commission
    "referral_tier_40_percent_price": 40.0,  # £40 to upgrade to 40% commission
    
    # Arbitrage Alerts Subscription (in GBP per month)
    "arbitrage_alerts_monthly_price": 10.0,  # £10/month
    
    # Other Fees
    "internal_transfer_fee_percent": 0.3,  # 0.3% - Internal wallet transfer fee
    "dispute_penalty_gbp": 10.0,  # £10 - Penalty for losing dispute
    
    # OTC Desk
    "otc_fee_percent": 1.0,  # 1% - OTC trading fee
    "otc_minimum_amount_gbp": 2000.0,  # £2,000 minimum for OTC
    
    # Metadata
    "updated_at": datetime.now(timezone.utc).isoformat(),
    "updated_by": "system"
}

# Models
class MonetizationSettings(BaseModel):
    setting_id: str = "default_monetization"
    
    # Trading Fees
    buyer_express_fee_percent: float = 1.0
    instant_sell_fee_percent: float = 1.0
    admin_sell_spread_percent: float = 3.0
    admin_buy_spread_percent: float = -2.5
    p2p_seller_fee_percent: float = 3.0
    
    # Payment Method Fees
    payment_method_fees: Dict[str, float] = Field(default_factory=dict)
    
    # Boosted Listings
    boost_1h_price: float = 10.0
    boost_6h_price: float = 20.0
    boost_24h_price: float = 50.0
    
    # Seller Features
    seller_verification_price: float = 25.0
    seller_silver_upgrade_price: float = 20.0
    seller_gold_upgrade_price: float = 50.0
    silver_fee_reduction_percent: float = 0.5
    gold_fee_reduction_percent: float = 1.0
    
    # Referral Tier Upgrades
    referral_tier_30_percent_price: float = 20.0
    referral_tier_40_percent_price: float = 40.0
    
    # Arbitrage Alerts
    arbitrage_alerts_monthly_price: float = 10.0
    
    # Other Fees
    internal_transfer_fee_percent: float = 0.3
    dispute_penalty_gbp: float = 10.0
    
    # OTC Desk
    otc_fee_percent: float = 1.0
    otc_minimum_amount_gbp: float = 2000.0
    
    # Metadata
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: str = "system"

class BoostListingRequest(BaseModel):
    user_id: str
    listing_id: str
    duration_hours: int  # 1, 6, or 24

class VerifySellerRequest(BaseModel):
    user_id: str

class UpgradeSellerLevelRequest(BaseModel):
    user_id: str
    target_level: str  # "silver" or "gold"

class UpgradeReferralTierRequest(BaseModel):
    user_id: str
    target_commission_percent: float  # 30 or 40

class SubscribeAlertsRequest(BaseModel):
    user_id: str
    notification_channels: List[str] = ["email", "telegram", "in_app"]

class InternalTransferRequest(BaseModel):
    from_user_id: str
    to_user_id: str
    currency: str
    amount: float

class ApplyDisputePenaltyRequest(BaseModel):
    user_id: str
    dispute_id: str
    reason: str

class CreateOTCQuoteRequest(BaseModel):
    user_id: str
    crypto_currency: str
    fiat_currency: str
    amount_gbp: float
    trade_type: str  # "buy" or "sell"
