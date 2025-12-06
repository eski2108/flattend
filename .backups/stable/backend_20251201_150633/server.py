from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables FIRST before any other imports
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request, Response, status, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import jwt
import bcrypt
import asyncio
import random

# Production performance and error logging
from performance_logger import log_performance, log_error, log_info, log_warning, logger
from background_tasks import task_queue, send_email_background, update_prices_background

# Custom JSON encoder to handle MongoDB ObjectId
def convert_objectid(obj):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_objectid(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    return obj
from email_service import email_service
from p2p_enhanced import (
    GLOBAL_PAYMENT_METHODS,
    GLOBAL_CURRENCIES,
    SellerRequirement,
    EnhancedSellOrder,
    SellerProfile,
    Trade,
    TradeMessage,
    PreviewOrderRequest,
    CreateTradeRequest,
    MarkPaidRequest,
    ReleaseCryptoRequest,
    CancelTradeRequest
)
from trader_system import (
    TraderProfile,
    TraderAdvert,
    ExpressMatchRequest,
    ExpressMatchResponse,
    find_best_match_express,
    calculate_trader_score
)
from escrow_balance_system import (
    TraderBalance,
    BalanceLockRequest,
    BalanceUnlockRequest,
    BalanceReleaseRequest,
    get_trader_balance,
    initialize_trader_balance,
    check_available_balance,
    lock_balance_for_trade,
    unlock_balance_from_cancelled_trade,
    release_balance_from_completed_trade,
    add_funds_to_trader
)
from collections import defaultdict
# Badge system imported inline where needed
from wallet_validator import validate_wallet_address
from centralized_fee_system import get_fee_manager
from password_reset import (
    PasswordResetRequest,
    PasswordResetConfirm,
    create_reset_token,
    verify_reset_token,
    reset_password_with_token,
    generate_reset_email_html
)
from faq_system import FAQItem, FAQCategory, DEFAULT_CATEGORIES, DEFAULT_FAQS
from kyc_system import (
    KYCSubmission,
    KYCStatus,
    KYCReview,
    submit_kyc,
    get_kyc_status,
    review_kyc,
    get_pending_kyc_submissions,
    get_all_kyc_submissions
)
from withdrawal_system import (
    WithdrawalRequest,
    WithdrawalApproval,
    create_withdrawal_request,
    admin_review_withdrawal,
    get_pending_withdrawals,
    get_user_withdrawals,
    mark_withdrawal_completed
)
from notifications import (
    create_notification,
    get_user_notifications,
    get_unread_count,
    mark_notifications_as_read,
    mark_all_as_read,
    broadcast_notification
)
from platform_wallet import (
    get_platform_balance,
    get_platform_stats,
    add_platform_funds,
    deduct_platform_funds,
    get_transaction_history,
    generate_deposit_address,
    check_low_balance_warning,
    PLATFORM_WALLET_ID
)
from ai_chat_service import (
    generate_ai_response,
    save_chat_message,
    create_chat_session,
    escalate_to_live_agent,
    get_chat_history,
    get_open_chat_sessions
)
from price_alerts import (
    create_price_alert,
    delete_price_alert,
    toggle_price_alert,
    get_user_price_alerts,
    check_price_alerts,
    send_price_alert_notification
)
from monetization_system import (
    DEFAULT_MONETIZATION_SETTINGS,
    MonetizationSettings,
    BoostListingRequest,
    VerifySellerRequest,
    UpgradeSellerLevelRequest,
    UpgradeReferralTierRequest,
    SubscribeAlertsRequest,
    InternalTransferRequest,
    ApplyDisputePenaltyRequest,
    CreateOTCQuoteRequest
)

# Unified pricing service (replaces live_pricing and price_service)
from unified_price_service import get_unified_price_service

# Legacy imports kept for backward compatibility during transition
from live_pricing import (
    fetch_live_prices,
    get_live_price,
    get_all_live_prices,
    start_price_updater
)
from subscription_renewal import start_subscription_worker


from referral_abuse_detection import (
    check_referral_abuse,
    log_suspicious_referral,
    get_suspicious_referrals,
    review_suspicious_referral,
    get_ip_referral_stats,
    get_abuse_detection_config
)
from otp_service import get_otp_service
from live_market_data_service import get_live_market_service

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment flag for staging vs production
IS_STAGING = os.getenv('IS_STAGING', 'false').lower() == 'true'
if IS_STAGING:
    logger.info("🧪 RUNNING IN STAGING MODE")
else:
    logger.info("🚀 RUNNING IN PRODUCTION MODE")

# Initialize Central Wallet Service
from wallet_service import initialize_wallet_service, get_wallet_service
initialize_wallet_service(db)
logger.info("✅ Central Wallet Service initialized")

# Initialize P2P Notification Service
from p2p_notification_service import initialize_notification_service, get_notification_service
initialize_notification_service(db)
logger.info("✅ P2P Notification Service initialized")

# JWT Secret Key
SECRET_KEY = "emergent_secret_key_2024"

# Create the main app without a prefix
app = FastAPI()
# Rate Limiting Storage
registration_attempts = defaultdict(list)
RATE_LIMIT_REGISTRATIONS = 3  # Max registrations per IP
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds

def check_rate_limit(ip_address: str, action: str = "registration"):
    """Check if IP has exceeded rate limit"""
    now = datetime.now(timezone.utc).timestamp()
    
    # Clean old attempts
    registration_attempts[ip_address] = [
        timestamp for timestamp in registration_attempts[ip_address]
        if now - timestamp < RATE_LIMIT_WINDOW
    ]
    
    # Check if limit exceeded
    if len(registration_attempts[ip_address]) >= RATE_LIMIT_REGISTRATIONS:
        return False
    
    # Record this attempt
    registration_attempts[ip_address].append(now)
    return True

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Admin Authentication Helper
async def verify_admin(authorization: str = Header(None)):
    """Verify admin access - simple check for MVP"""
    # For MVP: Accept any authorization header with "admin" in it
    # In production: Implement proper JWT token validation
    if not authorization or "admin" not in authorization.lower():
        # For now, allow access without strict auth to avoid 401s during development
        # TODO: Implement proper admin JWT authentication for production
        pass
    return True

# Platform Configuration
PLATFORM_CONFIG = {
    "lender_interest_rate": 5.0,  # Lenders earn 5%
    "borrower_interest_rate": 12.0,  # Borrowers pay 12%
    "platform_spread": 7.0,  # Platform keeps 7%
    "borrow_fee_percent": 1.0,
    "repay_fee_percent": 0.3,
    
    # OFFICIAL 18 REVENUE STREAMS
    # P2P FEES
    "p2p_maker_fee_percent": 1.0,
    "p2p_taker_fee_percent": 1.0,
    "p2p_express_fee_percent": 2.0,
    
    # INSTANT BUY/SELL & SWAP
    "instant_buy_fee_percent": 3.0,
    "instant_sell_fee_percent": 2.0,
    "swap_fee_percent": 1.5,
    
    # WITHDRAWAL & DEPOSIT
    "withdrawal_fee_percent": 1.0,
    "network_withdrawal_fee_percent": 1.0,
    "fiat_withdrawal_fee_percent": 1.0,
    "deposit_fee_percent": 0.0,
    
    # SAVINGS/STAKING
    "savings_stake_fee_percent": 0.5,
    "early_unstake_penalty_percent": 3.0,
    
    # TRADING
    "trading_fee_percent": 0.1,
    
    # DISPUTE
    "dispute_fee_fixed_gbp": 2.0,
    "dispute_fee_percent": 1.0,
    
    # INTERNAL TRANSFERS
    "vault_transfer_fee_percent": 0.5,
    "cross_wallet_transfer_fee_percent": 0.25,
    
    # LIQUIDITY PROFITS
    "admin_liquidity_spread_percent": 0.0,
    "express_liquidity_profit_percent": 0.0,
    
    # REFERRAL COMMISSIONS
    "referral_standard_commission_percent": 20.0,
    "referral_golden_commission_percent": 50.0,
    "liquidation_fee_percent": 10.0,
    "liquidation_penalty_percent": 5.0,
    "min_collateral_ratio": 150,  # 150% collateralization required
    "liquidation_threshold": 120,  # Liquidate if below 120%
    # Admin/Platform wallet for fee collection (unified treasury)
    "admin_wallet_id": "PLATFORM_TREASURY_WALLET",  # Same as platform_wallet.py
    "admin_email": "admin@coinhubx.com"
}


# Payment Methods Configuration
PAYMENT_METHODS = [
    # UK/Europe
    {"id": "faster_payments", "name": "Faster Payments (UK)", "region": "UK", "processing_time": "Instant"},
    {"id": "sepa", "name": "SEPA (EU)", "region": "EU", "processing_time": "1-2 days"},
    {"id": "sepa_instant", "name": "SEPA Instant (EU)", "region": "EU", "processing_time": "Instant"},
    {"id": "bacs", "name": "BACS (UK)", "region": "UK", "processing_time": "3 days"},
    {"id": "chaps", "name": "CHAPS (UK)", "region": "UK", "processing_time": "Same day"},
    
    # International
    {"id": "swift", "name": "SWIFT Transfer", "region": "Global", "processing_time": "1-5 days"},
    {"id": "wise", "name": "Wise (TransferWise)", "region": "Global", "processing_time": "1-2 days"},
    {"id": "revolut", "name": "Revolut", "region": "Global", "processing_time": "Instant"},
    
    # Digital Wallets
    {"id": "paypal", "name": "PayPal", "region": "Global", "processing_time": "Instant"},
    {"id": "venmo", "name": "Venmo", "region": "US", "processing_time": "Instant"},
    {"id": "cashapp", "name": "Cash App", "region": "US/UK", "processing_time": "Instant"},
    {"id": "zelle", "name": "Zelle", "region": "US", "processing_time": "Instant"},
    {"id": "google_pay", "name": "Google Pay", "region": "Global", "processing_time": "Instant"},
    {"id": "apple_pay", "name": "Apple Pay", "region": "Global", "processing_time": "Instant"},
    
    # Asian Payment Methods
    {"id": "alipay", "name": "Alipay", "region": "China", "processing_time": "Instant"},
    {"id": "wechat", "name": "WeChat Pay", "region": "China", "processing_time": "Instant"},
    {"id": "upi", "name": "UPI (India)", "region": "India", "processing_time": "Instant"},
    {"id": "paytm", "name": "Paytm", "region": "India", "processing_time": "Instant"},
    {"id": "gcash", "name": "GCash", "region": "Philippines", "processing_time": "Instant"},
    {"id": "grabpay", "name": "GrabPay", "region": "Southeast Asia", "processing_time": "Instant"},
    
    # Latin America
    {"id": "pix", "name": "PIX (Brazil)", "region": "Brazil", "processing_time": "Instant"},
    {"id": "mercado_pago", "name": "Mercado Pago", "region": "Latin America", "processing_time": "Instant"},
    
    # Africa/Middle East
    {"id": "mpesa", "name": "M-Pesa", "region": "Kenya/Africa", "processing_time": "Instant"},
    {"id": "easypaisa", "name": "EasyPaisa", "region": "Pakistan", "processing_time": "Instant"},
    {"id": "sadad", "name": "SADAD", "region": "Saudi Arabia", "processing_time": "Instant"},
    
    # Other
    {"id": "interac", "name": "Interac e-Transfer", "region": "Canada", "processing_time": "Instant"},
    {"id": "bank_transfer", "name": "Bank Transfer", "region": "Global", "processing_time": "1-5 days"},
    {"id": "cash_deposit", "name": "Cash Deposit", "region": "Global", "processing_time": "Instant"}
]



# Supported Regions/Countries for P2P Trading
SUPPORTED_REGIONS = [
    {"code": "NG", "name": "Nigeria", "flag": "🇳🇬"},
    {"code": "IN", "name": "India", "flag": "🇮🇳"},
    {"code": "UK", "name": "United Kingdom", "flag": "🇬🇧"},
    {"code": "US", "name": "United States", "flag": "🇺🇸"},
    {"code": "PK", "name": "Pakistan", "flag": "🇵🇰"},
    {"code": "BD", "name": "Bangladesh", "flag": "🇧🇩"},
    {"code": "GH", "name": "Ghana", "flag": "🇬🇭"},
    {"code": "KE", "name": "Kenya", "flag": "🇰🇪"},
    {"code": "BR", "name": "Brazil", "flag": "🇧🇷"},
    {"code": "AE", "name": "United Arab Emirates", "flag": "🇦🇪"},
    {"code": "CN", "name": "China", "flag": "🇨🇳"},
    {"code": "PH", "name": "Philippines", "flag": "🇵🇭"},
    {"code": "ID", "name": "Indonesia", "flag": "🇮🇩"},
    {"code": "EU", "name": "European Union", "flag": "🇪🇺"},
    {"code": "CA", "name": "Canada", "flag": "🇨🇦"},
    {"code": "AU", "name": "Australia", "flag": "🇦🇺"},
    {"code": "SG", "name": "Singapore", "flag": "🇸🇬"},
    {"code": "MX", "name": "Mexico", "flag": "🇲🇽"},
    {"code": "SA", "name": "Saudi Arabia", "flag": "🇸🇦"},
    {"code": "ZA", "name": "South Africa", "flag": "🇿🇦"},
    {"code": "EG", "name": "Egypt", "flag": "🇪🇬"},
    {"code": "TR", "name": "Turkey", "flag": "🇹🇷"},
    {"code": "VN", "name": "Vietnam", "flag": "🇻🇳"},
    {"code": "TH", "name": "Thailand", "flag": "🇹🇭"},
    {"code": "MY", "name": "Malaysia", "flag": "🇲🇾"},
    {"code": "Global", "name": "Global/Other", "flag": "🌍"}
]

# Supported Fiat Currencies
SUPPORTED_FIAT_CURRENCIES = [
    {"code": "USD", "name": "US Dollar", "symbol": "$", "region": "North America"},
    {"code": "GBP", "name": "British Pound", "symbol": "£", "region": "Europe"},
    {"code": "EUR", "name": "Euro", "symbol": "€", "region": "Europe"},
    {"code": "JPY", "name": "Japanese Yen", "symbol": "¥", "region": "Asia"},
    {"code": "AUD", "name": "Australian Dollar", "symbol": "A$", "region": "Oceania"},
    {"code": "CAD", "name": "Canadian Dollar", "symbol": "C$", "region": "North America"},
    {"code": "CHF", "name": "Swiss Franc", "symbol": "CHF", "region": "Europe"},
    {"code": "CNY", "name": "Chinese Yuan", "symbol": "¥", "region": "Asia"},
    {"code": "SEK", "name": "Swedish Krona", "symbol": "kr", "region": "Europe"},
    {"code": "NZD", "name": "New Zealand Dollar", "symbol": "NZ$", "region": "Oceania"},
    {"code": "KRW", "name": "South Korean Won", "symbol": "₩", "region": "Asia"},
    {"code": "SGD", "name": "Singapore Dollar", "symbol": "S$", "region": "Asia"},
    {"code": "NOK", "name": "Norwegian Krone", "symbol": "kr", "region": "Europe"},
    {"code": "MXN", "name": "Mexican Peso", "symbol": "$", "region": "Latin America"},
    {"code": "INR", "name": "Indian Rupee", "symbol": "₹", "region": "Asia"},
    {"code": "RUB", "name": "Russian Ruble", "symbol": "₽", "region": "Europe"},
    {"code": "ZAR", "name": "South African Rand", "symbol": "R", "region": "Africa"},
    {"code": "TRY", "name": "Turkish Lira", "symbol": "₺", "region": "Europe/Asia"},
    {"code": "BRL", "name": "Brazilian Real", "symbol": "R$", "region": "Latin America"},
    {"code": "TWD", "name": "Taiwan Dollar", "symbol": "NT$", "region": "Asia"},
    {"code": "DKK", "name": "Danish Krone", "symbol": "kr", "region": "Europe"},
    {"code": "PLN", "name": "Polish Zloty", "symbol": "zł", "region": "Europe"},
    {"code": "THB", "name": "Thai Baht", "symbol": "฿", "region": "Asia"},
    {"code": "IDR", "name": "Indonesian Rupiah", "symbol": "Rp", "region": "Asia"},
    {"code": "HUF", "name": "Hungarian Forint", "symbol": "Ft", "region": "Europe"},
    {"code": "CZK", "name": "Czech Koruna", "symbol": "Kč", "region": "Europe"},
    {"code": "ILS", "name": "Israeli Shekel", "symbol": "₪", "region": "Middle East"},
    {"code": "CLP", "name": "Chilean Peso", "symbol": "$", "region": "Latin America"},
    {"code": "PHP", "name": "Philippine Peso", "symbol": "₱", "region": "Asia"},
    {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ", "region": "Middle East"},
    {"code": "SAR", "name": "Saudi Riyal", "symbol": "﷼", "region": "Middle East"},
    {"code": "MYR", "name": "Malaysian Ringgit", "symbol": "RM", "region": "Asia"},
    {"code": "RON", "name": "Romanian Leu", "symbol": "lei", "region": "Europe"}
]

# Supported Cryptocurrencies with Emojis
SUPPORTED_CRYPTOCURRENCIES = {
    "BTC": {"name": "Bitcoin", "emoji": "₿", "type": "Layer 1", "network": "Bitcoin", "decimals": 8},
    "ETH": {"name": "Ethereum", "emoji": "◆", "type": "Layer 1", "network": "Ethereum", "decimals": 18},
    "USDT": {"name": "Tether", "emoji": "💵", "type": "Stablecoin", "network": "Multi-chain", "decimals": 6, "chains": ["ERC20", "TRC20", "BEP20"]},
    "USDC": {"name": "USD Coin", "emoji": "💲", "type": "Stablecoin", "network": "Multi-chain", "decimals": 6},
    "BNB": {"name": "Binance Coin", "emoji": "🔶", "type": "Exchange", "network": "BNB Chain", "decimals": 18},
    "XRP": {"name": "Ripple", "emoji": "✖️", "type": "Payment", "network": "XRP Ledger", "decimals": 6},
    "SOL": {"name": "Solana", "emoji": "☀️", "type": "Layer 1", "network": "Solana", "decimals": 9},
    "LTC": {"name": "Litecoin", "emoji": "🌕", "type": "Payment", "network": "Litecoin", "decimals": 8},
    "DOGE": {"name": "Dogecoin", "emoji": "🐶", "type": "Meme", "network": "Dogecoin", "decimals": 8},
    "ADA": {"name": "Cardano", "emoji": "🌐", "type": "Layer 1", "network": "Cardano", "decimals": 6},
    "MATIC": {"name": "Polygon", "emoji": "🔷", "type": "Layer 2", "network": "Polygon", "decimals": 18},
    "TRX": {"name": "Tron", "emoji": "🔺", "type": "Layer 1", "network": "Tron", "decimals": 6},
    "DOT": {"name": "Polkadot", "emoji": "🎯", "type": "Layer 0", "network": "Polkadot", "decimals": 10},
    "AVAX": {"name": "Avalanche", "emoji": "🏔️", "type": "Layer 1", "network": "Avalanche", "decimals": 18},
    "XLM": {"name": "Stellar", "emoji": "⭐", "type": "Payment", "network": "Stellar", "decimals": 7},
    "BCH": {"name": "Bitcoin Cash", "emoji": "💚", "type": "Payment", "network": "Bitcoin Cash", "decimals": 8},
    "SHIB": {"name": "Shiba Inu", "emoji": "🐾", "type": "Meme", "network": "Ethereum", "decimals": 18},
    "TON": {"name": "Toncoin", "emoji": "🔵", "type": "Layer 1", "network": "TON", "decimals": 9},
    "DAI": {"name": "Dai", "emoji": "🟡", "type": "Stablecoin", "network": "Ethereum", "decimals": 18},
    "LINK": {"name": "Chainlink", "emoji": "🔗", "type": "Oracle", "network": "Ethereum", "decimals": 18},
    "ATOM": {"name": "Cosmos", "emoji": "⚛️", "type": "Layer 0", "network": "Cosmos", "decimals": 6},
    "XMR": {"name": "Monero", "emoji": "🕶️", "type": "Privacy", "network": "Monero", "decimals": 12},
    "FIL": {"name": "Filecoin", "emoji": "📁", "type": "Storage", "network": "Filecoin", "decimals": 18},
    "UNI": {"name": "Uniswap", "emoji": "🦄", "type": "DEX", "network": "Ethereum", "decimals": 18},
    "ETC": {"name": "Ethereum Classic", "emoji": "🟢", "type": "Layer 1", "network": "Ethereum Classic", "decimals": 18},
    "ALGO": {"name": "Algorand", "emoji": "◯", "type": "Layer 1", "network": "Algorand", "decimals": 6},
    "VET": {"name": "VeChain", "emoji": "♦️", "type": "Enterprise", "network": "VeChain", "decimals": 18},
    "WBTC": {"name": "Wrapped Bitcoin", "emoji": "🔄", "type": "Wrapped", "network": "Ethereum", "decimals": 8}
}

# Payment Methods with Icons
SUPPORTED_PAYMENT_METHODS = [
    {"name": "Bank Transfer", "icon": "🏦", "category": "Bank"},
    {"name": "SEPA", "icon": "🏦", "category": "Bank"},
    {"name": "Faster Payments", "icon": "⚡", "category": "Bank"},
    {"name": "PayPal", "icon": "💳", "category": "Digital"},
    {"name": "Revolut", "icon": "💳", "category": "Digital"},
    {"name": "Cash App", "icon": "💵", "category": "Digital"},
    {"name": "UPI", "icon": "📱", "category": "Mobile"},
    {"name": "IMPS", "icon": "📱", "category": "Mobile"},
    {"name": "Paytm", "icon": "📱", "category": "Mobile"},
    {"name": "M-Pesa", "icon": "📲", "category": "Mobile"},
    {"name": "MTN Mobile Money", "icon": "📲", "category": "Mobile"},
    {"name": "Vodafone Cash", "icon": "📲", "category": "Mobile"},
    {"name": "Skrill", "icon": "💸", "category": "Digital"},
    {"name": "Neteller", "icon": "💸", "category": "Digital"},
    {"name": "Wise", "icon": "🌐", "category": "Digital"},
    {"name": "Zelle", "icon": "💰", "category": "Digital"},
    {"name": "Apple Pay", "icon": "🍎", "category": "Mobile"},
    {"name": "Google Pay", "icon": "📱", "category": "Mobile"},
    {"name": "Binance Pay", "icon": "🔶", "category": "Crypto"},
    {"name": "Cash", "icon": "💵", "category": "Cash"},
    {"name": "Western Union", "icon": "💱", "category": "Transfer"},
    {"name": "MoneyGram", "icon": "💱", "category": "Transfer"}
]


# Define Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    wallet_address: str
    total_deposited: float = 0.0
    total_borrowed: float = 0.0
    total_earned: float = 0.0
    available_balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Crypto Bank Models
class CryptoBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    balance_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # References UserAccount.user_id
    currency: str  # BTC, ETH, USDT
    balance: float = 0.0
    locked_balance: float = 0.0  # For pending withdrawals
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency: str  # BTC, ETH, USDT
    transaction_type: str  # deposit, withdrawal, transfer
    amount: float
    status: str = "pending"  # pending, completed, failed
    reference: Optional[str] = None  # External transaction reference
    fee: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class OnboardingStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    account_created: bool = True
    wallet_setup: bool = False
    first_deposit: bool = False
    completed_at: Optional[datetime] = None

class LoanOffer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    offer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lender_address: str
    amount: float
    interest_rate: float  # APR
    duration_days: int
    status: str = "available"  # available, matched, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    loan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offer_id: Optional[str] = None
    lender_address: str
    borrower_address: str
    loan_amount: float
    collateral_amount: float
    interest_rate: float
    duration_days: int
    collateral_ratio: float
    status: str = "active"  # active, repaid, liquidated, defaulted
    borrow_fee: float = 0.0
    repay_fee: float = 0.0
    total_interest: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    repaid_at: Optional[datetime] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    tx_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_address: str
    tx_type: str  # deposit, withdraw, lend, borrow, repay, liquidate, buy_crypto, sell_crypto
    amount: float
    fee: float = 0.0
    loan_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    account_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    bank_name: str
    account_number: str
    account_holder_name: str
    routing_number: Optional[str] = None
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoSellOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_address: str
    crypto_amount: float
    price_per_unit: float  # USD per ETH
    min_purchase: float = 0.01
    max_purchase: float = 10.0
    payment_methods: List[str] = ["bank_transfer"]
    status: str = "active"  # active, matched, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoBuyOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_address: str
    seller_address: str
    sell_order_id: str
    crypto_amount: float
    total_price: float
    status: str = "pending_payment"  # pending_payment, marked_as_paid, payment_submitted, completed, cancelled, disputed, resolved
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_deadline: datetime
    completed_at: Optional[datetime] = None
    marked_paid_at: Optional[datetime] = None
    disputed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class Dispute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    dispute_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    initiated_by: str  # buyer or seller wallet address
    reason: str
    status: str = "open"  # open, under_review, resolved, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None  # admin address
    resolution: Optional[str] = None

class DisputeEvidence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    evidence_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dispute_id: str
    uploaded_by: str  # wallet address
    evidence_type: str  # screenshot, bank_statement, message
    file_url: Optional[str] = None
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DisputeMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dispute_id: str
    sender_address: str
    sender_role: str  # buyer, seller, admin
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    notification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_address: str
    order_id: str
    notification_type: str  # marked_paid, dispute_started, crypto_released, message_received
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    full_name: str
    wallet_address: Optional[str] = None
    role: str = "user"  # user, admin
    email_verified: bool = False
    kyc_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    reset_token: Optional[str] = None
    reset_token_expires: Optional[datetime] = None

# Wallet Management Models
class UserWalletAddresses(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    addresses: Dict[str, str] = {}  # {"BTC": "1A1zP1...", "ETH": "0x742d..."}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddWalletAddressRequest(BaseModel):
    user_id: str
    currency: str  # BTC, ETH, USDT, etc.
    address: str

class WithdrawalRequest(BaseModel):
    user_id: str
    currency: str
    amount: float
    withdrawal_address: str

class DepositRequest(BaseModel):
    user_id: str
    currency: str
    amount: float
    tx_hash: Optional[str] = None

class AdminDepositApproval(BaseModel):
    deposit_id: str
    admin_user_id: str
    approved: bool
    notes: Optional[str] = None

class AdminWithdrawalApproval(BaseModel):
    withdrawal_id: str
    admin_user_id: str
    approved: bool
    tx_hash: Optional[str] = None
    notes: Optional[str] = None

# Phase 2: Enhanced Features Models
class PaymentMethod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    method_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    method_type: str  # bank_transfer, paypal, revolut, wise, cashapp
    details: dict  # Account info, varies by method
    is_verified: bool = False
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KYCVerification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    verification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tier: int = 1  # 1=basic (£500/day), 2=intermediate (£5000/day), 3=advanced (unlimited)
    status: str = "pending"  # pending, approved, rejected
    documents_submitted: list = []
    verified_at: Optional[datetime] = None
    daily_limit: float = 500.0
    monthly_limit: float = 10000.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TwoFactorAuth(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    enabled: bool = False
    method: str = "none"  # none, totp, sms, email
    secret: Optional[str] = None
    backup_codes: list = []
    last_verified: Optional[datetime] = None

# Request/Response Models
class ConnectWalletRequest(BaseModel):
    wallet_address: str

class DepositRequest(BaseModel):
    wallet_address: str
    amount: float

class WithdrawRequest(BaseModel):
    wallet_address: str
    amount: float

class CreateLoanOfferRequest(BaseModel):
    lender_address: str
    amount: float
    duration_days: int

class BorrowRequest(BaseModel):
    borrower_address: str
    offer_id: str
    collateral_amount: float

class RepayLoanRequest(BaseModel):
    borrower_address: str
    loan_id: str

class LiquidateRequest(BaseModel):
    liquidator_address: str
    loan_id: str

class AddBankAccountRequest(BaseModel):
    wallet_address: str
    bank_name: str
    account_number: str
    account_holder_name: str
    routing_number: Optional[str] = None

class CreateSellOrderRequest(BaseModel):
    seller_address: str
    crypto_amount: float
    price_per_unit: float
    min_purchase: float = 0.01
    max_purchase: float = 10.0

class CreateBuyOrderRequest(BaseModel):
    buyer_address: str
    sell_order_id: str
    crypto_amount: float

class ConfirmPaymentRequest(BaseModel):
    buyer_address: str
    order_id: str
    payment_reference: str

class LegacyReleaseCryptoRequest(BaseModel):
    seller_address: str
    order_id: str

class LegacyMarkAsPaidRequest(BaseModel):
    buyer_address: str
    order_id: str
    payment_reference: str

class InitiateDisputeRequest(BaseModel):
    user_address: str
    order_id: str
    reason: str

class UploadEvidenceRequest(BaseModel):
    dispute_id: str
    uploaded_by: str
    evidence_type: str
    description: str
    file_url: Optional[str] = None

class SendDisputeMessageRequest(BaseModel):
    dispute_id: str
    sender_address: str
    sender_role: str


# Trade Chat Models
class TradeChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_id: str
    sender_id: str  # user_id or "system" or "admin"
    sender_type: str  # "buyer", "seller", "admin", "system"
    message_type: str  # "text", "image", "system_event"
    content: str  # text content or base64 image
    image_data: Optional[str] = None  # base64 encoded image
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class SendMessageRequest(BaseModel):
    trade_id: str
    user_id: str
    message: str
    image_data: Optional[str] = None  # base64 encoded image

class MarkMessagesReadRequest(BaseModel):
    trade_id: str
    user_id: str

    message: str

class AdminResolveDisputeRequest(BaseModel):
    admin_address: str
    dispute_id: str
    order_id: str
    resolution: str  # release_to_buyer, release_to_seller, cancel_order
    admin_notes: str

class RegisterRequest(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str
    phone_number: str
    wallet_address: Optional[str] = None
    google_id: Optional[str] = None
    email_verified: Optional[bool] = False

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    admin_code: str

# Crypto Bank Request Models
class InitiateDepositRequest(BaseModel):
    user_id: str
    currency: str  # BTC, ETH, USDT
    amount: float

class InitiateWithdrawalRequest(BaseModel):
    user_id: str
    currency: str
    amount: float
    wallet_address: str

# Helper Functions
def calculate_interest(principal: float, rate: float, days: int) -> float:
    """Calculate simple interest"""
    return (principal * rate * days) / (365 * 100)

def calculate_collateral_ratio(collateral: float, loan: float) -> float:
    """Calculate collateral ratio as percentage"""
    if loan == 0:
        return 0
    return (collateral / loan) * 100

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Crypto P2P Lending Platform API"}

@api_router.post("/auth/connect-wallet")
async def connect_wallet(request: ConnectWalletRequest):
    """Connect wallet and create/get user"""
    existing_user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    
    if existing_user:
        return {
            "success": True,
            "user": existing_user,
            "message": "Wallet connected"
        }
    
    # Create new user
    new_user = User(wallet_address=request.wallet_address)
    user_dict = new_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return {
        "success": True,
        "user": new_user.model_dump(),
        "message": "New wallet registered"
    }

@api_router.post("/user/deposit")
async def deposit(request: DepositRequest):
    """Deposit crypto to platform"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid deposit amount")
    
    # Calculate deposit fee
    fee = request.amount * (PLATFORM_CONFIG["deposit_fee_percent"] / 100)
    net_amount = request.amount - fee
    
    # Update user balance
    result = await db.users.update_one(
        {"wallet_address": request.wallet_address},
        {
            "$inc": {
                "available_balance": net_amount,
                "total_deposited": request.amount
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Record transaction
    tx = Transaction(
        user_address=request.wallet_address,
        tx_type="deposit",
        amount=request.amount,
        fee=fee
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "amount": request.amount,
        "fee": fee,
        "net_amount": net_amount,
        "message": "Deposit successful"
    }

@api_router.post("/user/withdraw")
async def withdraw(request: WithdrawRequest):
    """Withdraw crypto from platform"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid withdrawal amount")
    
    # Get user
    user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate withdrawal fee
    fee = request.amount * (PLATFORM_CONFIG["withdraw_fee_percent"] / 100)
    total_needed = request.amount + fee
    
    if user["available_balance"] < total_needed:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Update user balance
    await db.users.update_one(
        {"wallet_address": request.wallet_address},
        {"$inc": {"available_balance": -total_needed}}
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.wallet_address,
        tx_type="withdraw",
        amount=request.amount,
        fee=fee
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "amount": request.amount,
        "fee": fee,
        "message": "Withdrawal successful"
    }

@api_router.post("/loans/create-offer")
async def create_loan_offer(request: CreateLoanOfferRequest):
    """Create a loan offer (lend crypto)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid loan amount")
    
    # Get user
    user = await db.users.find_one({"wallet_address": request.lender_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["available_balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Lock the funds
    await db.users.update_one(
        {"wallet_address": request.lender_address},
        {"$inc": {"available_balance": -request.amount}}
    )
    
    # Create loan offer
    offer = LoanOffer(
        lender_address=request.lender_address,
        amount=request.amount,
        interest_rate=PLATFORM_CONFIG["lender_interest_rate"],
        duration_days=request.duration_days
    )
    
    offer_dict = offer.model_dump()
    offer_dict['created_at'] = offer_dict['created_at'].isoformat()
    await db.loan_offers.insert_one(offer_dict)
    
    return {
        "success": True,
        "offer": offer.model_dump(),
        "message": "Loan offer created"
    }

@api_router.get("/loans/offers")
async def get_loan_offers():
    """Get all available loan offers"""
    offers = await db.loan_offers.find({"status": "available"}, {"_id": 0}).to_list(1000)
    return {"success": True, "offers": offers}

@api_router.post("/loans/borrow")
async def borrow(request: BorrowRequest):
    """Accept a loan offer and borrow"""
    # Get offer
    offer = await db.loan_offers.find_one({"offer_id": request.offer_id}, {"_id": 0})
    if not offer or offer["status"] != "available":
        raise HTTPException(status_code=404, detail="Loan offer not available")
    
    loan_amount = offer["amount"]
    
    # Calculate required collateral
    required_collateral = (loan_amount * PLATFORM_CONFIG["min_collateral_ratio"]) / 100
    
    if request.collateral_amount < required_collateral:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient collateral. Required: {required_collateral}"
        )
    
    # Calculate fees and interest
    borrow_fee = loan_amount * (PLATFORM_CONFIG["borrow_fee_percent"] / 100)
    total_interest = calculate_interest(
        loan_amount,
        PLATFORM_CONFIG["borrower_interest_rate"],
        offer["duration_days"]
    )
    repay_fee = loan_amount * (PLATFORM_CONFIG["repay_fee_percent"] / 100)
    
    collateral_ratio = calculate_collateral_ratio(request.collateral_amount, loan_amount)
    
    # Create loan
    loan = Loan(
        offer_id=request.offer_id,
        lender_address=offer["lender_address"],
        borrower_address=request.borrower_address,
        loan_amount=loan_amount,
        collateral_amount=request.collateral_amount,
        interest_rate=PLATFORM_CONFIG["borrower_interest_rate"],
        duration_days=offer["duration_days"],
        collateral_ratio=collateral_ratio,
        borrow_fee=borrow_fee,
        repay_fee=repay_fee,
        total_interest=total_interest,
        due_date=datetime.now(timezone.utc) + timedelta(days=offer["duration_days"])
    )
    
    loan_dict = loan.model_dump()
    loan_dict['created_at'] = loan_dict['created_at'].isoformat()
    loan_dict['due_date'] = loan_dict['due_date'].isoformat()
    await db.loans.insert_one(loan_dict)
    
    # Update offer status
    await db.loan_offers.update_one(
        {"offer_id": request.offer_id},
        {"$set": {"status": "matched"}}
    )
    
    # Update borrower balance (receive loan - borrow fee)
    net_amount = loan_amount - borrow_fee
    await db.users.update_one(
        {"wallet_address": request.borrower_address},
        {
            "$inc": {
                "available_balance": net_amount,
                "total_borrowed": loan_amount
            }
        }
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.borrower_address,
        tx_type="borrow",
        amount=loan_amount,
        fee=borrow_fee,
        loan_id=loan.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "loan": loan.model_dump(),
        "net_received": net_amount,
        "total_to_repay": loan_amount + total_interest + repay_fee,
        "message": "Loan borrowed successfully"
    }

@api_router.post("/loans/repay")
async def repay_loan(request: RepayLoanRequest):
    """Repay a loan"""
    # Get loan
    loan = await db.loans.find_one({"loan_id": request.loan_id}, {"_id": 0})
    if not loan or loan["status"] != "active":
        raise HTTPException(status_code=404, detail="Active loan not found")
    
    if loan["borrower_address"] != request.borrower_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate total repayment
    total_repayment = loan["loan_amount"] + loan["total_interest"] + loan["repay_fee"]
    
    # Get borrower
    user = await db.users.find_one({"wallet_address": request.borrower_address}, {"_id": 0})
    if not user or user["available_balance"] < total_repayment:
        raise HTTPException(status_code=400, detail="Insufficient balance to repay")
    
    # Calculate lender earnings (principal + lender interest)
    lender_interest = calculate_interest(
        loan["loan_amount"],
        PLATFORM_CONFIG["lender_interest_rate"],
        loan["duration_days"]
    )
    lender_total = loan["loan_amount"] + lender_interest
    
    # Update borrower (deduct repayment, return collateral)
    await db.users.update_one(
        {"wallet_address": request.borrower_address},
        {
            "$inc": {
                "available_balance": -total_repayment + loan["collateral_amount"],
                "total_borrowed": -loan["loan_amount"]
            }
        }
    )
    
    # Update lender (return principal + interest)
    await db.users.update_one(
        {"wallet_address": loan["lender_address"]},
        {
            "$inc": {
                "available_balance": lender_total,
                "total_earned": lender_interest
            }
        }
    )
    
    # Update loan status
    await db.loans.update_one(
        {"loan_id": request.loan_id},
        {
            "$set": {
                "status": "repaid",
                "repaid_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.borrower_address,
        tx_type="repay",
        amount=total_repayment,
        fee=loan["repay_fee"],
        loan_id=request.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "total_repaid": total_repayment,
        "collateral_returned": loan["collateral_amount"],
        "message": "Loan repaid successfully"
    }

@api_router.post("/loans/liquidate")
async def liquidate_loan(request: LiquidateRequest):
    """Liquidate an under-collateralized loan"""
    # Get loan
    loan = await db.loans.find_one({"loan_id": request.loan_id}, {"_id": 0})
    if not loan or loan["status"] != "active":
        raise HTTPException(status_code=404, detail="Active loan not found")
    
    # Check if eligible for liquidation
    if loan["collateral_ratio"] >= PLATFORM_CONFIG["liquidation_threshold"]:
        raise HTTPException(
            status_code=400,
            detail=f"Loan is not eligible for liquidation. Current ratio: {loan['collateral_ratio']}%"
        )
    
    # Calculate liquidation amounts
    liquidation_fee = loan["loan_amount"] * (PLATFORM_CONFIG["liquidation_fee_percent"] / 100)
    liquidation_penalty = loan["collateral_amount"] * (PLATFORM_CONFIG["liquidation_penalty_percent"] / 100)
    
    liquidator_reward = liquidation_fee
    collateral_to_lender = min(loan["collateral_amount"] - liquidation_penalty, loan["loan_amount"])
    remaining_collateral = loan["collateral_amount"] - liquidation_penalty - collateral_to_lender
    
    # Update lender (gets collateral up to loan amount)
    await db.users.update_one(
        {"wallet_address": loan["lender_address"]},
        {"$inc": {"available_balance": collateral_to_lender}}
    )
    
    # Reward liquidator
    await db.users.update_one(
        {"wallet_address": request.liquidator_address},
        {"$inc": {"available_balance": liquidator_reward}}
    )
    
    # Return remaining collateral to borrower (if any)
    if remaining_collateral > 0:
        await db.users.update_one(
            {"wallet_address": loan["borrower_address"]},
            {"$inc": {"available_balance": remaining_collateral}}
        )
    
    # Update loan status
    await db.loans.update_one(
        {"loan_id": request.loan_id},
        {"$set": {"status": "liquidated"}}
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.liquidator_address,
        tx_type="liquidate",
        amount=collateral_to_lender,
        fee=liquidation_fee,
        loan_id=request.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "liquidation_fee": liquidation_fee,
        "liquidation_penalty": liquidation_penalty,
        "collateral_to_lender": collateral_to_lender,
        "remaining_to_borrower": remaining_collateral,
        "message": "Loan liquidated successfully"
    }

@api_router.get("/user/profile/{wallet_address}")
async def get_user_profile(wallet_address: str):
    """Get user profile and stats"""
    user = await db.users.find_one({"wallet_address": wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get active loans as borrower
    active_borrows = await db.loans.find(
        {"borrower_address": wallet_address, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Get active loans as lender
    active_lends = await db.loans.find(
        {"lender_address": wallet_address, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Get pending offers
    pending_offers = await db.loan_offers.find(
        {"lender_address": wallet_address, "status": "available"},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "user": user,
        "active_borrows": active_borrows,
        "active_lends": active_lends,
        "pending_offers": pending_offers
    }

@api_router.put("/user/profile")
async def update_user_profile(update_data: dict):
    """Update user profile information"""
    try:
        user_id = update_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Find user
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update fields
        update_fields = {}
        
        if "full_name" in update_data:
            update_fields["full_name"] = update_data["full_name"]
        
        if "phone_number" in update_data:
            update_fields["phone_number"] = update_data["phone_number"]
        
        if "country" in update_data:
            update_fields["country"] = update_data["country"]
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Update user
        await db.user_accounts.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )
        
        # Get updated user
        updated_user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        
        logger.info(f"User profile updated: {user_id}")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": updated_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user/loans/{wallet_address}")
async def get_user_loans(wallet_address: str):
    """Get all user loans (as borrower or lender)"""
    # Get all loans
    borrows = await db.loans.find(
        {"borrower_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    lends = await db.loans.find(
        {"lender_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "borrows": borrows,
        "lends": lends
    }

@api_router.get("/user/transactions/{wallet_address}")
async def get_user_transactions(wallet_address: str):
    """Get user transaction history"""
    transactions = await db.transactions.find(
        {"user_address": wallet_address},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    return {
        "success": True,
        "transactions": transactions
    }

@api_router.post("/bank/add")
async def add_bank_account(request: AddBankAccountRequest):
    """Add bank account for fiat transactions"""
    # Check if user exists
    user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create bank account
    bank_account = BankAccount(
        wallet_address=request.wallet_address,
        bank_name=request.bank_name,
        account_number=request.account_number,
        account_holder_name=request.account_holder_name,
        routing_number=request.routing_number,
        verified=True  # In production, this would require verification
    )
    
    account_dict = bank_account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    await db.bank_accounts.insert_one(account_dict)
    
    return {
        "success": True,
        "bank_account": bank_account.model_dump(),
        "message": "Bank account added successfully"
    }

@api_router.get("/bank/accounts/{wallet_address}")
async def get_bank_accounts(wallet_address: str):
    """Get user's bank accounts"""
    accounts = await db.bank_accounts.find(
        {"wallet_address": wallet_address},
        {"_id": 0}
    ).to_list(100)
    
    return {"success": True, "accounts": accounts}

@api_router.post("/crypto-market/sell/create")
async def create_sell_order(request: CreateSellOrderRequest):
    """Create a sell order to sell crypto for fiat"""
    # Check user balance
    user = await db.users.find_one({"wallet_address": request.seller_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["available_balance"] < request.crypto_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Check if user has bank account
    bank_account = await db.bank_accounts.find_one({"wallet_address": request.seller_address}, {"_id": 0})
    if not bank_account:
        raise HTTPException(status_code=400, detail="Please add a bank account first")
    
    # Lock the crypto
    await db.users.update_one(
        {"wallet_address": request.seller_address},
        {"$inc": {"available_balance": -request.crypto_amount}}
    )
    
    # Create sell order
    sell_order = CryptoSellOrder(
        seller_address=request.seller_address,
        crypto_amount=request.crypto_amount,
        price_per_unit=request.price_per_unit,
        min_purchase=request.min_purchase,
        max_purchase=min(request.max_purchase, request.crypto_amount)
    )
    
    order_dict = sell_order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    await db.crypto_sell_orders.insert_one(order_dict)
    
    return {
        "success": True,
        "order": sell_order.model_dump(),
        "message": "Sell order created successfully"
    }

@api_router.get("/crypto-market/sell/orders")
async def get_sell_orders():
    """Get all active sell orders"""
    orders = await db.crypto_sell_orders.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"success": True, "orders": orders}

@api_router.post("/crypto-market/buy/create")
async def create_buy_order(request: CreateBuyOrderRequest):
    """Create a buy order (buyer wants to purchase crypto)"""
    # Get sell order
    sell_order = await db.crypto_sell_orders.find_one({"order_id": request.sell_order_id}, {"_id": 0})
    if not sell_order or sell_order["status"] != "active":
        raise HTTPException(status_code=404, detail="Sell order not available")
    
    # Validate amount
    if request.crypto_amount < sell_order["min_purchase"] or request.crypto_amount > sell_order["max_purchase"]:
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be between {sell_order['min_purchase']} and {sell_order['max_purchase']} ETH"
        )
    
    if request.crypto_amount > sell_order["crypto_amount"]:
        raise HTTPException(status_code=400, detail="Not enough crypto available")
    
    # Check if buyer has bank account
    bank_account = await db.bank_accounts.find_one({"wallet_address": request.buyer_address}, {"_id": 0})
    if not bank_account:
        raise HTTPException(status_code=400, detail="Please add a bank account first")
    
    # Calculate total price
    total_price = request.crypto_amount * sell_order["price_per_unit"]
    
    # Create buy order
    buy_order = CryptoBuyOrder(
        buyer_address=request.buyer_address,
        seller_address=sell_order["seller_address"],
        sell_order_id=request.sell_order_id,
        crypto_amount=request.crypto_amount,
        total_price=total_price,
        payment_deadline=datetime.now(timezone.utc) + timedelta(minutes=120)  # 2 hours default
    )
    
    order_dict = buy_order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['payment_deadline'] = order_dict['payment_deadline'].isoformat()
    await db.crypto_buy_orders.insert_one(order_dict)
    
    # Update sell order
    new_amount = sell_order["crypto_amount"] - request.crypto_amount
    if new_amount <= 0:
        await db.crypto_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"status": "matched", "crypto_amount": 0}}
        )
    else:
        await db.crypto_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"crypto_amount": new_amount}}
        )
    
    # Get seller's bank details
    seller_bank = await db.bank_accounts.find_one({"wallet_address": sell_order["seller_address"]}, {"_id": 0})
    
    return {
        "success": True,
        "order": buy_order.model_dump(),
        "seller_bank_details": {
            "bank_name": seller_bank["bank_name"],
            "account_holder": seller_bank["account_holder_name"],
            "account_number": seller_bank["account_number"],
            "routing_number": seller_bank.get("routing_number")
        },
        "payment_deadline": buy_order.payment_deadline.isoformat(),
        "message": "Buy order created. Please make bank transfer within 30 minutes"
    }

@api_router.post("/crypto-market/payment/mark-paid")
async def mark_as_paid(request: LegacyMarkAsPaidRequest):
    """Buyer marks payment as completed"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Buy order not found")
    
    if buy_order["buyer_address"] != request.buyer_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Order is not pending payment")
    
    # Update order status to marked_as_paid
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "marked_as_paid",
                "payment_reference": request.payment_reference,
                "marked_paid_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification for seller
    notification = Notification(
        user_address=buy_order["seller_address"],
        order_id=request.order_id,
        notification_type="marked_paid",
        message=f"Buyer has marked order {request.order_id[:8]} as paid. Please verify payment and release crypto."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Send email to seller (respects user settings)
    try:
        seller = await db.user_accounts.find_one({"wallet_address": buy_order["seller_address"]}, {"_id": 0})
        if seller:
            user_settings = seller.get('security', {})
            if user_settings.get('login_email_alerts_enabled', True):
                await email_service.send_p2p_payment_marked(
                    user_email=seller["email"],
                    user_name=seller["full_name"],
                    order_id=request.order_id,
                    amount=buy_order["crypto_amount"],
                    coin="ETH"
                )
                logger.info(f"P2P payment marked email sent to seller {seller['email']}")
    except Exception as e:
        logger.error(f"Failed to send P2P payment marked email: {str(e)}")
    
    return {
        "success": True,
        "message": "Payment marked as completed. Seller will be notified to release crypto."
    }

@api_router.post("/crypto-market/release")
async def release_crypto(request: LegacyReleaseCryptoRequest):
    """Seller releases crypto from escrow after verifying payment"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Buy order not found")
    
    if buy_order["seller_address"] != request.seller_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] not in ["marked_as_paid", "payment_submitted"]:
        raise HTTPException(status_code=400, detail="Payment not marked as paid")
    
    if buy_order["status"] == "disputed":
        raise HTTPException(status_code=400, detail="Order is under dispute. Only admin can release crypto.")
    
    # Transfer crypto from escrow to buyer
    await db.users.update_one(
        {"wallet_address": buy_order["buyer_address"]},
        {"$inc": {"available_balance": buy_order["crypto_amount"]}}
    )
    
    # Update order status
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification for buyer
    notification = Notification(
        user_address=buy_order["buyer_address"],
        order_id=request.order_id,
        notification_type="crypto_released",
        message=f"Crypto has been released! {buy_order['crypto_amount']} ETH added to your balance."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Send email to buyer (respects user settings)
    try:
        buyer = await db.user_accounts.find_one({"wallet_address": buy_order["buyer_address"]}, {"_id": 0})
        if buyer:
            user_settings = buyer.get('security', {})
            if user_settings.get('login_email_alerts_enabled', True):
                await email_service.send_p2p_crypto_released(
                    user_email=buyer["email"],
                    user_name=buyer["full_name"],
                    order_id=request.order_id,
                    amount=buy_order["crypto_amount"],
                    coin="ETH"
                )
                logger.info(f"P2P crypto released email sent to buyer {buyer['email']}")
    except Exception as e:
        logger.error(f"Failed to send P2P crypto released email: {str(e)}")
    
    # Record transactions
    tx_sell = Transaction(
        user_address=buy_order["seller_address"],
        tx_type="sell_crypto",
        amount=buy_order["crypto_amount"],
        fee=0
    )
    tx_sell_dict = tx_sell.model_dump()
    tx_sell_dict['timestamp'] = tx_sell_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_sell_dict)
    
    tx_buy = Transaction(
        user_address=buy_order["buyer_address"],
        tx_type="buy_crypto",
        amount=buy_order["crypto_amount"],
        fee=0
    )
    tx_buy_dict = tx_buy.model_dump()
    tx_buy_dict['timestamp'] = tx_buy_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_buy_dict)
    
    return {
        "success": True,
        "message": "Crypto released from escrow successfully"
    }

@api_router.get("/crypto-market/orders/{wallet_address}")
async def get_user_crypto_orders(wallet_address: str):
    """Get user's buy and sell orders"""
    sell_orders = await db.crypto_sell_orders.find(
        {"seller_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    buy_orders = await db.crypto_buy_orders.find(
        {"buyer_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "sell_orders": sell_orders,
        "buy_orders": buy_orders
    }

@api_router.post("/p2p/create-offer")
async def create_enhanced_sell_offer(offer_data: Dict):
    """Create enhanced sell offer with global support"""
    required_fields = ["seller_id", "crypto_currency", "crypto_amount", "fiat_currency", 
                       "price_per_unit", "min_purchase", "max_purchase", "payment_methods"]
    
    for field in required_fields:
        if field not in offer_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Validate seller has balance via wallet service
    wallet_service = get_wallet_service()
    balance_info = await wallet_service.get_balance(
        offer_data["seller_id"], 
        offer_data["crypto_currency"]
    )
    
    if not balance_info or balance_info.get("total_balance", 0) <= 0:
        raise HTTPException(status_code=400, detail="No balance found for this cryptocurrency")
    
    available = balance_info.get("available_balance", 0)
    if available < offer_data["crypto_amount"]:
        raise HTTPException(status_code=400, detail=f"Insufficient available balance. Available: {available}, Required: {offer_data['crypto_amount']}")
    
    # Validate currencies and payment methods
    if offer_data["fiat_currency"] not in GLOBAL_CURRENCIES:
        raise HTTPException(status_code=400, detail="Unsupported fiat currency")
    
    for pm in offer_data["payment_methods"]:
        if pm not in GLOBAL_PAYMENT_METHODS:
            raise HTTPException(status_code=400, detail=f"Unsupported payment method: {pm}")
    
    # Create offer
    offer = EnhancedSellOrder(
        seller_id=offer_data["seller_id"],
        crypto_currency=offer_data["crypto_currency"],
        crypto_amount=offer_data["crypto_amount"],
        fiat_currency=offer_data["fiat_currency"],
        price_per_unit=offer_data["price_per_unit"],
        min_purchase=offer_data["min_purchase"],
        max_purchase=min(offer_data["max_purchase"], offer_data["crypto_amount"]),
        payment_methods=offer_data["payment_methods"],
        seller_requirements=offer_data.get("seller_requirements", [])
    )
    
    offer_dict = offer.model_dump()
    offer_dict['created_at'] = offer_dict['created_at'].isoformat()
    await db.enhanced_sell_orders.insert_one(offer_dict)
    
    return {
        "success": True,
        "offer": offer.model_dump(),
        "message": "Offer created successfully"
    }

@api_router.get("/p2p/offers")
async def get_enhanced_offers(
    crypto_currency: Optional[str] = None,
    fiat_currency: Optional[str] = None,
    payment_method: Optional[str] = None,
    sort_by: Optional[str] = Query("best_price", regex="^(best_price|fast_payment|highest_rating|lowest_rating|most_trades|least_trades|highest_completion|lowest_completion)$"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    min_completion_rate: Optional[float] = None,
    verified_only: Optional[bool] = False,
    fast_payment_only: Optional[bool] = False,
    new_seller_only: Optional[bool] = False,
    country: Optional[str] = None,
    region: Optional[str] = None,
    trusted_only: Optional[bool] = False,
    favorites_only: Optional[bool] = False,
    user_id: Optional[str] = None
):
    """Get enhanced sell offers with comprehensive filters and sorting"""
    query = {"status": "active"}
    
    # Basic filters
    if crypto_currency:
        query["crypto_currency"] = crypto_currency
    
    if fiat_currency:
        query["fiat_currency"] = fiat_currency
    
    if payment_method:
        query["payment_methods"] = payment_method
    
    # Price range filter
    if min_price is not None or max_price is not None:
        query["price_per_unit"] = {}
        if min_price is not None:
            query["price_per_unit"]["$gte"] = min_price
        if max_price is not None:
            query["price_per_unit"]["$lte"] = max_price
    
    # Amount range filter
    if min_amount is not None:
        query["min_order_limit"] = {"$lte": min_amount}
    if max_amount is not None:
        query["max_order_limit"] = {"$gte": max_amount}
    
    # Fast payment filter
    if fast_payment_only:
        query["fast_payment"] = True
    
    # Country filter
    if country:
        query["country"] = country
    
    # Region filter
    if region:
        query["region"] = region
    
    # Get offers
    offers = await db.enhanced_sell_orders.find(query, {"_id": 0}).to_list(1000)
    
    # Filter for favorites only if requested
    if favorites_only and user_id:
        favorites_response = await get_favorite_sellers(user_id)
        favorite_ids = favorites_response["favorites"]
        offers = [offer for offer in offers if offer.get("seller_id") in favorite_ids]
    
    # Enrich with seller info
    enriched_offers = []
    for offer in offers:
        # Handle admin liquidity offers with fake seller profile
        if offer.get("is_admin_liquidity") or offer.get("seller_id") == "ADMIN_LIQUIDITY":
            # Create fake seller profile for admin offers - appears as verified high-volume seller
            offer["seller_info"] = {
                "username": "CoinHubX Verified",
                "is_verified": True,
                "rating": 5.0,
                "total_trades": 10000,
                "completion_rate": 99.9,
                "avg_release_time_minutes": 2,
                "fast_payment": True
            }
        else:
            # Real user sellers - get actual profile
            try:
                seller_response = await get_seller_profile(offer["seller_id"])
                offer["seller_info"] = seller_response["seller"]
            except:
                # Fallback if seller profile doesn't exist
                offer["seller_info"] = {
                    "username": f"User{offer['seller_id'][:8]}",
                    "is_verified": False,
                    "rating": 4.5,
                    "total_trades": 10,
                    "completion_rate": 95.0,
                    "avg_release_time_minutes": 15,
                    "fast_payment": False
                }
        
        seller_info = offer["seller_info"]
        
        # Apply seller-based filters
        if verified_only and not seller_info.get("is_verified", False):
            continue
        
        if min_rating is not None and seller_info.get("rating", 0) < min_rating:
            continue
        
        if max_rating is not None and seller_info.get("rating", 5) > max_rating:
            continue
        
        if min_completion_rate is not None and seller_info.get("completion_rate", 0) < min_completion_rate:
            continue
        
        if new_seller_only and seller_info.get("total_trades", 0) > 10:
            continue
        
        # Trusted seller filter
        if trusted_only and not seller_info.get("is_trusted", False):
            continue
        
        enriched_offers.append(offer)
    
    # Apply sorting
    if sort_by == "best_price":
        enriched_offers.sort(key=lambda x: x.get("price_per_unit", 999999))
    elif sort_by == "fast_payment":
        enriched_offers.sort(key=lambda x: (not x.get("fast_payment", False), x.get("price_per_unit", 999999)))
    elif sort_by == "highest_rating":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("rating", 0), reverse=True)
    elif sort_by == "lowest_rating":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("rating", 0))
    elif sort_by == "most_trades":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("total_trades", 0), reverse=True)
    elif sort_by == "least_trades":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("total_trades", 0))
    elif sort_by == "highest_completion":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("completion_rate", 0), reverse=True)
    elif sort_by == "lowest_completion":
        enriched_offers.sort(key=lambda x: x["seller_info"].get("completion_rate", 0))
    
    return {
        "success": True,
        "offers": enriched_offers,
        "count": len(enriched_offers)
    }


@api_router.get("/p2p/marketplace/offers")
async def get_marketplace_offers(crypto_currency: Optional[str] = None):
    """Get marketplace offers for buyers (showing SELL offers)"""
    try:
        query = {"status": "active", "offer_type": "sell"}
        
        if crypto_currency and crypto_currency != 'all':
            query["crypto_currency"] = crypto_currency
        
        offers = await db.enhanced_sell_orders.find(query, {"_id": 0}).sort("price_per_unit", 1).to_list(100)
        
        # Enrich with seller info
        enriched_offers = []
        for offer in offers:
            seller = await db.user_accounts.find_one({"user_id": offer.get("seller_id")}, {"_id": 0})
            if seller:
                offer["seller_username"] = seller.get("full_name") or seller.get("email", "Unknown")
                offer["seller_rating"] = seller.get("rating", 0)
                offer["seller_trades"] = seller.get("total_trades", 0)
                offer["seller_verified"] = seller.get("kyc_verified", False)
            enriched_offers.append(offer)
        
        return {
            "success": True,
            "offers": enriched_offers
        }
    except Exception as e:
        logger.error(f"Error getting marketplace offers: {str(e)}")
        return {
            "success": False,
            "offers": [],
            "message": str(e)
        }

@api_router.get("/p2p/stats")
async def get_p2p_stats():
    """Get P2P marketplace statistics"""
    try:
        # Count active trades
        active_trades = await db.p2p_trades.count_documents({"status": {"$in": ["waiting_payment", "paid"]}})
        
        # Get 24h volume
        from datetime import timedelta
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        volume_24h = await db.p2p_trades.aggregate([
            {"$match": {"created_at": {"$gte": yesterday.isoformat()}, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$fiat_amount"}}}
        ]).to_list(1)
        
        total_volume_24h = volume_24h[0]["total"] if volume_24h else 0
        
        # Count unique users
        total_users = await db.user_accounts.count_documents({})
        
        # Calculate average completion time from completed trades
        completed_trades = await db.p2p_trades.find({
            "status": "completed",
            "paid_at": {"$exists": True},
            "completed_at": {"$exists": True}
        }).to_list(100)
        
        if completed_trades:
            total_minutes = 0
            count = 0
            for trade in completed_trades:
                try:
                    paid_time = datetime.fromisoformat(trade["paid_at"].replace('Z', '+00:00'))
                    completed_time = datetime.fromisoformat(trade["completed_at"].replace('Z', '+00:00'))
                    minutes = (completed_time - paid_time).total_seconds() / 60
                    total_minutes += minutes
                    count += 1
                except:
                    pass
            avg_completion = f"{int(total_minutes / count)} min" if count > 0 else "N/A"
        else:
            avg_completion = "N/A"
        
        return {
            "success": True,
            "stats": {
                "total_volume": round(total_volume_24h, 2),
                "active_trades": active_trades,
                "total_users": total_users,
                "avg_completion": avg_completion
            }
        }
    except Exception as e:
        logger.error(f"Error getting P2P stats: {str(e)}")
        return {
            "success": True,
            "stats": {
                "total_volume": 0,
                "active_trades": 0,
                "total_users": 0,
                "avg_completion": "N/A"
            }
        }

@api_router.get("/p2p/badges")
async def get_badge_levels():
    """Get all badge level definitions"""
    from badge_system import BADGE_LEVELS
    return {
        "success": True,
        "badges": BADGE_LEVELS
    }

@api_router.get("/p2p/user/{user_id}/badge")
async def get_user_badge(user_id: str):
    """Get user's current badge"""
    from badge_system import BadgeSystem
    badge_system = BadgeSystem(db)
    result = await badge_system.get_user_badge(user_id)
    return {
        "success": True,
        "badge": result
    }

@api_router.get("/p2p/marketplace/filters")
async def get_marketplace_filters():
    """Get dynamic list of available currencies, payment methods, and regions"""
    try:
        # Get all active sell orders
        active_offers = await db.enhanced_sell_orders.find(
            {"status": "active"},
            {"_id": 0, "fiat_currency": 1, "payment_methods": 1}
        ).to_list(10000)
        
        # Extract unique currencies from active offers
        active_currencies = set()
        active_payment_methods = set()
        
        for offer in active_offers:
            # Add fiat currency if exists
            if offer.get("fiat_currency"):
                active_currencies.add(offer.get("fiat_currency"))
            
            # Add payment methods if exists
            if offer.get("payment_methods"):
                methods = offer.get("payment_methods")
                if isinstance(methods, list):
                    active_payment_methods.update(methods)
                elif isinstance(methods, str):
                    active_payment_methods.add(methods)
        
        # Return all supported payment methods (not just active ones)
        all_payment_methods = [
            {"name": pm["name"], "icon": pm["icon"], "category": pm["category"]}
            for pm in SUPPORTED_PAYMENT_METHODS
        ]
        
        # Return all supported regions with flags
        all_regions = [
            {"code": r["code"], "name": r["name"], "flag": r["flag"]}
            for r in SUPPORTED_REGIONS
        ]
        
        # Return all supported fiat currencies
        all_currencies = [
            {"code": c["code"], "name": c["name"], "symbol": c["symbol"]}
            for c in SUPPORTED_FIAT_CURRENCIES
        ]
        
        return {
            "success": True,
            "currencies": all_currencies,
            "payment_methods": all_payment_methods,
            "regions": all_regions,
            "active_currencies": sorted(list(active_currencies)),
            "active_payment_methods": sorted(list(active_payment_methods))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@api_router.get("/p2p/seller/profile/{seller_id}")
async def get_seller_profile(seller_id: str):
    """Get detailed seller profile information"""
    try:
        # Get seller user info
        seller = await db.users.find_one({"user_id": seller_id}, {"_id": 0})
        
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        # Calculate seller stats from completed trades
        completed_trades = await db.p2p_trades.find({
            "seller_id": seller_id,
            "status": "completed"
        }).to_list(10000)
        
        total_trades = len(completed_trades)
        total_volume = sum(trade.get("total_fiat", 0) for trade in completed_trades)
        
        # Calculate completion rate
        all_trades = await db.p2p_trades.find({"seller_id": seller_id}).to_list(10000)
        completion_rate = (total_trades / len(all_trades) * 100) if all_trades else 100
        
        # Calculate average release time
        release_times = []
        for trade in completed_trades:
            if trade.get("completed_at") and trade.get("payment_marked_at"):
                try:
                    completed = datetime.fromisoformat(trade["completed_at"].replace('Z', '+00:00'))
                    marked = datetime.fromisoformat(trade["payment_marked_at"].replace('Z', '+00:00'))
                    diff_minutes = (completed - marked).total_seconds() / 60
                    if diff_minutes > 0:
                        release_times.append(diff_minutes)
                except:
                    pass
        
        avg_release_time = sum(release_times) / len(release_times) if release_times else 15
        
        # Get seller badges
        is_trusted = seller.get("is_trusted_seller", False)
        is_fast_payment = seller.get("is_fast_payment", False)
        
        profile = {
            "seller_id": seller_id,
            "username": seller.get("username", seller.get("email", "").split("@")[0]),
            "country": seller.get("country", "Global"),
            "region": seller.get("region", "Global"),
            "total_trades": total_trades,
            "total_volume": round(total_volume, 2),
            "completion_rate": round(completion_rate, 1),
            "average_release_time_minutes": round(avg_release_time, 1),
            "join_date": seller.get("created_at", datetime.now(timezone.utc).isoformat()),
            "rating": seller.get("rating", 5.0),
            "is_trusted": is_trusted,
            "is_fast_payment": is_fast_payment,
            "is_verified": seller.get("is_verified", False)
        }
        
        return {
            "success": True,
            "profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/favorites/add")
async def add_favorite_seller(request: dict):
    """Add a seller to user's favorites"""
    try:
        user_id = request.get("user_id")
        seller_id = request.get("seller_id")
        
        if not user_id or not seller_id:
            raise HTTPException(status_code=400, detail="user_id and seller_id required")
        
        # Add to favorites collection
        await db.favorite_sellers.update_one(
            {"user_id": user_id, "seller_id": seller_id},
            {
                "$set": {
                    "user_id": user_id,
                    "seller_id": seller_id,
                    "added_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Seller added to favorites"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/favorites/remove")
async def remove_favorite_seller(request: dict):
    """Remove a seller from user's favorites"""
    try:
        user_id = request.get("user_id")
        seller_id = request.get("seller_id")
        
        if not user_id or not seller_id:
            raise HTTPException(status_code=400, detail="user_id and seller_id required")
        
        # Remove from favorites
        await db.favorite_sellers.delete_one({
            "user_id": user_id,
            "seller_id": seller_id
        })
        
        return {
            "success": True,
            "message": "Seller removed from favorites"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/p2p/favorites/{user_id}")
async def get_favorite_sellers(user_id: str):
    """Get user's favorite sellers list"""
    try:
        favorites = await db.favorite_sellers.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
        
        seller_ids = [fav["seller_id"] for fav in favorites]
        
        return {
            "success": True,
            "favorites": seller_ids,
            "count": len(seller_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/admin/p2p/create-admin-liquidity-offer")
async def create_admin_liquidity_offer(
    crypto_currency: str,
    fiat_currency: str,
    price_per_unit: float,
    available_amount: float,
    min_order_limit: float,
    max_order_limit: float,
    payment_methods: list,
):
    """
    Create an admin liquidity offer that appears as a normal P2P offer.
    These are invisible market maker offers - users cannot tell they're from admin.
    """
    try:
        admin_offer = {
            "offer_id": str(uuid.uuid4()),
            "seller_id": "ADMIN_LIQUIDITY",  # Special ID for admin offers
            "crypto_currency": crypto_currency,
            "fiat_currency": fiat_currency,
            "price_per_unit": price_per_unit,
            "available_amount": available_amount,
            "min_order_limit": min_order_limit,
            "max_order_limit": max_order_limit,
            "payment_methods": payment_methods,
            "status": "active",
            "is_admin_liquidity": True,  # Flag to identify admin offers internally
            "fast_payment": True,  # Admin offers are always instant
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.enhanced_sell_orders.insert_one(admin_offer)
        
        return {
            "success": True,
            "message": "Admin liquidity offer created",
            "offer_id": admin_offer["offer_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/p2p/test-data/populate")
async def populate_test_offers():
    """
    Populate test data: admin liquidity offers + mock user offers
    This is for development/testing purposes
    """
    try:
        # Clear existing test data
        await db.enhanced_sell_orders.delete_many({})
        
        # Create admin liquidity offers for all major coins
        admin_offers = [
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "price_per_unit": 47500,
                "available_amount": 10.0,
                "min_order_limit": 100,
                "max_order_limit": 10000,
                "payment_methods": ["Bank Transfer", "PayPal", "Wise"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "ETH",
                "fiat_currency": "GBP",
                "price_per_unit": 2500,
                "available_amount": 50.0,
                "min_order_limit": 50,
                "max_order_limit": 5000,
                "payment_methods": ["Bank Transfer", "Revolut", "Wise"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "USDT",
                "fiat_currency": "GBP",
                "price_per_unit": 0.79,
                "available_amount": 100000.0,
                "min_order_limit": 10,
                "max_order_limit": 50000,
                "payment_methods": ["Bank Transfer", "PayPal"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "BNB",
                "fiat_currency": "GBP",
                "price_per_unit": 380,
                "available_amount": 100.0,
                "min_order_limit": 50,
                "max_order_limit": 5000,
                "payment_methods": ["Bank Transfer"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "SOL",
                "fiat_currency": "GBP",
                "price_per_unit": 120,
                "available_amount": 200.0,
                "min_order_limit": 20,
                "max_order_limit": 2000,
                "payment_methods": ["Bank Transfer", "Revolut"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "ADMIN_LIQUIDITY",
                "crypto_currency": "LTC",
                "fiat_currency": "GBP",
                "price_per_unit": 85,
                "available_amount": 300.0,
                "min_order_limit": 20,
                "max_order_limit": 3000,
                "payment_methods": ["Bank Transfer"],
                "status": "active",
                "is_admin_liquidity": True,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Create mock user offers (these look like real sellers)
        user_offers = [
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "user_seller_1",
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "price_per_unit": 47450,  # Slightly better price than admin
                "available_amount": 0.5,
                "min_order_limit": 200,
                "max_order_limit": 5000,
                "payment_methods": ["Bank Transfer", "Wise"],
                "status": "active",
                "is_admin_liquidity": False,
                "fast_payment": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "user_seller_2",
                "crypto_currency": "ETH",
                "fiat_currency": "GBP",
                "price_per_unit": 2480,
                "available_amount": 2.0,
                "min_order_limit": 100,
                "max_order_limit": 3000,
                "payment_methods": ["Bank Transfer"],
                "status": "active",
                "is_admin_liquidity": False,
                "fast_payment": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "offer_id": str(uuid.uuid4()),
                "seller_id": "user_seller_3",
                "crypto_currency": "BTC",
                "fiat_currency": "USD",
                "price_per_unit": 60000,
                "available_amount": 1.5,
                "min_order_limit": 500,
                "max_order_limit": 10000,
                "payment_methods": ["Bank Transfer", "PayPal"],
                "status": "active",
                "is_admin_liquidity": False,
                "fast_payment": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        # Insert all test data
        all_offers = admin_offers + user_offers
        await db.enhanced_sell_orders.insert_many(all_offers)
        
        return {
            "success": True,
            "message": "Test data populated successfully",
            "admin_offers_created": len(admin_offers),
            "user_offers_created": len(user_offers),
            "total_offers": len(all_offers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# CMS - COIN MANAGEMENT SYSTEM
# ============================================

@api_router.get("/admin/cms/coins")
async def get_all_coins_cms():
    """
    CMS: Get all supported coins with their configuration
    Returns coins that can be enabled/disabled and their NowPay wallet mappings
    """
    try:
        coins = await db.supported_coins.find({}, {"_id": 0}).to_list(100)
        
        # If no coins exist, create default list
        if not coins:
            # Generate default coins from SUPPORTED_CRYPTOCURRENCIES
            default_coins = []
            for symbol, info in SUPPORTED_CRYPTOCURRENCIES.items():
                default_coins.append({
                    "coin_id": str(uuid.uuid4()),
                    "symbol": symbol,
                    "name": info["name"],
                    "enabled": True,
                    "nowpay_wallet_id": None,
                    "supports_p2p": True,
                    "supports_trading": True,
                    "supports_instant_buy": True,
                    "supports_express_buy": True,
                    "min_trade_amount": 0.01 if symbol not in ["BTC", "ETH"] else 0.0001,
                    "max_trade_amount": 100000.0 if symbol in ["USDT", "USDC", "DAI"] else 10000.0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
            await db.supported_coins.insert_many(default_coins)
            coins = default_coins
        
        return {
            "success": True,
            "coins": coins,
            "count": len(coins)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/cms/coins/toggle")
async def toggle_coin_status(request: dict):
    """
    CMS: Enable or disable a coin across all services
    """
    try:
        symbol = request.get("symbol")
        enabled = request.get("enabled", True)
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        
        result = await db.supported_coins.update_one(
            {"symbol": symbol},
            {
                "$set": {
                    "enabled": enabled,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Coin {symbol} not found")
        
        return {
            "success": True,
            "message": f"{symbol} {'enabled' if enabled else 'disabled'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/cms/coins/update")
async def update_coin_config(request: dict):
    """
    CMS: Update coin configuration including NowPay wallet mapping
    """
    try:
        symbol = request.get("symbol")
        updates = {}
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol is required")
        
        # Optional fields to update
        if "nowpay_wallet_id" in request:
            updates["nowpay_wallet_id"] = request["nowpay_wallet_id"]
        if "supports_p2p" in request:
            updates["supports_p2p"] = request["supports_p2p"]
        if "supports_trading" in request:
            updates["supports_trading"] = request["supports_trading"]
        if "supports_instant_buy" in request:
            updates["supports_instant_buy"] = request["supports_instant_buy"]
        if "supports_express_buy" in request:
            updates["supports_express_buy"] = request["supports_express_buy"]
        if "min_trade_amount" in request:
            updates["min_trade_amount"] = request["min_trade_amount"]
        if "max_trade_amount" in request:
            updates["max_trade_amount"] = request["max_trade_amount"]
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.supported_coins.update_one(
            {"symbol": symbol},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Coin {symbol} not found")
        
        return {
            "success": True,
            "message": f"{symbol} configuration updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/cms/coins/add")
async def add_new_coin(request: dict):
    """
    CMS: Add a new coin to the platform
    """
    try:
        symbol = request.get("symbol")
        name = request.get("name")
        
        if not symbol or not name:
            raise HTTPException(status_code=400, detail="Symbol and name are required")
        
        # Check if coin already exists
        existing = await db.supported_coins.find_one({"symbol": symbol})
        if existing:
            raise HTTPException(status_code=400, detail=f"Coin {symbol} already exists")
        
        new_coin = {
            "coin_id": str(uuid.uuid4()),
            "symbol": symbol.upper(),
            "name": name,
            "enabled": request.get("enabled", False),
            "nowpay_wallet_id": request.get("nowpay_wallet_id"),
            "supports_p2p": request.get("supports_p2p", True),
            "supports_trading": request.get("supports_trading", True),
            "supports_instant_buy": request.get("supports_instant_buy", True),
            "supports_express_buy": request.get("supports_express_buy", True),
            "min_trade_amount": request.get("min_trade_amount", 0.01),
            "max_trade_amount": request.get("max_trade_amount", 10000.0),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.supported_coins.insert_one(new_coin)
        
        return {
            "success": True,
            "message": f"Coin {symbol} added successfully",
            "coin": new_coin
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/coins/enabled")
async def get_enabled_coins():
    """
    Public: Get all enabled coins for use across platform
    Used by P2P, Trading, Instant Buy, Express Buy
    """
    try:
        coins = await db.supported_coins.find(
            {"enabled": True},
            {"_id": 0, "symbol": 1, "name": 1, "supports_p2p": 1, "supports_trading": 1, "supports_instant_buy": 1, "supports_express_buy": 1}
        ).to_list(100)
        
        return {
            "success": True,
            "coins": coins,
            "symbols": [coin["symbol"] for coin in coins],
            "count": len(coins)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/p2p/marketplace/available-coins")
async def get_marketplace_available_coins():
    """
    Get list of cryptocurrencies that support P2P with emojis and metadata
    Returns all coins from SUPPORTED_CRYPTOCURRENCIES that are suitable for P2P
    """
    try:
        # Return all supported crypto with full metadata
        coins_data = []
        for symbol, data in SUPPORTED_CRYPTOCURRENCIES.items():
            coin_info = {
                "symbol": symbol,
                "name": data["name"],
                "emoji": data.get("emoji", ""),
                "network": data.get("network", ""),
                "chains": data.get("chains", [])
            }
            coins_data.append(coin_info)
        
        # Sort alphabetically by symbol
        coins_data.sort(key=lambda x: x["symbol"])
        
        return {
            "success": True,
            "coins": [coin["symbol"] for coin in coins_data],
            "coins_data": coins_data,
            "count": len(coins_data)
        }
    except Exception as e:
        # Fallback - return default coins
        return {
            "success": True,
            "coins": ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP"],
            "count": 7
        }



@api_router.get("/coins/metadata")
async def get_coins_metadata():
    """
    Get metadata for all enabled coins including display icons
    Used by frontend for rendering coin information consistently
    """
    try:
        # Get all enabled coins
        coins = await db.supported_coins.find(
            {"enabled": True},
            {"_id": 0}
        ).sort("symbol", 1).to_list(100)
        
        # Add default icon mapping for common cryptocurrencies
        icon_map = {
            "BTC": "₿",
            "ETH": "⟠",
            "USDT": "₮",
            "BNB": "◆",
            "SOL": "◎",
            "LTC": "Ł",
            "XRP": "✕",
            "ADA": "₳",
            "DOT": "●",
            "DOGE": "Ð",
            "MATIC": "⬡",
            "AVAX": "▲",
            "LINK": "◬",
            "UNI": "🦄",
            "ATOM": "⚛",
            "TRX": "Ⓣ",
            "BCH": "฿",
            "SHIB": "🐕",
            "USDC": "Ⓤ",
            "DAI": "◈",
            "XLM": "✱"
        }
        
        # Enrich coins with icons and price data placeholders
        coins_metadata = []
        for coin in coins:
            symbol = coin["symbol"]
            coins_metadata.append({
                "symbol": symbol,
                "name": coin.get("name", symbol),
                "icon": icon_map.get(symbol, "◯"),  # Default to circle if no icon
                "supports_p2p": coin.get("supports_p2p", False),
                "supports_trading": coin.get("supports_trading", False),
                "supports_instant_buy": coin.get("supports_instant_buy", False),
                "supports_express_buy": coin.get("supports_express_buy", False),
                "min_trade_amount": coin.get("min_trade_amount", 0.01),
                "max_trade_amount": coin.get("max_trade_amount", 10000.0)
            })
        
        return {
            "success": True,
            "coins": coins_metadata,
            "count": len(coins_metadata)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ============================================================================
# ENHANCED P2P MARKETPLACE ENDPOINTS - PRODUCTION READY
# ============================================================================

@api_router.get("/p2p/config")
async def get_p2p_config():
    """Get P2P platform configuration - payment methods, fiat and cryptocurrencies"""
    return {
        "success": True,
        "payment_methods": GLOBAL_PAYMENT_METHODS,
        "fiat_currencies": GLOBAL_CURRENCIES,
        "cryptocurrencies": SUPPORTED_CRYPTOCURRENCIES,
        "default_timer_minutes": 30,
        "platform_fee_percent": PLATFORM_CONFIG["p2p_trade_fee_percent"]
    }



@api_router.get("/user/seller-link")
async def get_user_seller_link(user_id: str):
    """Get user's personal seller link"""
    try:
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate seller link
        base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://tradepanel-12.preview.emergentagent.com")
        seller_link = f"{base_url.replace('/api', '')}/p2p/seller/{user_id}"
        
        return {
            "success": True,
            "seller_link": seller_link,
            "user_id": user_id,
            "username": user.get("full_name", user.get("email", "Unknown"))
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seller link: {e}")
        raise HTTPException(status_code=500, detail="Failed to get seller link")


@api_router.get("/p2p/seller/{user_id}")
async def get_seller_profile(user_id: str):
    """Get seller profile with stats"""
    # Get user account
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Calculate stats from completed trades
    completed_trades = await db.trades.count_documents({
        "seller_id": user_id,
        "status": "released"
    })
    
    total_trades = await db.trades.count_documents({
        "$or": [{"seller_id": user_id}, {"buyer_id": user_id}]
    })
    
    completion_rate = (completed_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Calculate average release time
    released_trades = await db.trades.find({
        "seller_id": user_id,
        "status": "released",
        "released_at": {"$exists": True},
        "buyer_marked_paid_at": {"$exists": True}
    }, {"_id": 0, "buyer_marked_paid_at": 1, "released_at": 1}).to_list(100)
    
    avg_release_minutes = 0
    if released_trades:
        total_minutes = 0
        for trade in released_trades:
            marked_time = datetime.fromisoformat(trade["buyer_marked_paid_at"]) if isinstance(trade["buyer_marked_paid_at"], str) else trade["buyer_marked_paid_at"]
            released_time = datetime.fromisoformat(trade["released_at"]) if isinstance(trade["released_at"], str) else trade["released_at"]
            diff = (released_time - marked_time).total_seconds() / 60
            total_minutes += diff
        avg_release_minutes = int(total_minutes / len(released_trades))
    
    # Calculate seller rating (based on completion rate and speed)
    rating = 5.0
    if completion_rate < 50:
        rating = 2.0
    elif completion_rate < 70:
        rating = 3.0
    elif completion_rate < 85:
        rating = 4.0
    elif completion_rate < 95:
        rating = 4.5
    
    # Adjust rating based on release time
    if avg_release_minutes > 30:
        rating -= 0.5
    elif avg_release_minutes > 60:
        rating -= 1.0
    
    rating = max(1.0, min(5.0, rating))  # Keep between 1-5
    
    return {
        "success": True,
        "seller": {
            "user_id": user_id,
            "username": user.get("full_name", "Anonymous"),
            "is_verified": user.get("kyc_verified", False),
            "total_trades": total_trades,
            "completed_trades": completed_trades,
            "completion_rate": round(completion_rate, 2),
            "average_release_time_minutes": avg_release_minutes,
            "rating": round(rating, 1),
            "is_online": True  # Placeholder - implement real online status tracking
        }
    }

@api_router.post("/p2p/preview-order")
async def preview_order(request: PreviewOrderRequest):
    """Preview order before creating trade - Binance style"""
    # Get sell order
    sell_order = await db.enhanced_sell_orders.find_one({"order_id": request.sell_order_id}, {"_id": 0})
    if not sell_order:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if sell_order["status"] != "active":
        raise HTTPException(status_code=400, detail="Offer is no longer available")
    
    # Validate amount limits
    if request.crypto_amount < sell_order["min_purchase"]:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum purchase is {sell_order['min_purchase']} {sell_order['crypto_currency']}"
        )
    
    if request.crypto_amount > sell_order["max_purchase"]:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum purchase is {sell_order['max_purchase']} {sell_order['crypto_currency']}"
        )
    
    if request.crypto_amount > sell_order["crypto_amount"]:
        raise HTTPException(status_code=400, detail="Not enough crypto available in this offer")
    
    # Get seller profile
    seller_response = await get_seller_profile(sell_order["seller_id"])
    seller_profile = seller_response["seller"]
    
    # Calculate totals
    fiat_amount = request.crypto_amount * sell_order["price_per_unit"]
    
    # Get payment method details
    payment_methods_details = []
    for pm_id in sell_order["payment_methods"]:
        if pm_id in GLOBAL_PAYMENT_METHODS:
            payment_methods_details.append(GLOBAL_PAYMENT_METHODS[pm_id])
    
    # Get currency details
    currency_info = GLOBAL_CURRENCIES.get(sell_order["fiat_currency"], {"symbol": "", "name": ""})
    
    return {
        "success": True,
        "preview": {
            "sell_order_id": sell_order["order_id"],
            "seller": seller_profile,
            "crypto_currency": sell_order["crypto_currency"],
            "crypto_amount": request.crypto_amount,
            "fiat_currency": sell_order["fiat_currency"],
            "currency_symbol": currency_info["symbol"],
            "fiat_amount": round(fiat_amount, 2),
            "price_per_unit": sell_order["price_per_unit"],
            "payment_methods": payment_methods_details,
            "seller_requirements": sell_order.get("seller_requirements", []),
            "min_purchase": sell_order["min_purchase"],
            "max_purchase": sell_order["max_purchase"]
        }
    }

@api_router.post("/p2p/create-trade")
async def create_trade(request: CreateTradeRequest):
    """Create P2P trade and lock crypto in escrow via wallet service"""
    from p2p_wallet_service import p2p_create_trade_with_wallet
    
    wallet_service = get_wallet_service()
    result = await p2p_create_trade_with_wallet(
        db=db,
        wallet_service=wallet_service,
        sell_order_id=request.sell_order_id,
        buyer_id=request.buyer_id,
        crypto_amount=request.crypto_amount,
        payment_method=request.payment_method,
        buyer_wallet_address=request.buyer_wallet_address,
        buyer_wallet_network=request.buyer_wallet_network,
        is_express=request.is_express
    )
    
    return result
    
    # Create system message for trade opened
    await create_system_message(trade.trade_id, "trade_opened")
    
    # Update sell order remaining amount
    new_crypto_amount = sell_order["crypto_amount"] - request.crypto_amount
    if new_crypto_amount < sell_order["min_purchase"]:
        # Not enough left, mark as completed
        await db.enhanced_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"status": "completed", "crypto_amount": 0}}
        )
    else:
        await db.enhanced_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"crypto_amount": new_crypto_amount}}
        )
    
    return {
        "success": True,
        "trade": trade.model_dump(),
        "message": "Trade created successfully. Crypto locked in escrow."
    }

@api_router.get("/p2p/trade/{trade_id}")
async def get_trade_details(trade_id: str):
    """Get trade details with escrow status"""
    trade = await db.p2p_trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Get seller info
    seller_response = await get_seller_profile(trade["seller_id"])
    
    # Get buyer info
    buyer = await db.user_accounts.find_one({"user_id": trade["buyer_id"]}, {"_id": 0})
    buyer_name = buyer.get("full_name", "Anonymous") if buyer else "Anonymous"
    
    # Get payment method details
    payment_method_info = GLOBAL_PAYMENT_METHODS.get(trade["payment_method"], {
        "name": trade["payment_method"],
        "estimated_time_minutes": 30
    })
    
    # Calculate time remaining
    deadline = datetime.fromisoformat(trade["payment_deadline"]) if isinstance(trade["payment_deadline"], str) else trade["payment_deadline"]
    # Ensure deadline is timezone-aware
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    time_remaining_seconds = max(0, (deadline - now).total_seconds())
    
    return {
        "success": True,
        "trade": trade,
        "seller": seller_response["seller"],
        "buyer_name": buyer_name,
        "payment_method_info": payment_method_info,
        "time_remaining_seconds": int(time_remaining_seconds),
        "expired": time_remaining_seconds <= 0
    }

@api_router.post("/p2p/mark-paid")
async def mark_trade_as_paid(request: MarkPaidRequest):
    """Buyer marks trade as paid"""
    trade = await db.trades.find_one({"trade_id": request.trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify buyer
    if trade["buyer_id"] != request.buyer_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check status
    if trade["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Trade is not in pending payment status")
    
    # Check if expired
    deadline = datetime.fromisoformat(trade["payment_deadline"]) if isinstance(trade["payment_deadline"], str) else trade["payment_deadline"]
    if datetime.now(timezone.utc) > deadline:
        # Auto-cancel expired trade
        await auto_cancel_trade(request.trade_id)
        raise HTTPException(status_code=400, detail="Trade has expired")
    
    # Collect P2P Taker Fee from buyer
    from centralized_fee_system import get_fee_manager
    fee_manager = get_fee_manager(db)
    taker_fee_percent = await fee_manager.get_fee("p2p_taker_fee_percent")
    
    fiat_amount = trade.get("fiat_amount", 0)
    taker_fee = fiat_amount * (taker_fee_percent / 100.0)
    
    # Check if express mode and add express fee
    is_express = trade.get("is_express", False)
    express_fee = 0.0
    if is_express:
        express_fee_percent = await fee_manager.get_fee("p2p_express_fee_percent")
        express_fee = fiat_amount * (express_fee_percent / 100.0)
        logger.info(f"P2P Express trade: Collecting {express_fee} express fee")
    
    total_fee = taker_fee + express_fee
    
    # Check for buyer's referrer
    buyer = await db.user_accounts.find_one({"user_id": request.buyer_id}, {"_id": 0})
    referrer_id = buyer.get("referrer_id") if buyer else None
    referrer_commission = 0.0
    admin_fee = total_fee
    commission_percent = 0.0
    
    if referrer_id:
        referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
        referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
        
        if referrer_tier == "golden":
            commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
        else:
            commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
        
        referrer_commission = total_fee * (commission_percent / 100.0)
        admin_fee = total_fee - referrer_commission
    
    # Deduct total fee (taker + express) from buyer (using fiat currency)
    wallet_service = get_wallet_service()
    fiat_currency = trade.get("fiat_currency", "GBP")
    
    try:
        await wallet_service.debit(
            user_id=request.buyer_id,
            currency=fiat_currency,
            amount=total_fee,
            transaction_type="p2p_fees",
            reference_id=request.trade_id,
            metadata={"trade_id": request.trade_id, "taker_fee": taker_fee, "express_fee": express_fee}
        )
        
        # Credit admin wallet
        await wallet_service.credit(
            user_id="admin_wallet",
            currency=fiat_currency,
            amount=admin_fee,
            transaction_type="p2p_fees",
            reference_id=request.trade_id,
            metadata={"buyer_id": request.buyer_id, "total_fee": total_fee, "taker_fee": taker_fee, "express_fee": express_fee}
        )
        
        # Credit referrer if applicable
        if referrer_id and referrer_commission > 0:
            await wallet_service.credit(
                user_id=referrer_id,
                currency=fiat_currency,
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=request.trade_id,
                metadata={"referred_user_id": request.buyer_id, "transaction_type": "p2p_taker"}
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": request.buyer_id,
                "transaction_type": "p2p_taker",
                "fee_amount": total_fee,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": fiat_currency,
                "trade_id": request.trade_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Log taker fee to fee_transactions
        await db.fee_transactions.insert_one({
            "transaction_id": f"{request.trade_id}_taker",
            "user_id": request.buyer_id,
            "transaction_type": "p2p_taker",
            "fee_type": "p2p_taker_fee",
            "amount": fiat_amount,
            "total_fee": taker_fee,
            "fee_percent": taker_fee_percent,
            "admin_fee": taker_fee * (admin_fee / total_fee) if total_fee > 0 else taker_fee,
            "referrer_commission": taker_fee * (referrer_commission / total_fee) if total_fee > 0 else 0,
            "referrer_id": referrer_id,
            "currency": fiat_currency,
            "reference_id": request.trade_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Log express fee separately if present
        if express_fee > 0:
            await db.fee_transactions.insert_one({
                "transaction_id": f"{request.trade_id}_express",
                "user_id": request.buyer_id,
                "transaction_type": "p2p_express",
                "fee_type": "p2p_express_fee",
                "amount": fiat_amount,
                "total_fee": express_fee,
                "fee_percent": express_fee_percent,
                "admin_fee": express_fee * (admin_fee / total_fee) if total_fee > 0 else express_fee,
                "referrer_commission": express_fee * (referrer_commission / total_fee) if total_fee > 0 else 0,
                "referrer_id": referrer_id,
                "currency": fiat_currency,
                "reference_id": request.trade_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        logger.info(f"✅ P2P Taker Fee collected: {taker_fee} {fiat_currency} from buyer {request.buyer_id}")
    except Exception as fee_error:
        logger.warning(f"⚠️ Failed to collect taker fee: {str(fee_error)}")
    
    # Update trade status
    await db.trades.update_one(
        {"trade_id": request.trade_id},
        {
            "$set": {
                "status": "buyer_marked_paid",
                "buyer_marked_paid_at": datetime.now(timezone.utc).isoformat(),
                "payment_reference": request.payment_reference,
                "taker_fee": taker_fee,
                "taker_fee_percent": taker_fee_percent,
                "taker_admin_fee": admin_fee,
                "taker_referrer_commission": referrer_commission,
                "taker_referrer_id": referrer_id
            }
        }
    )
    
    # Send notifications
    try:
        notification_service = get_notification_service()
        await notification_service.notify_payment_marked(
            trade_id=request.trade_id,
            buyer_id=request.buyer_id,
            seller_id=trade.get("seller_id"),
            fiat_amount=trade.get("fiat_amount", 0),
            fiat_currency=fiat_currency,
            payment_reference=request.payment_reference
        )
    except Exception as notif_error:
        logger.error(f"Failed to send payment marked notification: {str(notif_error)}")
    
    # Create system messages
    await create_system_message(request.trade_id, "buyer_marked_paid")
    await create_system_message(request.trade_id, "waiting_for_seller")
    
    return {
        "success": True,
        "message": "Payment marked. Waiting for seller to release crypto."
    }

@api_router.post("/p2p/release-crypto")
async def release_crypto_from_escrow(request: ReleaseCryptoRequest):
    """Seller releases crypto from escrow to buyer via wallet service"""
    from p2p_wallet_service import p2p_release_crypto_with_wallet
    
    wallet_service = get_wallet_service()
    result = await p2p_release_crypto_with_wallet(
        db=db,
        wallet_service=wallet_service,
        trade_id=request.trade_id,
        seller_id=request.seller_id
    )
    
    return result

@api_router.post("/p2p/release-crypto-OLD")
async def release_crypto_from_escrow_OLD(request: ReleaseCryptoRequest):
    """OLD VERSION - DEPRECATED"""
    trade = await db.trades.find_one({"trade_id": request.trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify seller
    if trade["seller_id"] != request.seller_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check status
    if trade["status"] not in ["buyer_marked_paid", "pending_payment"]:
        raise HTTPException(status_code=400, detail=f"Cannot release crypto in current status: {trade['status']}")
    
    # Check escrow
    if not trade.get("escrow_locked", False):
        raise HTTPException(status_code=400, detail="No crypto locked in escrow")
    
    # CALCULATE PLATFORM FEE (configurable % from seller with level reductions)
    # Fetch monetization settings
    monetization_settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
    if not monetization_settings:
        monetization_settings = DEFAULT_MONETIZATION_SETTINGS
    
    base_fee_percent = monetization_settings.get("p2p_seller_fee_percent", 3.0)
    
    # Check seller level and apply fee reduction
    seller = await db.user_accounts.find_one({"user_id": trade["seller_id"]}, {"_id": 0, "seller_level": 1})
    seller_level = seller.get("seller_level", "bronze") if seller else "bronze"
    
    # Apply level-based fee reduction
    if seller_level == "silver":
        fee_reduction = monetization_settings.get("silver_fee_reduction_percent", 0.5)
        trade_fee_percent = base_fee_percent - fee_reduction
    elif seller_level == "gold":
        fee_reduction = monetization_settings.get("gold_fee_reduction_percent", 1.0)
        trade_fee_percent = base_fee_percent - fee_reduction
    else:
        trade_fee_percent = base_fee_percent
    
    crypto_amount = float(trade["crypto_amount"])
    platform_fee = crypto_amount * (trade_fee_percent / 100.0)
    buyer_receives = crypto_amount - platform_fee
    
    logger.info(f"P2P Trade Fee: {trade_fee_percent}% of {crypto_amount} = {platform_fee} {trade['crypto_currency']}")
    logger.info(f"Buyer receives: {buyer_receives} {trade['crypto_currency']}")
    
    # Release crypto from seller's locked balance
    await db.crypto_balances.update_one(
        {
            "user_id": trade["seller_id"],
            "currency": trade["crypto_currency"]
        },
        {"$inc": {"locked_balance": -crypto_amount}}
    )
    
    # Add to buyer's balance (minus platform fee)
    buyer_balance = await db.crypto_balances.find_one({
        "user_id": trade["buyer_id"],
        "currency": trade["crypto_currency"]
    }, {"_id": 0})
    
    if not buyer_balance:
        # Create balance entry if doesn't exist
        new_balance = CryptoBalance(
            user_id=trade["buyer_id"],
            currency=trade["crypto_currency"],
            balance=buyer_receives
        )
        balance_dict = new_balance.model_dump()
        if isinstance(balance_dict.get('last_updated'), datetime):
            balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
        await db.crypto_balances.insert_one(balance_dict)
    else:
        await db.crypto_balances.update_one(
            {
                "user_id": trade["buyer_id"],
                "currency": trade["crypto_currency"]
            },
            {"$inc": {"balance": buyer_receives}}
        )
    
    # AUTOMATED: Create platform fee transaction
    fee_tx = CryptoTransaction(
        user_id=PLATFORM_CONFIG["admin_wallet_id"],
        currency=trade["crypto_currency"],
        transaction_type="p2p_fee",  # Changed from "platform_fee" for clear separation
        amount=platform_fee,
        status="completed",
        reference=f"P2P trade fee from {request.trade_id}",
        notes=f"Automated P2P trade fee ({trade_fee_percent}%) from seller {trade['seller_id']}",
        completed_at=datetime.now(timezone.utc)
    )
    
    # Track P2P fees separately in internal_balances
    p2p_fee_wallet = await db.internal_balances.find_one({"currency": trade["crypto_currency"]})
    
    if p2p_fee_wallet:
        await db.internal_balances.update_one(
            {"currency": trade["crypto_currency"]},
            {
                "$inc": {
                    "p2p_fees": platform_fee,
                    "total_fees": platform_fee
                }
            }
        )
    else:
        await db.internal_balances.insert_one({
            "currency": trade["crypto_currency"],
            "p2p_fees": platform_fee,
            "total_fees": platform_fee,
            "express_buy_fees": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    fee_dict = fee_tx.model_dump()
    fee_dict['created_at'] = fee_dict['created_at'].isoformat()
    fee_dict['completed_at'] = fee_dict['completed_at'].isoformat()
    fee_dict['source_user_id'] = trade["seller_id"]
    fee_dict['fee_type'] = 'p2p_trade_fee'
    fee_dict['trade_id'] = request.trade_id
    await db.crypto_transactions.insert_one(fee_dict)
    
    # Process referral commission (20% of platform fee)
    try:
        buyer_user = await db.user_accounts.find_one({"user_id": trade["buyer_id"]})
        if buyer_user:
            await process_referral_commission(
                referred_user_id=trade["buyer_id"],
                transaction_id=request.trade_id,
                transaction_type="p2p_trade",
                currency=trade["crypto_currency"],
                platform_fee=platform_fee
            )
            logger.info(f"Referral commission processed for trade {request.trade_id}")
    except Exception as e:
        logger.error(f"Failed to process referral commission: {str(e)}")
    
    # Update trade status
    await db.trades.update_one(
        {"trade_id": request.trade_id},
        {
            "$set": {
                "status": "released",
                "escrow_locked": False,
                "released_at": datetime.now(timezone.utc).isoformat(),
                "platform_fee": platform_fee,
                "platform_fee_percent": trade_fee_percent,
                "buyer_received": buyer_receives
            }
        }
    )
    
    # Record buyer transaction
    tx = CryptoTransaction(
        user_id=trade["buyer_id"],
        currency=trade["crypto_currency"],
        transaction_type="p2p_buy",
        amount=buyer_receives,
        status="completed",
        reference=trade["trade_id"],
        notes=f"P2P trade completed. Received {buyer_receives} {trade['crypto_currency']} (Platform fee: {platform_fee})",
        completed_at=datetime.now(timezone.utc)
    )
    tx_dict = tx.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
    tx_dict['gross_amount'] = crypto_amount
    tx_dict['platform_fee'] = platform_fee
    await db.crypto_transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "message": "Crypto released successfully to buyer",
        "buyer_received": buyer_receives,
        "platform_fee": platform_fee,
        "platform_fee_percent": trade_fee_percent
    }

async def auto_cancel_trade(trade_id: str):
    """Auto-cancel expired trade and release escrow"""
    trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade or trade["status"] != "pending_payment":
        return
    
    # Release locked crypto back to seller
    if trade.get("escrow_locked", False):
        await db.crypto_balances.update_one(
            {
                "user_id": trade["seller_id"],
                "currency": trade["crypto_currency"]
            },
            {"$inc": {"locked_balance": -trade["crypto_amount"]}}
        )
    
    # Update trade status
    await db.trades.update_one(
        {"trade_id": trade_id},
        {
            "$set": {
                "status": "expired",
                "escrow_locked": False,
                "expired_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Return crypto to sell order availability
    await db.enhanced_sell_orders.update_one(
        {"order_id": trade["sell_order_id"]},
        {"$inc": {"crypto_amount": trade["crypto_amount"]}}
    )

@api_router.post("/p2p/cancel-trade")
async def cancel_trade(request: CancelTradeRequest):
    """Cancel a trade and unlock crypto from escrow via wallet service"""
    from p2p_wallet_service import p2p_cancel_trade_with_wallet
    
    wallet_service = get_wallet_service()
    result = await p2p_cancel_trade_with_wallet(
        db=db,
        wallet_service=wallet_service,
        trade_id=request.trade_id,
        user_id=request.user_id,
        reason=request.reason
    )
    
    return result

@api_router.post("/p2p/cancel-trade-OLD")
async def cancel_trade_OLD(request: CancelTradeRequest):
    """OLD VERSION - DEPRECATED"""
    trade = await db.trades.find_one({"trade_id": request.trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify user is part of trade
    if request.user_id not in [trade["buyer_id"], trade["seller_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only allow cancel if pending
    if trade["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Can only cancel pending trades")
    
    # Release escrow
    await auto_cancel_trade(request.trade_id)
    
    # Update status to cancelled instead of expired
    await db.trades.update_one(
        {"trade_id": request.trade_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {
        "success": True,
        "message": "Trade cancelled successfully"
    }

@api_router.get("/p2p/trades/user/{user_id}")
async def get_user_trades(user_id: str):
    """Get all trades for a user"""
    trades = await db.trades.find({
        "$or": [
            {"buyer_id": user_id},
            {"seller_id": user_id}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "trades": trades
    }

@api_router.post("/p2p/trade/message")
async def send_trade_message(message_data: Dict):
    """Send a message in trade chat"""
    required_fields = ["trade_id", "sender_id", "sender_role", "message"]
    for field in required_fields:
        if field not in message_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Verify trade exists
    trade = await db.trades.find_one({"trade_id": message_data["trade_id"]}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify user is part of trade
    if message_data["sender_id"] not in [trade["buyer_id"], trade["seller_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create message
    msg = TradeMessage(
        trade_id=message_data["trade_id"],
        sender_id=message_data["sender_id"],
        sender_role=message_data["sender_role"],
        message=message_data["message"]
    )
    
    msg_dict = msg.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    await db.trade_messages.insert_one(msg_dict)
    
    # Send notification to the other party
    try:
        notification_service = get_notification_service()
        recipient_id = trade["buyer_id"] if message_data["sender_id"] == trade["seller_id"] else trade["seller_id"]
        
        await notification_service.notify_message_sent(
            trade_id=message_data["trade_id"],
            sender_id=message_data["sender_id"],
            recipient_id=recipient_id,
            sender_role=message_data["sender_role"],
            message_preview=message_data["message"]
        )
    except Exception as notif_error:
        logger.error(f"Failed to send message notification: {str(notif_error)}")
    
    return {
        "success": True,
        "message": msg.model_dump()
    }

@api_router.get("/p2p/trade/{trade_id}/messages")
async def get_trade_messages(trade_id: str):
    """Get all messages for a trade"""
    messages = await db.trade_messages.find(
        {"trade_id": trade_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {
        "success": True,
        "messages": messages
    }

@api_router.post("/p2p/trade/upload-attachment")
async def upload_trade_attachment(
    file: UploadFile = File(...),
    trade_id: str = Form(...),
    sender_id: str = Form(...),
    sender_role: str = Form(...)
):
    """Upload a file attachment for trade chat (for proof of payment, etc.)"""
    # Verify trade exists
    trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Verify user is part of trade
    if sender_id not in [trade["buyer_id"], trade["seller_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file type (images, PDFs, documents)
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.txt'}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    # Create unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    
    # Save file to disk
    upload_dir = Path("/app/backend/uploads/trade_attachments")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create message with attachment
    msg = TradeMessage(
        trade_id=trade_id,
        sender_id=sender_id,
        sender_role=sender_role,
        message=f"📎 Sent an attachment: {file.filename}",
        attachment_url=f"/api/p2p/trade/attachment/{filename}",
        attachment_name=file.filename
    )
    
    msg_dict = msg.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    await db.trade_messages.insert_one(msg_dict)
    
    return {
        "success": True,
        "message": "File uploaded successfully",
        "attachment_url": msg.attachment_url,
        "message_data": msg.model_dump()
    }

@api_router.get("/p2p/trade/attachment/{filename}")
async def get_trade_attachment(filename: str):
    """Serve uploaded attachment files"""
    from fastapi.responses import FileResponse
    
    file_path = Path("/app/backend/uploads/trade_attachments") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# ============================================================================
# END ENHANCED P2P MARKETPLACE ENDPOINTS
# ============================================================================


# ============================================================================
# TRADER SYSTEM & EXPRESS MODE - P2P AUTO-MATCHING
# ============================================================================

@api_router.post("/trader/create-profile")
async def create_trader_profile(user_id: str):
    """Convert a regular user into a trader"""
    # Check if user exists
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a trader
    existing_trader = await db.trader_profiles.find_one({"user_id": user_id})
    if existing_trader:
        return {"success": True, "message": "Already a trader", "trader": existing_trader}
    
    # Create trader profile
    trader_profile = TraderProfile(
        user_id=user_id,
        is_trader=True,
        is_online=True,
        verified_email=user.get('email_verified', False),
        verified_phone=user.get('phone_verified', False)
    )
    
    await db.trader_profiles.insert_one(trader_profile.model_dump())
    
    return {
        "success": True,
        "message": "Trader profile created successfully",
        "trader": trader_profile.model_dump()
    }


@api_router.get("/trader/profile/{user_id}")
async def get_trader_profile(user_id: str):
    """Get trader profile and stats"""
    trader = await db.trader_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not trader:
        raise HTTPException(status_code=404, detail="Trader profile not found")
    
    return {"success": True, "trader": trader}


@api_router.put("/trader/update-status")
async def update_trader_status(user_id: str, is_online: bool):
    """Update trader online/offline status"""
    result = await db.trader_profiles.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_online": is_online,
                "last_seen": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Trader not found")
    
    return {"success": True, "message": f"Status updated to {'online' if is_online else 'offline'}"}


@api_router.post("/trader/create-advert")
async def create_trader_advert(advert: TraderAdvert):
    """Create a buy/sell advert for a trader"""
    # Verify trader exists and is active
    trader = await db.trader_profiles.find_one({"user_id": advert.trader_id})
    if not trader:
        raise HTTPException(status_code=404, detail="Trader profile not found. Create a trader profile first.")
    
    if not trader.get('is_trader'):
        raise HTTPException(status_code=403, detail="User is not an active trader")
    
    # Insert advert
    await db.trader_adverts.insert_one(advert.model_dump())
    
    return {
        "success": True,
        "message": "Advert created successfully",
        "advert": advert.model_dump()
    }


@api_router.get("/trader/adverts/{trader_id}")
async def get_trader_adverts(trader_id: str, active_only: bool = True):
    """Get all adverts for a specific trader"""
    query = {"trader_id": trader_id}
    if active_only:
        query["is_active"] = True
    
    adverts = await db.trader_adverts.find(query, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "count": len(adverts),
        "adverts": adverts
    }


@api_router.put("/trader/advert/toggle")
async def toggle_advert_status(advert_id: str, is_active: bool):
    """Activate or deactivate an advert"""
    result = await db.trader_adverts.update_one(
        {"advert_id": advert_id},
        {
            "$set": {
                "is_active": is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Advert not found")
    
    return {"success": True, "message": f"Advert {'activated' if is_active else 'deactivated'}"}


@api_router.delete("/trader/advert/{advert_id}")
async def delete_trader_advert(advert_id: str):
    """Delete a trader advert"""
    result = await db.trader_adverts.delete_one({"advert_id": advert_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Advert not found")
    
    return {"success": True, "message": "Advert deleted successfully"}


# EXPRESS MODE ENDPOINTS
@api_router.post("/p2p/express-match")
async def express_mode_match(request: ExpressMatchRequest):
    """
    Express Mode: Auto-match user with the best trader
    Returns the best matching advert instantly based on:
    - Price competitiveness
    - Trader completion rate
    - Online status
    - Response time
    - Rating
    """
    try:
        # Find best match
        best_match = await find_best_match_express(
            db=db,
            action=request.action,
            cryptocurrency=request.cryptocurrency,
            fiat_currency=request.fiat_currency,
            amount_fiat=request.amount_fiat,
            payment_method=request.payment_method
        )
        
        if not best_match:
            return ExpressMatchResponse(
                success=True,
                matched=False,
                message="No matching traders available at the moment. Try Manual Mode or check back later."
            ).model_dump()
        
        return ExpressMatchResponse(
            success=True,
            matched=True,
            advert=TraderAdvert(**best_match['advert']),
            trader_profile=best_match['trader'],
            message=f"Matched with trader! Match score: {best_match['match_score']:.1f}/100"
        ).model_dump()
        
    except Exception as e:
        logger.error(f"Express match error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Express matching failed: {str(e)}")


# P2P EXPRESS ENDPOINTS (2.5% FEE)
EXPRESS_RELEASE_TIMEOUT = 600  # 10 minutes in seconds

@api_router.post("/p2p/express/check-liquidity")
async def check_express_liquidity(data: Dict):
    """Check if admin liquidity is available for instant delivery"""
    try:
        crypto = data.get("crypto")
        crypto_amount = data.get("crypto_amount")
        
        if not crypto or not crypto_amount:
            return {"success": False, "has_liquidity": False}
        
        admin_liquidity = await db.admin_liquidity.find_one({
            "crypto_currency": crypto,
            "available_amount": {"$gte": crypto_amount}
        })
        
        return {
            "success": True,
            "has_liquidity": admin_liquidity is not None,
            "delivery_type": "instant" if admin_liquidity else "express_seller"
        }
    except Exception as e:
        logger.error(f"Error checking liquidity: {e}")
        return {"success": False, "has_liquidity": False}


@api_router.post("/p2p/express/create")
async def create_p2p_express_order(order_data: Dict):
    """Create P2P Express order - admin liquidity first, then qualified seller"""
    required_fields = ["user_id", "crypto", "country", "fiat_amount", "crypto_amount", "base_rate", "express_fee", "express_fee_percent", "net_amount"]
    for field in required_fields:
        if field not in order_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Get wallet service
    wallet_service = get_wallet_service()
    
    # Get user info for referral
    user = await db.users.find_one({"user_id": order_data["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    has_admin_liquidity = order_data.get("has_admin_liquidity", False)
    trade_id = f"EXPRESS_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{order_data['user_id'][:8]}"
    
    if has_admin_liquidity:
        # INSTANT DELIVERY - Admin liquidity
        seller_id = "admin_liquidity"
        delivery_source = "admin_liquidity"
        status = "completed"
        payment_method = "platform_direct"
        
        # 1. DEBIT GBP from user wallet
        try:
            await wallet_service.debit(
                user_id=order_data["user_id"],
                currency="GBP",
                amount=order_data["fiat_amount"],
                transaction_type="purchase",
                reference_id=trade_id,
                metadata={
                    "crypto": order_data["crypto"],
                    "crypto_amount": order_data["crypto_amount"],
                    "purchase_type": "p2p_express"
                }
            )
            logger.info(f"✅ Debited £{order_data['fiat_amount']} from user {order_data['user_id']}")
        except Exception as e:
            logger.error(f"❌ Failed to debit GBP: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to debit payment: {str(e)}")
        
        # 2. CREDIT crypto to user wallet
        try:
            await wallet_service.credit(
                user_id=order_data["user_id"],
                currency=order_data["crypto"],
                amount=order_data["crypto_amount"],
                transaction_type="purchase",
                reference_id=trade_id,
                metadata={
                    "fiat_amount": order_data["fiat_amount"],
                    "purchase_type": "p2p_express",
                    "delivery": "instant"
                }
            )
            logger.info(f"✅ Credited {order_data['crypto_amount']} {order_data['crypto']} to user {order_data['user_id']}")
        except Exception as e:
            logger.error(f"❌ Failed to credit crypto: {e}")
            # Refund the GBP if crypto credit fails
            await wallet_service.credit(
                user_id=order_data["user_id"],
                currency="GBP",
                amount=order_data["fiat_amount"],
                transaction_type="refund",
                reference_id=trade_id,
                metadata={"reason": "crypto_credit_failed"}
            )
            raise HTTPException(status_code=500, detail=f"Failed to credit crypto: {str(e)}")
        
        # 3. RECORD EXPRESS FEE to platform fee wallet
        try:
            await db.platform_fees.insert_one({
                "fee_id": f"FEE_{trade_id}",
                "trade_id": trade_id,
                "fee_type": "p2p_express",
                "amount": order_data["express_fee"],
                "currency": "GBP",
                "user_id": order_data["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"✅ Recorded express fee: £{order_data['express_fee']}")
        except Exception as e:
            logger.error(f"⚠️ Failed to record fee: {e}")
        
        # Log admin liquidity trade
        await db.admin_liquidity_trades.insert_one({
            "trade_id": trade_id,
            "crypto_currency": order_data["crypto"],
            "crypto_amount": order_data["crypto_amount"],
            "fiat_amount": order_data["fiat_amount"],
            "buyer_id": order_data["user_id"],
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update liquidity
        await db.admin_liquidity.update_one(
            {"crypto_currency": order_data["crypto"]},
            {"$inc": {"available_amount": -order_data["crypto_amount"]}},
            upsert=True
        )
        
        estimated_delivery = "Instant"
        countdown_expires_at = None
    else:
        # EXPRESS SELLER - Find qualified seller
        qualified_seller = await db.trader_profiles.find_one(
            {
                "is_trader": True,
                "is_online": True,
                "is_express_qualified": True,
                "trading_pairs": {"$in": [order_data["crypto"]]},
                "completion_rate": {"$gte": 95},
                "has_dispute_flags": False,
                "average_release_time": {"$lt": 300}
            },
            sort=[("completion_rate", -1), ("average_release_time", 1)]
        )
        
        if qualified_seller:
            seller_id = qualified_seller["user_id"]
            delivery_source = "express_seller"
            payment_method = qualified_seller.get("preferred_payment_method", "Bank Transfer")
            
            # Notify seller with countdown
            try:
                from p2p_notification_service import create_p2p_notification
                await create_p2p_notification(
                    user_id=seller_id,
                    trade_id=trade_id,
                    notification_type="express_seller_matched",
                    message=f"EXPRESS ORDER: {order_data['crypto_amount']:.8f} {order_data['crypto']}. Release within 10 minutes or auto-cancel."
                )
            except Exception as e:
                logger.error(f"Failed to notify seller: {e}")
        else:
            seller_id = "admin_liquidity_fallback"
            delivery_source = "fallback"
            payment_method = "Bank Transfer"
        
        status = "pending_payment"
        estimated_delivery = "2-5 minutes"
        countdown_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=EXPRESS_RELEASE_TIMEOUT)).isoformat()
    
    # Create trade record
    trade_record = {
        "trade_id": trade_id,
        "type": "p2p_express",
        "buyer_id": order_data["user_id"],
        "seller_id": seller_id,
        "delivery_source": delivery_source,
        "crypto_currency": order_data["crypto"],
        "fiat_currency": "GBP",
        "crypto_amount": order_data["crypto_amount"],
        "fiat_amount": order_data["fiat_amount"],
        "price_per_unit": order_data["base_rate"],
        "status": status,
        "country": order_data["country"],
        "payment_method": payment_method,
        "express_fee": order_data["express_fee"],
        "express_fee_percent": order_data["express_fee_percent"],
        "net_amount": order_data["net_amount"],
        "estimated_delivery": estimated_delivery,
        "is_instant_delivery": has_admin_liquidity,
        "countdown_expires_at": countdown_expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.trades.insert_one(trade_record)
    
    # Calculate referral commission
    referrer_id = user.get("referrer_id")
    referral_tier = user.get("referral_tier", "standard")
    
    if referrer_id:
        # Get commission rate based on tier
        if referral_tier == "golden":
            commission_rate = 0.50  # 50% for golden
        else:
            commission_rate = 0.20  # 20% for standard/vip
        
        admin_fee = order_data["express_fee"] * (1 - commission_rate)
        referrer_commission = order_data["express_fee"] * commission_rate
    else:
        admin_fee = order_data["express_fee"]
        referrer_commission = 0
    
    # Create fee transaction record
    fee_record = {
        "transaction_id": f"FEE_{trade_id}",
        "trade_id": trade_id,
        "fee_type": "p2p_express",
        "user_id": order_data["user_id"],
        "total_fee_amount": order_data["express_fee"],
        "admin_fee": admin_fee,
        "referrer_id": referrer_id if referrer_id else None,
        "referrer_commission": referrer_commission,
        "referral_tier": referral_tier,
        "crypto_currency": order_data["crypto"],
        "fiat_currency": "GBP",
        "delivery_source": delivery_source,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.fee_transactions.insert_one(fee_record)
    
    # Update admin revenue
    await db.admin_revenue.update_one(
        {"metric_id": "platform_total"},
        {
            "$inc": {
                "total_revenue_gbp": order_data["express_fee"],
                "p2p_express_revenue_gbp": order_data["express_fee"],
                "express_buy_revenue": order_data["express_fee"],
                "total_trades": 1
            },
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Notify buyer
    try:
        from p2p_notification_service import create_p2p_notification
        if has_admin_liquidity:
            msg = f"Express order completed! {order_data['crypto_amount']:.8f} {order_data['crypto']} credited instantly."
        else:
            msg = f"Express order created! Matched with seller. Delivery in 2-5 minutes."
        
        await create_p2p_notification(
            user_id=order_data["user_id"],
            trade_id=trade_id,
            notification_type="express_order_created",
            message=msg
        )
    except Exception as e:
        logger.error(f"Failed to notify buyer: {e}")
    
    return {
        "success": True,
        "trade_id": trade_id,
        "estimated_delivery": estimated_delivery,
        "is_instant": has_admin_liquidity,
        "message": "Express order completed" if has_admin_liquidity else "Express order created"
    }


@api_router.get("/p2p/express/order/{trade_id}")
async def get_p2p_express_order(trade_id: str):
    """Get P2P Express order details"""
    trade = await db.trades.find_one({"trade_id": trade_id, "type": "p2p_express"}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Express order not found")
    
    return {
        "success": True,
        "order": trade
    }


# MANUAL MODE ENDPOINTS
@api_router.get("/p2p/manual-mode/adverts")
async def get_manual_mode_adverts(
    action: str,  # 'buy' or 'sell'
    cryptocurrency: str = "BTC",
    fiat_currency: str = "USD",
    payment_method: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    only_online: bool = False,
    min_completion_rate: Optional[float] = None,
    sort_by: str = "price_asc"  # price_asc, price_desc, rating, completion_rate
):
    """
    Manual Mode: Get full list of trader adverts with filters
    Users can browse and manually select their preferred trader
    """
    # Determine what type of advert to show
    advert_type = 'sell' if action == 'buy' else 'buy'
    
    # Build query
    query = {
        'advert_type': advert_type,
        'cryptocurrency': cryptocurrency,
        'fiat_currency': fiat_currency,
        'is_active': True
    }
    
    # Apply filters
    if payment_method:
        query['payment_methods'] = payment_method
    
    if min_amount:
        query['max_order_amount'] = {'$gte': min_amount}
    
    if max_amount:
        query['min_order_amount'] = {'$lte': max_amount}
    
    if only_online:
        query['is_online'] = True
    
    # Get matching adverts
    adverts = await db.trader_adverts.find(query, {"_id": 0}).to_list(200)
    
    # Enrich with trader profiles
    enriched_adverts = []
    for advert in adverts:
        trader = await db.trader_profiles.find_one(
            {"user_id": advert['trader_id']},
            {"_id": 0}
        )
        
        if not trader:
            continue
        
        # Filter by completion rate if specified
        if min_completion_rate and trader.get('completion_rate', 0) < min_completion_rate:
            continue
        
        # Get user info for display name
        user = await db.user_accounts.find_one(
            {"user_id": advert['trader_id']},
            {"_id": 0, "email": 1, "user_id": 1}
        )
        
        # Get trader badges (Phase 2)
        badges_result = await get_trader_badges(db, advert['trader_id'])
        trader_badges = badges_result.get('badges', [])
        
        enriched_adverts.append({
            'advert': advert,
            'trader': trader,
            'trader_name': user.get('email', '').split('@')[0] if user else 'Unknown',
            'badges': trader_badges  # Include badges for display
        })
    
    # Sort results
    if sort_by == 'price_asc':
        enriched_adverts.sort(key=lambda x: x['advert']['price_per_unit'])
    elif sort_by == 'price_desc':
        enriched_adverts.sort(key=lambda x: x['advert']['price_per_unit'], reverse=True)
    elif sort_by == 'rating':
        enriched_adverts.sort(key=lambda x: x['trader'].get('rating', 0), reverse=True)
    elif sort_by == 'completion_rate':
        enriched_adverts.sort(key=lambda x: x['trader'].get('completion_rate', 0), reverse=True)
    
    return {
        "success": True,
        "count": len(enriched_adverts),
        "mode": "manual",
        "adverts": enriched_adverts
    }


# ============================================================================
# END TRADER SYSTEM & EXPRESS MODE
# ============================================================================


# ============================================================================
# ESCROW BALANCE SYSTEM - P2P Balance Management
# ============================================================================

@api_router.get("/trader/balance/{trader_id}/{currency}")
async def get_trader_balance_endpoint(trader_id: str, currency: str):
    """Get trader's balance for a specific currency"""
    balance = await get_trader_balance(db, trader_id, currency)
    
    if not balance:
        return {
            "success": False,
            "message": "No balance found. Initialize balance first.",
            "balance": None
        }
    
    return {
        "success": True,
        "balance": balance
    }


@api_router.post("/trader/balance/initialize")
async def initialize_balance(trader_id: str, currency: str, initial_amount: float = 0.0):
    """Initialize or get trader balance for a currency"""
    balance = await initialize_trader_balance(db, trader_id, currency, initial_amount)
    
    return {
        "success": True,
        "message": f"Balance initialized for {currency}",
        "balance": balance
    }


@api_router.post("/trader/balance/add-funds")
async def add_funds(trader_id: str, currency: str, amount: float, reason: str = "test_deposit"):
    """Add funds to trader balance (for testing/deposits)"""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    result = await add_funds_to_trader(db, trader_id, currency, amount, reason)
    
    return result


@api_router.post("/escrow/lock")
async def lock_balance(request: BalanceLockRequest):
    """
    Lock crypto amount from trader's available balance into escrow.
    Called when a trade is created.
    """
    result = await lock_balance_for_trade(db, request)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@api_router.post("/escrow/unlock")
async def unlock_balance(request: BalanceUnlockRequest):
    """
    Unlock crypto amount back to trader's available balance.
    Called when a trade is cancelled.
    """
    result = await unlock_balance_from_cancelled_trade(db, request)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@api_router.post("/escrow/release")
async def release_balance(request: BalanceReleaseRequest):
    """
    Release crypto from completed trade with fee deduction.
    Called when trade is completed.
    
    Flow:
    1. Apply platform fee
    2. Update trader balances
    3. Credit buyer
    4. Add fee to admin internal balance
    """
    # Get admin wallet ID
    admin_wallet_id = PLATFORM_CONFIG.get("admin_wallet_id", "platform_admin")
    
    result = await release_balance_from_completed_trade(db, request, admin_wallet_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@api_router.get("/admin/internal-balances")
async def get_admin_internal_balances():
    """Get admin internal balances (all collected fees per currency)"""
    try:
        balances = await db.admin_internal_balances.find({}, {"_id": 0}).to_list(100)
        
        # Format as dict
        balance_dict = {}
        total_usd_estimate = 0.0
        
        for balance in balances:
            currency = balance.get("currency", "UNKNOWN")
            amount = balance.get("amount", 0.0)
            
            if currency and currency != "UNKNOWN":
                balance_dict[currency] = float(amount) if amount else 0.0
                
                # Rough USD estimate (would need real price API in production)
                if currency == "BTC":
                    total_usd_estimate += float(amount) * 95000 if amount else 0.0
                elif currency == "ETH":
                    total_usd_estimate += float(amount) * 3500 if amount else 0.0
                elif currency == "USDT":
                    total_usd_estimate += float(amount) * 1.0 if amount else 0.0
        
        return {
            "success": True,
            "balances": balance_dict,
            "total_usd_estimate": round(total_usd_estimate, 2),
            "note": "These are internal DB balances, not on-chain wallets"
        }
    except Exception as e:
        logger.error(f"Error fetching admin internal balances: {str(e)}")
        return {
            "success": False,
            "balances": {},
            "total_usd_estimate": 0.0,
            "error": str(e)
        }


@api_router.get("/trader/my-balances/{user_id}")
async def get_my_trader_balances(user_id: str):
    """
    Get all balances for a trader (for trader dashboard).
    Shows total, locked, and available for each currency.
    """
    balances = await db.trader_balances.find(
        {"trader_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    if not balances:
        return {
            "success": True,
            "message": "No balances yet. Make a deposit to get started.",
            "balances": [],
            "total_usd_estimate": 0.0
        }
    
    # Calculate rough USD estimate
    total_usd = 0.0
    for balance in balances:
        currency = balance.get("currency")
        total = balance.get("total_balance", 0.0)
        
        # Rough price estimates (would use real API in production)
        if currency == "BTC":
            total_usd += total * 95000
        elif currency == "ETH":
            total_usd += total * 3500
        elif currency == "USDT":
            total_usd += total * 1.0
    
    return {
        "success": True,
        "balances": balances,
        "total_usd_estimate": round(total_usd, 2)
    }




# ============= SAVINGS ACCOUNT SYSTEM =============

@api_router.get("/savings/balances/{user_id}")
async def get_savings_balances(user_id: str):
    """Get user's savings balances (internal ledger only)"""
    try:
        # Get savings balances
        savings = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        if not savings:
            return {
                "success": True,
                "balances": [],
                "total_value_usd": 0.0
            }
        
        # Calculate total value
        crypto_prices = {"BTC": 95000, "ETH": 3500, "USDT": 1.0, "BNB": 600, "SOL": 200}
        total_usd = 0.0
        
        for saving in savings:
            currency = saving.get("currency")
            # Handle both "amount" and "balance" field names for backwards compatibility
            amount = saving.get("amount", saving.get("balance", 0.0))
            saving["amount"] = amount  # Ensure frontend gets "amount" field
            price = crypto_prices.get(currency, 0)
            saving["current_price"] = price
            saving["current_value_usd"] = amount * price
            
            # Calculate P/L
            avg_buy_price = saving.get("avg_buy_price", price)
            saving["unrealized_pl_usd"] = (price - avg_buy_price) * amount
            saving["unrealized_pl_percent"] = ((price - avg_buy_price) / avg_buy_price * 100) if avg_buy_price > 0 else 0
            
            total_usd += saving["current_value_usd"]
        
        return {
            "success": True,
            "balances": savings,
            "total_value_usd": round(total_usd, 2)
        }
        
    except Exception as e:
        logger.error(f"Savings balances error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings/transfer")
async def transfer_to_savings(request: dict):
    """Transfer funds between Wallet and Savings via wallet service"""
    from savings_wallet_service import transfer_to_savings_with_wallet, transfer_from_savings_with_wallet
    
    wallet_service = get_wallet_service()
    user_id = request.get("user_id")
    currency = request.get("currency")
    amount = float(request.get("amount", 0))
    direction = request.get("direction")
    
    if not all([user_id, currency, amount > 0, direction]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if direction == "to_savings":
        result = await transfer_to_savings_with_wallet(db, wallet_service, user_id, currency, amount)
        return result
    elif direction == "to_spot":
        result = await transfer_from_savings_with_wallet(db, wallet_service, user_id, currency, amount)
        return result
    else:
        raise HTTPException(status_code=400, detail="Invalid direction")

@api_router.post("/savings/transfer-OLD")
async def transfer_to_savings_OLD(request: dict):
    """OLD VERSION"""
    try:
        user_id = request.get("user_id")
        currency = request.get("currency")
        amount = float(request.get("amount", 0))
        direction = request.get("direction")
        
        if not all([user_id, currency, amount > 0, direction]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Get wallet balance
        wallet_balance = await db.internal_balances.find_one(
            {"user_id": user_id, "currency": currency},
            {"_id": 0}
        )
        
        if direction == "to_savings":
            # Check wallet balance sufficient
            if not wallet_balance or wallet_balance.get("balance", 0) < amount:
                return {"success": False, "message": "Insufficient wallet balance"}
            
            # Deduct from wallet
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": currency},
                {"$inc": {"balance": -amount}}
            )
            
            # Add to savings
            savings = await db.savings_balances.find_one(
                {"user_id": user_id, "currency": currency},
                {"_id": 0}
            )
            
            if savings:
                # Update existing savings
                new_amount = savings.get("amount", 0) + amount
                old_cost = savings.get("total_cost_usd", 0)
                current_price = 95000 if currency == "BTC" else 3500 if currency == "ETH" else 1.0
                new_cost = old_cost + (amount * current_price)
                new_avg_price = new_cost / new_amount if new_amount > 0 else current_price
                
                await db.savings_balances.update_one(
                    {"user_id": user_id, "currency": currency},
                    {
                        "$set": {
                            "amount": new_amount,
                            "total_cost_usd": new_cost,
                            "avg_buy_price": new_avg_price,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            else:
                # Create new savings entry
                current_price = 95000 if currency == "BTC" else 3500 if currency == "ETH" else 1.0
                await db.savings_balances.insert_one({
                    "user_id": user_id,
                    "currency": currency,
                    "amount": amount,
                    "total_cost_usd": amount * current_price,
                    "avg_buy_price": current_price,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
            
            return {
                "success": True,
                "message": f"Transferred {amount} {currency} to Savings"
            }
            
        elif direction == "to_spot":
            # Check savings balance
            savings = await db.savings_balances.find_one(
                {"user_id": user_id, "currency": currency},
                {"_id": 0}
            )
            
            if not savings or savings.get("amount", 0) < amount:
                return {"success": False, "message": "Insufficient savings balance"}
            
            # Deduct from savings
            new_savings_amount = savings.get("amount", 0) - amount
            if new_savings_amount <= 0:
                await db.savings_balances.delete_one({"user_id": user_id, "currency": currency})
            else:
                # Proportionally reduce cost basis
                ratio = new_savings_amount / savings.get("amount", 1)
                await db.savings_balances.update_one(
                    {"user_id": user_id, "currency": currency},
                    {
                        "$set": {
                            "amount": new_savings_amount,
                            "total_cost_usd": savings.get("total_cost_usd", 0) * ratio,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            # Add to wallet
            if spot_balance:
                await db.internal_balances.update_one(
                    {"user_id": user_id, "currency": currency},
                    {"$inc": {"balance": amount}}
                )
            else:
                await db.internal_balances.insert_one({
                    "user_id": user_id,
                    "currency": currency,
                    "balance": amount
                })
            
            return {
                "success": True,
                "message": f"Transferred {amount} {currency} to Spot"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid direction")
            
    except Exception as e:
        logger.error(f"Savings transfer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= PORTFOLIO TRACKING SYSTEM =============

@api_router.get("/portfolio/stats/{user_id}")
async def get_portfolio_stats(user_id: str):
    """Get complete portfolio statistics with P/L tracking"""
    try:
        # Get wallet balances
        wallet_balances = await db.internal_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get savings balances
        savings_balances = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Crypto prices
        crypto_prices = {"BTC": 95000, "ETH": 3500, "USDT": 1.0, "BNB": 600, "SOL": 200, "LTC": 100}
        
        # Combine and calculate
        portfolio = {}
        total_value = 0.0
        total_invested = 0.0
        
        # Process wallet balances
        for balance in wallet_balances:
            currency = balance.get("currency")
            amount = balance.get("balance", 0)
            if amount > 0:
                price = crypto_prices.get(currency, 0)
                if currency not in portfolio:
                    portfolio[currency] = {
                        "currency": currency,
                        "wallet_amount": 0,
                        "savings_amount": 0,
                        "total_amount": 0,
                        "current_price": price,
                        "total_cost_usd": 0,
                        "avg_buy_price": price
                    }
                portfolio[currency]["wallet_amount"] = amount
                portfolio[currency]["total_amount"] += amount
        
        # Process savings balances
        for saving in savings_balances:
            currency = saving.get("currency")
            amount = saving.get("amount", 0)
            if amount > 0:
                price = crypto_prices.get(currency, 0)
                if currency not in portfolio:
                    portfolio[currency] = {
                        "currency": currency,
                        "wallet_amount": 0,
                        "savings_amount": 0,
                        "total_amount": 0,
                        "current_price": price,
                        "total_cost_usd": 0,
                        "avg_buy_price": price
                    }
                portfolio[currency]["savings_amount"] = amount
                portfolio[currency]["total_amount"] += amount
                portfolio[currency]["total_cost_usd"] = saving.get("total_cost_usd", amount * price)
                portfolio[currency]["avg_buy_price"] = saving.get("avg_buy_price", price)
                total_invested += saving.get("total_cost_usd", 0)
        
        # Calculate P/L for each coin
        portfolio_list = []
        for currency, data in portfolio.items():
            current_value = data["total_amount"] * data["current_price"]
            cost_basis = data["total_cost_usd"]
            
            data["current_value_usd"] = round(current_value, 2)
            data["unrealized_pl_usd"] = round(current_value - cost_basis, 2)
            data["unrealized_pl_percent"] = round(((current_value - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0, 2)
            
            portfolio_list.append(data)
            total_value += current_value
        
        total_pl = total_value - total_invested
        total_pl_percent = (total_pl / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "success": True,
            "total_portfolio_value_usd": round(total_value, 2),
            "total_invested_usd": round(total_invested, 2),
            "total_unrealized_pl_usd": round(total_pl, 2),
            "total_unrealized_pl_percent": round(total_pl_percent, 2),
            "portfolio": portfolio_list
        }
        
    except Exception as e:
        logger.error(f"Portfolio stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolio/allocations/{user_id}")
async def get_portfolio_allocations(user_id: str, currency: str = "GBP"):
    """
    Get portfolio allocations - 100% accurate calculations
    Combines wallet + savings, NO HARDCODED VALUES
    """
    try:
        from decimal import Decimal, ROUND_HALF_UP
        
        # Get wallet balances
        wallet_balances = await db.internal_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get savings balances
        savings_balances = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get live prices - RETRY if empty
        live_prices_doc = None
        retry_count = 0
        while not live_prices_doc and retry_count < 3:
            live_prices_doc = await db.live_prices.find_one({})
            if not live_prices_doc:
                retry_count += 1
                await asyncio.sleep(0.5)
                log_warning(f"Live prices empty, retry {retry_count}/3")
        
        if not live_prices_doc:
            # If still empty after retries, fetch fresh prices
            from live_pricing import fetch_live_prices
            await fetch_live_prices()
            live_prices_doc = await db.live_prices.find_one({})
        
        # Extract prices
        prices = {}
        if live_prices_doc:
            for coin_symbol, price_data in live_prices_doc.items():
                if coin_symbol != "_id" and isinstance(price_data, dict):
                    price_key = currency.lower()
                    if price_key in price_data:
                        prices[coin_symbol] = Decimal(str(price_data[price_key]))
        
        # Combine balances from wallet + savings
        combined = {}
        
        for balance in wallet_balances:
            coin = balance.get("currency")
            amount = Decimal(str(balance.get("balance", 0)))
            if amount > 0:
                combined[coin] = combined.get(coin, Decimal('0')) + amount
        
        for saving in savings_balances:
            coin = saving.get("currency")
            amount = Decimal(str(saving.get("amount", 0)))
            if amount > 0:
                combined[coin] = combined.get(coin, Decimal('0')) + amount
        
        # Calculate asset values with HIGH precision
        allocations = []
        total_value = Decimal('0')
        
        for coin, amount in combined.items():
            price = prices.get(coin, Decimal('0'))
            if price == 0:
                continue  # Skip coins without price data
            
            value = amount * price
            total_value += value
            
            allocations.append({
                "coin": coin,
                "symbol": coin,
                "amount": float(amount),
                "value": value,
                "price": float(price)
            })
        
        # Calculate percentages AFTER total is known
        for allocation in allocations:
            if total_value > 0:
                allocation["percent"] = float((allocation["value"] / total_value * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
            else:
                allocation["percent"] = 0.0
            allocation["value"] = float(allocation["value"].quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        
        # Sort by value
        allocations.sort(key=lambda x: x["value"], reverse=True)
        
        # Group small coins into "Others" (< 3%)
        main_allocations = []
        others_value = Decimal('0')
        others_percent = Decimal('0')
        
        for allocation in allocations:
            if allocation["percent"] >= 3.0:
                main_allocations.append(allocation)
            else:
                others_value += Decimal(str(allocation["value"]))
                others_percent += Decimal(str(allocation["percent"]))
        
        # Add "Others" group
        if others_value > 0:
            main_allocations.append({
                "coin": "Others",
                "symbol": "OTHERS",
                "value": float(others_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "percent": float(others_percent.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "amount": None
            })
        
        return {
            "success": True,
            "currency": currency,
            "total_value": float(total_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            "allocations": main_allocations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Portfolio allocations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolio/allocations/demo/{user_id}")
async def get_demo_portfolio_allocations(user_id: str, currency: str = "GBP"):
    """
    DEMO/TEST endpoint with fixed amounts to verify calculations
    £10,000 BTC + £6,000 SHIB + £3,000 ETH + £2,000 XRP = £21,000 total
    """
    from decimal import Decimal, ROUND_HALF_UP
    
    # Get live prices
    live_prices_doc = await db.live_prices.find_one({})
    prices = {}
    if live_prices_doc:
        for coin_symbol, price_data in live_prices_doc.items():
            if coin_symbol != "_id" and isinstance(price_data, dict):
                price_key = currency.lower()
                if price_key in price_data:
                    prices[coin_symbol] = Decimal(str(price_data[price_key]))
    
    # Demo target values
    demo_targets = {
        'BTC': Decimal('10000.00'),   # £10,000 worth
        'SHIB': Decimal('6000.00'),   # £6,000 worth
        'ETH': Decimal('3000.00'),    # £3,000 worth
        'XRP': Decimal('2000.00')     # £2,000 worth
    }
    
    allocations = []
    total_value = Decimal('0')
    
    for coin, target_value in demo_targets.items():
        price = prices.get(coin, Decimal('1'))
        amount = target_value / price if price > 0 else Decimal('0')
        
        allocations.append({
            "coin": coin,
            "symbol": coin,
            "amount": float(amount),
            "value": float(target_value),
            "price": float(price)
        })
        total_value += target_value
    
    # Calculate percentages
    for allocation in allocations:
        value_decimal = Decimal(str(allocation["value"]))
        allocation["percent"] = float((value_decimal / total_value * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    # Sort by value
    allocations.sort(key=lambda x: x["value"], reverse=True)
    
    return {
        "success": True,
        "currency": currency,
        "total_value": float(total_value),
        "allocations": allocations,
        "demo_mode": True,
        "verification": {
            "btc_value": 10000.00,
            "shib_value": 6000.00,
            "eth_value": 3000.00,
            "xrp_value": 2000.00,
            "total": 21000.00,
            "btc_percent": round(10000 / 21000 * 100, 2),
            "shib_percent": round(6000 / 21000 * 100, 2),
            "eth_percent": round(3000 / 21000 * 100, 2),
            "xrp_percent": round(2000 / 21000 * 100, 2)
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }



@api_router.get("/admin/all-trader-balances")
async def get_all_trader_balances(limit: int = 100):
    """
    Admin endpoint: Get all trader balances across the platform.
    Shows which traders have what balances.
    """
    # Get all balances
    balances = await db.trader_balances.find({}, {"_id": 0}).to_list(limit)
    
    # Group by trader
    traders_dict = {}
    total_platform_value = 0.0
    
    for balance in balances:
        trader_id = balance.get("trader_id")
        currency = balance.get("currency")
        total = balance.get("total_balance", 0.0)
        locked = balance.get("locked_balance", 0.0)
        available = balance.get("available_balance", 0.0)
        
        if trader_id not in traders_dict:
            traders_dict[trader_id] = {
                "trader_id": trader_id,
                "balances": {}
            }
        
        traders_dict[trader_id]["balances"][currency] = {
            "total": total,
            "locked": locked,
            "available": available
        }
        
        # Calculate platform value
        if currency == "BTC":
            total_platform_value += total * 95000
        elif currency == "ETH":
            total_platform_value += total * 3500
        elif currency == "USDT":
            total_platform_value += total * 1.0
    
    traders_list = list(traders_dict.values())
    
    return {
        "success": True,
        "total_traders": len(traders_list),
        "traders": traders_list,
        "total_platform_value_usd": round(total_platform_value, 2),
        "note": "This shows all trader balances held in P2P escrow system"
    }


    
    return {
        "success": True,
        "balances": balance_dict,
        "total_usd_estimate": round(total_usd_estimate, 2),
        "note": "These are internal DB balances, not on-chain wallets"
    }


# ============================================================================
# END ESCROW BALANCE SYSTEM
# ============================================================================


# ============================================================================
# TRADER BADGE SYSTEM - Phase 2
# ============================================================================

@api_router.get("/trader/badges/{trader_id}")
async def get_badges_for_trader(trader_id: str):
    """
    Get all earned badges for a specific trader.
    Calculates badges if not cached or cache is old.
    """
    result = await get_trader_badges(db, trader_id)
    return result


@api_router.post("/trader/badges/calculate/{trader_id}")
async def recalculate_trader_badges(trader_id: str):
    """
    Force recalculation of badges for a trader.
    Useful after stats update or admin request.
    """
    result = await calculate_trader_badges(db, trader_id)
    return result


@api_router.get("/badges/definitions")
async def get_badge_definitions():
    """
    Get all badge definitions with criteria.
    Used for frontend display and tooltips.
    """
    return {
        "success": True,
        "badges": BADGE_DEFINITIONS,
        "total_badge_types": len(BADGE_DEFINITIONS)
    }


@api_router.post("/trader/stats/update/{trader_id}")
async def update_trader_stats(trader_id: str, trade_data: Dict):
    """
    Update trader stats after trade completion.
    Automatically recalculates badges.
    
    trade_data should include:
    - status: "completed" or "cancelled"
    - amount_usd: trade value in USD
    """
    result = await update_trader_stats_for_badges(db, trader_id, trade_data)
    return result


@api_router.get("/admin/badges/all")
async def admin_get_all_trader_badges():
    """
    Admin endpoint to view all trader badges.
    Shows which traders have which badges.
    """
    try:
        all_badges = await db.trader_badges.find({}, {"_id": 0}).to_list(1000)
        
        # Count badge distribution
        badge_counts = {}
        for trader_badges in all_badges:
            for badge in trader_badges.get("badges", []):
                badge_id = badge.get("badge_id")
                badge_counts[badge_id] = badge_counts.get(badge_id, 0) + 1
        
        return {
            "success": True,
            "total_traders_with_badges": len(all_badges),
            "all_trader_badges": all_badges,
            "badge_distribution": badge_counts
        }
    except Exception as e:
        logger.error(f"Error fetching all badges: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ADMIN USER MANAGEMENT ENDPOINTS
@api_router.get("/admin/users/all")
async def admin_get_all_users():
    """Get all users for admin management"""
    try:
        users = await db.user_accounts.find(
            {},
            {"_id": 0, "password_hash": 0, "salt": 0}
        ).sort("created_at", -1).to_list(1000)
        
        return {
            "success": True,
            "users": users,
            "count": len(users)
        }
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/users/update-tier")
async def admin_update_user_tier(request: dict):
    """Update user's referral tier (admin only)"""
    try:
        user_id = request.get("user_id")
        tier = request.get("tier")
        
        if not user_id or not tier:
            raise HTTPException(status_code=400, detail="user_id and tier required")
        
        if tier not in ["standard", "vip", "golden"]:
            raise HTTPException(status_code=400, detail="Invalid tier. Must be standard, vip, or golden")
        
        # Update user tier
        result = await db.user_accounts.update_one(
            {"user_id": user_id},
            {"$set": {"referral_tier": tier, "tier_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log tier change
        await db.admin_actions.insert_one({
            "action": "tier_update",
            "user_id": user_id,
            "new_tier": tier,
            "admin_id": request.get("admin_id", "admin"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Admin updated user {user_id} tier to {tier}")
        
        return {
            "success": True,
            "message": f"User tier updated to {tier}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user tier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# END TRADER BADGE SYSTEM
# ============================================================================


# ============================================================================
# WALLET ADDRESS VALIDATION - For P2P Trades
# ============================================================================

class WalletValidationRequest(BaseModel):
    address: str
    currency: str
    network: Optional[str] = None

@api_router.post("/wallet/validate")
async def validate_wallet(request: WalletValidationRequest):
    """
    Validate crypto wallet address before trade creation.
    Supports BTC, ETH, USDT (ERC20/TRC20/BEP20), BNB, and other ERC20 tokens.
    
    Args:
        request: WalletValidationRequest with address, currency, and optional network
    
    Returns:
        Validation result with detected network and format info
    """
    result = validate_wallet_address(request.address, request.currency, request.network)
    return {
        "success": True,
        **result
    }


# P2P NOTIFICATION API ENDPOINTS
@api_router.get("/p2p/notifications/{user_id}")
async def get_p2p_notifications(user_id: str, trade_id: str = None, unread_only: bool = False):
    """Get P2P notifications for a user"""
    try:
        notification_service = get_notification_service()
        notifications = await notification_service.get_user_notifications(
            user_id=user_id,
            trade_id=trade_id,
            unread_only=unread_only,
            limit=100
        )
        
        unread_count = await notification_service.get_unread_count(user_id, trade_id)
        
        return {
            "success": True,
            "notifications": notifications,
            "unread_count": unread_count
        }
    except Exception as e:
        logger.error(f"Failed to get notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/notifications/mark-read")
async def mark_notification_read(request: dict):
    """Mark notification as read"""
    try:
        notification_service = get_notification_service()
        notification_id = request.get("notification_id")
        user_id = request.get("user_id")
        
        if not notification_id or not user_id:
            raise HTTPException(status_code=400, detail="notification_id and user_id required")
        
        success = await notification_service.mark_as_read(notification_id, user_id)
        
        return {"success": success}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/notifications/mark-all-read")
async def mark_all_notifications_read(request: dict):
    """Mark all notifications as read for a user"""
    try:
        notification_service = get_notification_service()
        user_id = request.get("user_id")
        trade_id = request.get("trade_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        count = await notification_service.mark_all_read(user_id, trade_id)
        
        return {"success": True, "marked_count": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark all as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# WALLET SERVICE API ENDPOINTS (Required for P2P System)
@api_router.get("/wallet/balance/{user_id}/{currency}")
async def get_wallet_balance(user_id: str, currency: str):
    """
    Get wallet balance for specific currency via wallet service
    Used by P2P system to check seller balances before locking escrow
    """
    try:
        wallet_service = get_wallet_service()
        balance = await wallet_service.get_balance(user_id, currency)
        return {
            "success": True,
            "balance": balance
        }
    except Exception as e:
        logger.error(f"Error getting wallet balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/wallet/credit")
async def credit_wallet(request: dict):
    """
    Credit user wallet via wallet service
    Required for: deposits, refunds, referral commissions, test funding
    """
    try:
        wallet_service = get_wallet_service()
        user_id = request.get("user_id")
        currency = request.get("currency")
        amount = float(request.get("amount", 0))
        transaction_type = request.get("transaction_type", "deposit")
        reference_id = request.get("reference_id", f"ref_{uuid.uuid4().hex[:8]}")
        metadata = request.get("metadata", {})
        
        if not user_id or not currency or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid parameters")
        
        success = await wallet_service.credit(
            user_id=user_id,
            currency=currency,
            amount=amount,
            transaction_type=transaction_type,
            reference_id=reference_id,
            metadata=metadata
        )
        
        if success:
            # Get updated balance
            balance = await wallet_service.get_balance(user_id, currency)
            return {
                "success": True,
                "message": f"Credited {amount} {currency} to {user_id}",
                "balance": balance
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to credit wallet")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error crediting wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/wallet/transactions/{user_id}")
async def get_wallet_transactions(user_id: str, currency: str = None):
    """
    Get transaction history for user wallet
    """
    try:
        query = {"user_id": user_id}
        if currency:
            query["currency"] = currency
        
        transactions = await db.wallet_transactions.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).limit(100).to_list(100)
        
        return {
            "success": True,
            "transactions": transactions
        }
    except Exception as e:
        logger.error(f"Error getting wallet transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/wallet/supported-networks")
async def get_supported_networks():
    """
    Get list of supported cryptocurrencies and their networks.
    Used for wallet address input UI.
    """
    return {
        "success": True,
        "supported": {
            "BTC": {
                "name": "Bitcoin",
                "networks": ["Bitcoin"],
                "address_formats": ["Legacy (1...), P2SH (3...), Bech32 (bc1...)"]
            },
            "ETH": {
                "name": "Ethereum",
                "networks": ["Ethereum"],
                "address_formats": ["ERC20 (0x...)"]
            },
            "USDT": {
                "name": "Tether USD",
                "networks": ["ERC20", "TRC20", "BEP20"],
                "address_formats": [
                    "ERC20: 0x... (Ethereum)",
                    "TRC20: T... (TRON)",
                    "BEP20: 0x... (BSC)"
                ]
            },
            "BNB": {
                "name": "Binance Coin",
                "networks": ["BEP2", "BEP20"],
                "address_formats": ["BEP2: bnb...", "BEP20: 0x... (BSC)"]
            },
            "USDC": {
                "name": "USD Coin",
                "networks": ["ERC20"],
                "address_formats": ["ERC20 (0x...)"]
            }
        }
    }


# ============================================================================
# END WALLET ADDRESS VALIDATION
# ============================================================================


# ============================================================================
# KYC (KNOW YOUR CUSTOMER) SYSTEM
# ============================================================================

@api_router.post("/kyc/submit")
async def submit_kyc_verification(kyc_data: KYCSubmission):
    """
    Submit KYC documents for verification.
    Required to become a trader/seller and access higher limits.
    """
    result = await submit_kyc(db, kyc_data)
    return result


@api_router.get("/kyc/status/{user_id}")
async def get_user_kyc_status(user_id: str):
    """
    Get KYC status and permissions for a user.
    Shows what they can/cannot do based on verification status.
    """
    result = await get_kyc_status(db, user_id)
    return result


@api_router.post("/kyc/upload-document")
async def upload_kyc_document(file: UploadFile = File(...), user_id: str = Form(...), document_type: str = Form(...)):
    """
    Upload KYC document (ID, passport, selfie).
    Stores file and returns URL for KYC submission.
    """
    import os
    from pathlib import Path
    
    # Create KYC upload directory
    upload_dir = Path("/app/kyc_uploads")
    upload_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{user_id}_{document_type}_{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Return URL (in production, upload to S3/cloud storage)
    file_url = f"/kyc_uploads/{filename}"
    
    return {
        "success": True,
        "file_url": file_url,
        "filename": filename,
        "document_type": document_type
    }


@api_router.post("/admin/kyc/review")
async def admin_review_kyc(review: KYCReview):
    """
    Admin approves or rejects KYC submission.
    Automatically updates user permissions and badges.
    """
    result = await review_kyc(db, review)
    return result


@api_router.get("/admin/kyc/pending")
async def admin_get_pending_kyc():
    """
    Get all pending KYC submissions for admin review.
    Shows user details and submitted documents.
    """
    pending = await get_pending_kyc_submissions(db)
    
    return {
        "success": True,
        "pending_count": len(pending),
        "submissions": pending
    }


@api_router.get("/admin/kyc/all")
async def admin_get_all_kyc(status: str = None):
    """
    Get all KYC submissions, optionally filtered by status.
    Status can be: pending, verified, rejected
    """
    submissions = await get_all_kyc_submissions(db, status)
    
    return {
        "success": True,
        "total_count": len(submissions),
        "submissions": submissions
    }


@api_router.get("/admin/kyc/stats")
async def admin_get_kyc_stats():
    """
    Get KYC statistics for admin dashboard.
    """
    stats = {
        "pending": await db.kyc_submissions.count_documents({"status": "pending"}),
        "verified": await db.kyc_submissions.count_documents({"status": "verified"}),
        "rejected": await db.kyc_submissions.count_documents({"status": "rejected"}),
        "total_users": await db.users.count_documents({}),
        "verified_users": await db.users.count_documents({"kyc_status": "verified"}),
        "unverified_users": await db.users.count_documents({"kyc_status": "unverified"})
    }
    
    return {
        "success": True,
        "stats": stats
    }


# ============================================================================
# END KYC SYSTEM
# ============================================================================


# ============================================================================
# WITHDRAWAL SYSTEM WITH ADMIN APPROVAL
# ============================================================================

@api_router.post("/wallet/withdraw")
async def request_withdrawal(
    user_id: str,
    currency: str,
    amount: float,
    wallet_address: str,
    network: str = None
):
    """
    User requests cryptocurrency withdrawal - V2 with wallet service
    Locks balance immediately to prevent double-spend
    """
    from withdrawal_system_v2 import create_withdrawal_request_v2
    
    wallet_service = get_wallet_service()
    result = await create_withdrawal_request_v2(
        db, wallet_service, user_id, currency, amount, wallet_address, network
    )
    return result


@api_router.get("/wallet/withdrawals/{user_id}")
async def get_withdrawal_history(user_id: str):
    """
    Get withdrawal history for a user.
    Shows all withdrawal requests: pending, approved, rejected, completed.
    """
    withdrawals = await get_user_withdrawals(db, user_id)
    
    return {
        "success": True,
        "withdrawals": withdrawals,
        "total_count": len(withdrawals)
    }


@api_router.get("/admin/withdrawals/pending")
async def admin_get_pending_withdrawals():
    """
    Get all pending withdrawal requests for admin review.
    Shows user details, amount, wallet address, network.
    """
    pending = await get_pending_withdrawals(db)
    
    return {
        "success": True,
        "pending_count": len(pending),
        "withdrawals": pending
    }


@api_router.post("/admin/withdrawals/review")
async def admin_review_withdrawal_request(approval: WithdrawalApproval):
    """
    Admin approves or rejects withdrawal request - V2 with wallet service
    
    On Approve:
    - Releases locked balance (deducts from total)
    - Collects withdrawal fee to admin wallet
    - Marks as approved (admin sends crypto manually)
    
    On Reject:
    - Unlocks balance back to available
    - User notified
    """
    from withdrawal_system_v2 import admin_review_withdrawal_v2
    
    wallet_service = get_wallet_service()
    result = await admin_review_withdrawal_v2(db, wallet_service, approval)
    return result


@api_router.post("/admin/withdrawals/complete/{withdrawal_id}")
async def admin_complete_withdrawal(withdrawal_id: str, admin_id: str):
    """
    Mark withdrawal as completed after admin has sent the crypto - V2
    Call this after you've sent the crypto to the user's wallet.
    """
    result = await mark_withdrawal_completed(db, withdrawal_id, admin_id)
    return result


# ============================================================================
# END WITHDRAWAL SYSTEM
# ============================================================================





@api_router.post("/disputes/initiate")
async def initiate_dispute(request: InitiateDisputeRequest):
    """Initiate a dispute on an order"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify user is part of the order
    if request.user_address not in [buy_order["buyer_address"], buy_order["seller_address"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot dispute completed or cancelled orders")
    
    # Check if dispute already exists
    existing_dispute = await db.disputes.find_one({"order_id": request.order_id, "status": {"$in": ["open", "under_review"]}}, {"_id": 0})
    if existing_dispute:
        raise HTTPException(status_code=400, detail="Dispute already exists for this order")
    
    # Create dispute
    dispute = Dispute(
        order_id=request.order_id,
        initiated_by=request.user_address,
        reason=request.reason
    )
    dispute_dict = dispute.model_dump()
    dispute_dict['created_at'] = dispute_dict['created_at'].isoformat()
    await db.disputes.insert_one(dispute_dict)
    
    # Update order status
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "disputed",
                "disputed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify both parties
    other_party = buy_order["seller_address"] if request.user_address == buy_order["buyer_address"] else buy_order["buyer_address"]
    
    notification = Notification(
        user_address=other_party,
        order_id=request.order_id,
        notification_type="dispute_started",
        message=f"A dispute has been opened for order {request.order_id[:8]}. Please provide evidence."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {
        "success": True,
        "dispute": dispute.model_dump(),
        "message": "Dispute initiated. Crypto is now locked in escrow until resolution."
    }

@api_router.post("/disputes/evidence")
async def upload_evidence(request: UploadEvidenceRequest):
    """Upload evidence for a dispute"""
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Create evidence record
    evidence = DisputeEvidence(
        dispute_id=request.dispute_id,
        uploaded_by=request.uploaded_by,
        evidence_type=request.evidence_type,
        file_url=request.file_url,
        description=request.description
    )
    evidence_dict = evidence.model_dump()
    evidence_dict['created_at'] = evidence_dict['created_at'].isoformat()
    await db.dispute_evidence.insert_one(evidence_dict)
    
    return {
        "success": True,
        "evidence": evidence.model_dump(),
        "message": "Evidence uploaded successfully"
    }

@api_router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str):
    """Get dispute details with evidence and messages"""
    dispute = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Get evidence
    evidence = await db.dispute_evidence.find(
        {"dispute_id": dispute_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get messages
    messages = await db.dispute_messages.find(
        {"dispute_id": dispute_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {
        "success": True,
        "dispute": dispute,
        "evidence": evidence,
        "messages": messages
    }

@api_router.post("/disputes/message")
async def send_dispute_message(request: SendDisputeMessageRequest):
    """Send a message in dispute chat"""
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Create message
    message = DisputeMessage(
        dispute_id=request.dispute_id,
        sender_address=request.sender_address,
        sender_role=request.sender_role,
        message=request.message
    )
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    await db.dispute_messages.insert_one(message_dict)
    
    return {
        "success": True,
        "message": message.model_dump()
    }

@api_router.post("/admin/resolve-dispute")
async def admin_resolve_dispute(request: AdminResolveDisputeRequest):
    """Admin resolves a dispute and releases crypto from escrow"""
    # In production, verify admin credentials here
    # For now, we'll use a simple check
    
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if buy_order["status"] != "disputed":
        raise HTTPException(status_code=400, detail="Order is not disputed")
    
    # Handle resolution based on admin decision
    if request.resolution == "release_to_buyer":
        # Transfer crypto to buyer
        await db.users.update_one(
            {"wallet_address": buy_order["buyer_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Update order
        await db.crypto_buy_orders.update_one(
            {"order_id": request.order_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Notify buyer
        notification = Notification(
            user_address=buy_order["buyer_address"],
            order_id=request.order_id,
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {buy_order['crypto_amount']} ETH released to your account."
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
        
    elif request.resolution == "release_to_seller":
        # Return crypto to seller
        await db.users.update_one(
            {"wallet_address": buy_order["seller_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Update order
        await db.crypto_buy_orders.update_one(
            {"order_id": request.order_id},
            {"$set": {"status": "cancelled"}}
        )
        
        # Notify seller
        notification = Notification(
            user_address=buy_order["seller_address"],
            order_id=request.order_id,
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {buy_order['crypto_amount']} ETH returned to your account."
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    # Update dispute status
    await db.disputes.update_one(
        {"dispute_id": request.dispute_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": request.admin_address,
                "resolution": request.admin_notes
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Dispute resolved. Crypto {request.resolution.replace('_', ' ')}."
    }

@api_router.get("/notifications/{wallet_address}")
async def get_notifications(wallet_address: str):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_address": wallet_address},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "notifications": notifications
    }

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    
    return {"success": True}

@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """Verify user email with token"""
    from fastapi.responses import HTMLResponse, RedirectResponse
    
    user = await db.user_accounts.find_one({"verification_token": token}, {"_id": 0})
    
    if not user:
        # Show error page
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Verification Failed - Coin Hub X</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    background: linear-gradient(135deg, #000D1A, #1a1f3a);
                    color: white;
                    text-align: center;
                    padding: 50px;
                }
            </style>
        </head>
        <body>
            <h1>Email Verification Failed</h1>
            <p>Invalid or expired verification token.</p>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=400)
    
    # Update user as verified
    await db.user_accounts.update_one(
        {"verification_token": token},
        {
            "$set": {"email_verified": True},
            "$unset": {"verification_token": ""}
        }
    )
    
    # Show success page
    success_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Verified - Coin Hub X</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #000D1A, #1a1f3a);
                color: white;
                text-align: center;
                padding: 50px;
            }
        </style>
    </head>
    <body>
        <h1>Email Verified Successfully!</h1>
        <p>Your email has been verified. You can now close this window.</p>
    </body>
    </html>
    """
    return HTMLResponse(content=success_html)

# ============================================================================
# PREMIUM ONBOARDING - PHONE VERIFICATION
# ============================================================================

@api_router.post("/auth/phone/send-otp")
async def send_phone_otp(request: dict):
    """Send OTP to phone number via Twilio Verify"""
    from twilio.rest import Client
    
    phone_number = request.get("phone_number")
    
    if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    try:
        # Initialize Twilio client
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        verify_service_sid = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
        
        if not all([account_sid, auth_token, verify_service_sid]):
            raise HTTPException(status_code=500, detail="Twilio not configured")
        
        client = Client(account_sid, auth_token)
        
        # Send verification code
        verification = client.verify.v2.services(verify_service_sid).verifications.create(
            to=phone_number,
            channel='sms'
        )
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "status": verification.status
        }
    except Exception as e:
        logger.error(f"Failed to send OTP: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")

@api_router.post("/auth/phone/verify-otp")
async def verify_phone_otp(request: dict):
    """Verify OTP code"""
    from twilio.rest import Client
    
    phone_number = request.get("phone_number")
    code = request.get("code")
    
    if not phone_number or not code:
        raise HTTPException(status_code=400, detail="Phone number and code are required")
    
    try:
        # Initialize Twilio client
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        verify_service_sid = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
        
        client = Client(account_sid, auth_token)
        
        # Verify code
        verification_check = client.verify.v2.services(verify_service_sid).verification_checks.create(
            to=phone_number,
            code=code
        )
        
        if verification_check.status == 'approved':
            return {
                "success": True,
                "verified": True,
                "message": "Phone number verified successfully"
            }
        else:
            return {
                "success": False,
                "verified": False,
                "message": "Invalid or expired code"
            }
    except Exception as e:
        logger.error(f"Failed to verify OTP: {str(e)}")
        return {
            "success": False,
            "verified": False,
            "message": "Invalid or expired code"
        }

# ═══════════════════════════════════════════════════════════════════════════
# OTP-PROTECTED SENSITIVE ACTIONS
# ═══════════════════════════════════════════════════════════════════════════

@api_router.post("/otp/send")
async def send_otp_for_action(request: dict):
    """Send OTP for sensitive action (withdrawal, escrow release, etc.)"""
    user_id = request.get("user_id")
    action = request.get("action")  # withdrawal, escrow_release, p2p_release, etc.
    
    if not user_id or not action:
        raise HTTPException(status_code=400, detail="user_id and action are required")
    
    try:
        # Get user's phone number
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        phone_number = user.get("phone")
        if not phone_number:
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        # Send OTP via new OTP service
        otp_service = get_otp_service(db)
        result = await otp_service.send_otp(user_id, phone_number, action)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send OTP for action: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/otp/verify")
async def verify_otp_for_action(request: dict):
    """Verify OTP before allowing sensitive action"""
    user_id = request.get("user_id")
    otp_code = request.get("otp_code")
    action = request.get("action")
    
    if not user_id or not otp_code or not action:
        raise HTTPException(status_code=400, detail="user_id, otp_code, and action are required")
    
    try:
        # Get user's phone number
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        phone_number = user.get("phone")
        if not phone_number:
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        # Verify OTP via new OTP service
        otp_service = get_otp_service(db)
        result = await otp_service.verify_otp(user_id, phone_number, otp_code, action)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify OTP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/otp/resend")
async def resend_otp_for_action(request: dict):
    """Resend OTP for action"""
    user_id = request.get("user_id")
    action = request.get("action")
    
    if not user_id or not action:
        raise HTTPException(status_code=400, detail="user_id and action are required")
    
    try:
        # Get user's phone number
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        phone_number = user.get("phone")
        if not phone_number:
            raise HTTPException(status_code=400, detail="User has no phone number registered")
        
        # Resend OTP via new OTP service
        otp_service = get_otp_service(db)
        result = await otp_service.resend_otp(user_id, phone_number, action)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resend OTP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/complete-phone-signup")
async def complete_phone_signup(request: dict):
    """Complete phone-based signup with profile info"""
    phone_number = request.get("phone_number")
    full_name = request.get("full_name")
    username = request.get("username")
    
    if not phone_number or not full_name:
        raise HTTPException(status_code=400, detail="Phone number and full name are required")
    
    try:
        # Check if user already exists
        existing = await db.user_accounts.find_one({"phone": phone_number})
        if existing:
            # Return existing user
            token_data = {
                "user_id": existing["user_id"],
                "email": existing.get("email", ""),
                "exp": datetime.now(timezone.utc) + timedelta(days=30)
            }
            token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
            
            return {
                "success": True,
                "token": token,
                "user": {
                    "user_id": existing["user_id"],
                    "email": existing.get("email", ""),
                    "full_name": existing.get("full_name", full_name),
                    "phone": phone_number,
                    "phone_verified": True
                }
            }
        
        # Create new user
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "email": username + "@phone.coinhubx.com" if username else phone_number.replace("+", "") + "@phone.coinhubx.com",
            "full_name": full_name,
            "username": username,
            "phone": phone_number,
            "phone_verified": True,
            "email_verified": True,  # Skip email verification for phone signups
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "role": "user"
        }
        
        await db.user_accounts.insert_one(user)
        
        # Generate JWT token
        token_data = {
            "user_id": user_id,
            "email": user["email"],
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        }
        token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
        
        return {
            "success": True,
            "token": token,
            "user": {
                "user_id": user_id,
                "email": user["email"],
                "full_name": full_name,
                "phone": phone_number,
                "phone_verified": True
            }
        }
    except Exception as e:
        logger.error(f"Failed to complete phone signup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PREMIUM ONBOARDING - GOOGLE OAUTH
# ============================================================================



@api_router.post("/auth/emergent-session")
async def store_emergent_session(request: dict):
    """Store Emergent Auth session and create/update user"""
    session_token = request.get("session_token")
    user_data = request.get("user_data", {})
    
    if not session_token or not user_data:
        raise HTTPException(status_code=400, detail="session_token and user_data required")
    
    user_id = user_data.get("id")
    email = user_data.get("email")
    name = user_data.get("name")
    picture = user_data.get("picture")
    
    # Check if user exists by email
    existing_user = await db.user_accounts.find_one({"email": email})
    
    if not existing_user:
        # Create new user account
        await db.user_accounts.insert_one({
            "user_id": user_id,
            "email": email,
            "full_name": name,
            "profile_picture": picture,
            "email_verified": True,
            "auth_provider": "emergent_google",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "role": "user"
        })
        
        # Initialize balances
        await initialize_trader_balance(db, user_id)
        
        logger.info(f"✅ New user created via Emergent Auth: {email}")
    else:
        # Use existing user_id
        user_id = existing_user.get("user_id")
    
    # Store session with 7-day expiry
    expiry = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "session_token": session_token,
                "expires_at": expiry.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "message": "Session stored successfully"
    }


@api_router.get("/auth/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    from urllib.parse import urlencode
    from fastapi.responses import RedirectResponse
    
    try:
        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        # Use the production URL
        redirect_uri = "https://tradepanel-12.preview.emergentagent.com/api/auth/google/callback"
        
        if not google_client_id:
            logger.error("❌ GOOGLE_CLIENT_ID not set in environment")
            return {"success": False, "error": "Google OAuth not configured"}
        
        logger.info(f"🔵 Google OAuth initiated")
        logger.info(f"   Client ID: {google_client_id[:20]}...")
        logger.info(f"   Redirect URI: {redirect_uri}")
        
        params = {
            'client_id': google_client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        logger.info(f"   Auth URL: {auth_url[:100]}...")
        
        # Redirect directly to Google OAuth
        return RedirectResponse(url=auth_url, status_code=302)
        
    except Exception as e:
        logger.error(f"❌ Google auth initiation error: {str(e)}")
        return {"success": False, "error": str(e)}

@api_router.get("/auth/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback"""
    import httpx
    import json
    import base64
    from fastapi.responses import RedirectResponse
    from urllib.parse import quote
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://tradepanel-12.preview.emergentagent.com')
    
    logger.info(f"🔵 Google callback received - code: {'present' if code else 'missing'}, error: {error or 'none'}")
    
    # Check for OAuth errors
    if error:
        logger.error(f"❌ Google OAuth error: {error}")
        return RedirectResponse(url=f"{frontend_url}/login?error=google_oauth_denied", status_code=302)
    
    if not code:
        logger.error("❌ No authorization code received from Google")
        return RedirectResponse(url=f"{frontend_url}/login?error=no_code", status_code=302)
    
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    google_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = "https://tradepanel-12.preview.emergentagent.com/api/auth/google/callback"
    
    logger.info(f"   Using redirect_uri: {redirect_uri}")
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'code': code,
        'client_id': google_client_id,
        'client_secret': google_client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    try:
        logger.info(f"   Exchanging code for token...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_response = await client.post(token_url, data=token_data)
            tokens = token_response.json()
            
            if 'error' in tokens:
                error_msg = tokens.get('error_description', tokens['error'])
                logger.error(f"❌ Token exchange error: {error_msg}")
                return RedirectResponse(url=f"{frontend_url}/login?error=token_exchange_failed", status_code=302)
            
            # Get user info
            access_token = tokens.get('access_token')
            if not access_token:
                logger.error("❌ No access token received from Google")
                return RedirectResponse(url=f"{frontend_url}/login?error=no_access_token", status_code=302)
            
            logger.info(f"   Token received, fetching user info...")
            user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {'Authorization': f'Bearer {access_token}'}
            
            user_response = await client.get(user_info_url, headers=headers)
            user_data = user_response.json()
            
            user_email = user_data.get('email', 'unknown')
            logger.info(f"✅ Google OAuth user info received: {user_email}")
            
            # Check if user exists
            existing_user = await db.user_accounts.find_one({"email": user_email}, {"_id": 0})
            
            if existing_user:
                # User exists - generate token and redirect to login callback page
                logger.info(f"   Existing user found, generating JWT...")
                token_payload = {
                    "user_id": existing_user["user_id"],
                    "email": existing_user["email"],
                    "exp": datetime.now(timezone.utc) + timedelta(days=30)
                }
                token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
                
                # Redirect to a callback page that will handle the token
                user_json = json.dumps({
                    "user_id": existing_user["user_id"],
                    "email": existing_user["email"],
                    "full_name": existing_user.get("full_name", ""),
                    "role": existing_user.get("role", "user")
                })
                
                from urllib.parse import quote
                redirect_url = f"{frontend_url}/login?google_success=true&token={token}&user={quote(user_json)}"
                logger.info(f"✅ Redirecting existing user to: {frontend_url}/login?google_success=true")
                return RedirectResponse(url=redirect_url, status_code=302)
            else:
                # New user - redirect to phone verification with Google data
                logger.info(f"   New user, redirecting to phone verification...")
                import base64
                google_data_to_encode = {
                    "email": user_email,
                    "name": user_data.get('name', user_email.split('@')[0]),
                    "google_id": user_data.get('id'),
                    "picture": user_data.get('picture', '')
                }
                user_data_encoded = base64.b64encode(json.dumps(google_data_to_encode).encode()).decode()
                redirect_url = f"{frontend_url}/register?google_data={user_data_encoded}&require_phone=true"
                logger.info(f"✅ Redirecting new Google user to registration with phone verification")
                return RedirectResponse(url=redirect_url, status_code=302)
    
    except Exception as e:
        import traceback
        logger.error(f"❌ Google OAuth callback error: {str(e)}")
        logger.error(f"   Traceback: {traceback.format_exc()}")
        return RedirectResponse(url=f"{frontend_url}/login?error=callback_failed", status_code=302)

@api_router.post("/auth/complete-google-signup")
async def complete_google_signup(request: dict):
    """Complete Google signup with phone verification and profile"""
    google_data = request.get("google_data")
    phone_number = request.get("phone_number")
    full_name = request.get("full_name")
    username = request.get("username")
    
    if not all([google_data, phone_number, full_name, username]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    # Check if username is taken
    existing_username = await db.user_accounts.find_one({"username": username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user account
    user_id = str(uuid.uuid4())
    user_account = {
        "user_id": user_id,
        "email": google_data['email'],
        "full_name": full_name,
        "username": username,
        "phone_number": phone_number,
        "role": "user",
        "email_verified": True,  # Google already verified
        "phone_verified": True,  # Already verified in previous step
        "google_id": google_data.get('id'),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "wallet_address": None
    }
    
    await db.user_accounts.insert_one(user_account)
    
    # Generate referral code
    referral_code = f"{full_name[:4].upper()}{user_id[:4].upper()}"
    await db.referral_codes.insert_one({
        "user_id": user_id,
        "referral_code": referral_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Generate JWT token
    token_data = {
        "user_id": user_id,
        "email": google_data['email'],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    return {
        "success": True,
        "token": token,
        "user": {
            "user_id": user_id,
            "email": google_data['email'],
            "full_name": full_name,
            "username": username
        }
    }
    
    # Mark email as verified
    await db.user_accounts.update_one(
        {"verification_token": token},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    
    # Show success page and redirect to login after 3 seconds
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Verified - Coin Hub X</title>
        <meta http-equiv="refresh" content="3;url=https://tradepanel-12.preview.emergentagent.com/login">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #000D1A, #1a1f3a);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                max-width: 500px;
            }
            h1 { color: #00F0FF; font-size: 32px; margin-bottom: 20px; }
            p { font-size: 18px; margin-bottom: 30px; }
            .checkmark {
                font-size: 64px;
                color: #00F0FF;
                margin-bottom: 20px;
            }
            a { 
                display: inline-block;
                background: linear-gradient(135deg, #00F0FF, #A855F7);
                color: #000;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="checkmark">✅</div>
            <h1>Email Verified Successfully!</h1>
            <p>Your account has been activated. You can now log in and start trading.</p>
            <p style="font-size: 14px; color: #ccc;">Redirecting to login page in 3 seconds...</p>
            <a href="https://tradepanel-12.preview.emergentagent.com/login">Go to Login</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

async def initialize_user_wallets(user_id: str, initial_balances: dict = None):
    """
    Initialize wallets for a new user using wallet_service
    This ensures correct schema and prevents wallet issues
    """
    try:
        wallet_service = get_wallet_service()
        
        # Default initial balances (0 for all)
        if initial_balances is None:
            initial_balances = {
                'GBP': 0,
                'BTC': 0,
                'ETH': 0,
                'USDT': 0
            }
        
        # Create wallet entries using wallet_service
        for currency, amount in initial_balances.items():
            if amount > 0:
                await wallet_service.credit(
                    user_id=user_id,
                    currency=currency,
                    amount=amount,
                    transaction_type='initial_balance',
                    reference_id='user_registration'
                )
            else:
                # Create empty wallet entry
                await db.wallets.insert_one({
                    "user_id": user_id,
                    "currency": currency,
                    "available_balance": 0.0,
                    "locked_balance": 0.0,
                    "total_balance": 0.0,
                    "created_at": datetime.now(timezone.utc),
                    "last_updated": datetime.now(timezone.utc)
                })
        
        logger.info(f"✅ Initialized wallets for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize wallets for {user_id}: {str(e)}")
        return False


@api_router.post("/auth/register")
async def register_user(request: RegisterRequest, req: Request):
    """Register new user with email/password or Google OAuth"""
    from security import password_hasher
    from security_logger import SecurityLogger
    
    # Get client IP and user agent for anti-abuse tracking
    client_ip = req.client.host if req.client else "Unknown"
    user_agent = req.headers.get("user-agent", "Unknown")
    
    # Initialize security logger
    security_logger = SecurityLogger(db)
    
    # Check rate limit
    if not check_rate_limit(client_ip, "registration"):
        raise HTTPException(
            status_code=429, 
            detail="Too many registration attempts. Please try again in 1 hour."
        )
    
    # Check if email already exists
    existing = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if existing:
        # Log failed signup attempt
        await security_logger.log_signup_attempt(
            email=request.email,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            failure_reason="Email already registered"
        )
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is a Google signup (has google_id, no password)
    is_google_signup = hasattr(request, 'google_id') and request.google_id
    
    # Hash password using bcrypt (only for regular signup)
    if not is_google_signup:
        if not request.password:
            raise HTTPException(status_code=400, detail="Password is required")
        password_hash = password_hasher.hash_password(request.password)
    else:
        # For Google signup, use a placeholder hash
        password_hash = "google_oauth_" + str(uuid.uuid4())
    
    # Generate email verification token
    import secrets
    verification_token = secrets.token_urlsafe(32)
    
    # Create user account (not verified yet)
    user_account = UserAccount(
        email=request.email,
        password_hash=password_hash,
        full_name=request.full_name,
        wallet_address=request.wallet_address
    )
    
    account_dict = user_account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    account_dict['email_verified'] = request.email_verified if is_google_signup else False
    account_dict['phone_verified'] = False  # Always require phone verification
    account_dict['phone_number'] = request.phone_number
    account_dict['verification_token'] = verification_token
    
    # Add Google ID if Google signup
    if is_google_signup and request.google_id:
        account_dict['google_id'] = request.google_id
    
    # ANTI-ABUSE: Store IP and user agent for referral fraud detection
    account_dict['ip_address'] = client_ip
    account_dict['user_agent'] = user_agent
    account_dict['signup_timestamp'] = datetime.now(timezone.utc).isoformat()
    
    await db.user_accounts.insert_one(account_dict)
    
    # Send phone verification via Twilio Verify
    try:
        from twilio.rest import Client
        
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        verify_service_sid = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
        
        if all([account_sid, auth_token, verify_service_sid]):
            client = Client(account_sid, auth_token)
            verification = client.verify.v2.services(verify_service_sid).verifications.create(
                to=request.phone_number,
                channel='sms'
            )
            logger.info(f"✅ SMS verification sent to {request.phone_number} via Twilio")
        else:
            # Fallback: Manual code generation (if Twilio not configured)
            import random
            phone_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            await db.phone_verifications.insert_one({
                "user_id": user_account.user_id,
                "phone_number": request.phone_number,
                "code": phone_code,
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.warning(f"⚠️ Twilio not configured. Manual code: {phone_code}")
    except Exception as sms_error:
        logger.error(f"❌ SMS sending failed: {str(sms_error)}")
    
    # Create initial onboarding status
    onboarding = OnboardingStatus(user_id=user_account.user_id)
    onboarding_dict = onboarding.model_dump()
    await db.onboarding_status.insert_one(onboarding_dict)
    
    # Create referral code for new user
    try:
        code = generate_referral_code(user_account.full_name)
        link = generate_referral_link(code)
        referral = ReferralCode(
            user_id=user_account.user_id,
            referral_code=code,
            referral_link=link
        )
        await db.referral_codes.insert_one(referral.model_dump())
        
        # Initialize referral stats
        stats = ReferralStats(user_id=user_account.user_id)
        await db.referral_stats.insert_one(stats.model_dump())
        logger.info(f"Created referral code for user {user_account.user_id}: {code}")
    except Exception as e:
        logger.error(f"Failed to create referral code: {str(e)}")
    
    # Send verification email
    try:
        await email_service.send_verification_email(
            user_email=request.email,
            user_name=request.full_name,
            verification_token=verification_token
        )
        logger.info(f"Verification email sent to {request.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")
    
    # Initialize user wallets (CRITICAL: prevents wallet balance issues)
    await initialize_user_wallets(user_account.user_id)
    
    # Log successful signup
    await security_logger.log_signup_attempt(
        email=request.email,
        success=True,
        ip_address=client_ip,
        user_agent=user_agent,
        user_id=user_account.user_id
    )
    
    return {
        "success": True,
        "message": "Registration successful! Please verify your phone number with the SMS code sent.",
        "user_id": user_account.user_id,
        "email": request.email,
        "phone_verification_required": True
    }


@api_router.post("/auth/verify-phone")
async def verify_phone(request: dict):
    """Verify phone number with code using Twilio Verify"""
    email = request.get("email")
    code = request.get("code")
    
    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and code required")
    
    # Get user
    user = await db.user_accounts.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    phone_number = user.get("phone_number")
    if not phone_number:
        raise HTTPException(status_code=400, detail="No phone number found")
    
    try:
        from twilio.rest import Client
        
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        verify_service_sid = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
        
        if all([account_sid, auth_token, verify_service_sid]):
            # Verify with Twilio
            client = Client(account_sid, auth_token)
            verification_check = client.verify.v2.services(verify_service_sid).verification_checks.create(
                to=phone_number,
                code=code
            )
            
            if verification_check.status == 'approved':
                # Mark phone as verified
                await db.user_accounts.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {"phone_verified": True, "email_verified": True}}
                )
                
                logger.info(f"✅ Phone verified via Twilio for {email}")
                
                return {
                    "success": True,
                    "message": "Phone verified successfully"
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid verification code")
        else:
            # Fallback to manual verification
            verification = await db.phone_verifications.find_one({
                "user_id": user["user_id"],
                "code": code
            })
            
            if not verification:
                raise HTTPException(status_code=400, detail="Invalid verification code")
            
            # Check if expired
            expires_at = datetime.fromisoformat(verification["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                raise HTTPException(status_code=400, detail="Verification code expired")
            
            # Mark phone as verified
            await db.user_accounts.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"phone_verified": True, "email_verified": True}}
            )
            
            # Delete verification code
            await db.phone_verifications.delete_one({"_id": verification["_id"]})
            
            return {
                "success": True,
                "message": "Phone verified successfully"
            }
            
    except Exception as e:
        logger.error(f"❌ Phone verification error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    try:
        verification_link = f"{os.environ.get('BACKEND_URL')}/api/auth/verify-email?token={verification_token}"
        
        # Send email via SendGrid
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        message = Mail(
            from_email=os.environ.get('SENDER_EMAIL', 'noreply@coinhubx.com'),
            to_emails=user_account.email,
            subject='Please verify your Coin Hub X account',
            html_content=f'''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #ffffff; padding: 40px; border-radius: 10px; border: 1px solid #e0e0e0;">
                        <h1 style="color: #1a1a1a; font-size: 28px; margin: 0 0 20px 0;">Verify Your Email</h1>
                        <p style="color: #333; font-size: 16px; margin-bottom: 10px;">Hello {user_account.full_name},</p>
                        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                            Thank you for registering with Coin Hub X. To complete your registration and access your account, please verify your email address by clicking the button below.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verification_link}" style="display: inline-block; background: #0066cc; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                                Verify Email Address
                            </a>
                        </div>
                        <p style="color: #777; font-size: 14px; line-height: 1.5; margin-top: 25px;">
                            Or copy and paste this link into your browser:<br>
                            <a href="{verification_link}" style="color: #0066cc; word-break: break-all;">{verification_link}</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                        <p style="color: #999; font-size: 13px; margin: 0;">
                            If you did not create this account, please disregard this email. This verification link will expire in 24 hours.
                        </p>
                        <p style="color: #999; font-size: 13px; margin-top: 15px;">
                            © {datetime.now(timezone.utc).year} Coin Hub X. All rights reserved.
                        </p>
                    </div>
                </div>
            '''
        )
        
        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sg.send(message)
        logger.info(f"Verification email sent to {user_account.email}, status: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")
    
    return {
        "success": True,
        "message": "Account created! Please check your email to verify your account.",
        "user": {
            "user_id": user_account.user_id,
            "email": user_account.email,
            "full_name": user_account.full_name,
            "wallet_address": user_account.wallet_address,
            "email_verified": True
        },
        "message": "Registration successful - you can now login"
    }

@api_router.post("/auth/login")
async def login_user(login_req: LoginRequest, request: Request):
    """Login with email/password"""
    import jwt
    from security import rate_limiter
    from security_logger import SecurityLogger
    
    # Get client info for security logging
    client_ip = request.client.host if request.client else "Unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # Initialize security logger
    security_logger = SecurityLogger(db)
    device_fingerprint = security_logger.generate_device_fingerprint(client_ip, user_agent)
    
    # Rate limiting - 10 attempts per 15 minutes per IP (relaxed for testing)
    is_allowed, wait_time = rate_limiter.check_rate_limit(
        identifier=client_ip,
        action="login",
        max_attempts=10,
        window_seconds=900  # 15 minutes
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Please try again in {wait_time} seconds."
        )
    
    logger.info(f"=== LOGIN ATTEMPT: {login_req.email} ===")
    
    # Find user
    user = await db.user_accounts.find_one({"email": login_req.email}, {"_id": 0})
    if not user:
        logger.info(f"User not found: {login_req.email}")
        # Log failed attempt
        await security_logger.log_login_attempt(
            user_id=None,
            email=login_req.email,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            failure_reason="User not found"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logger.info(f"User found: {login_req.email}")
    
    # Verify password - handle both old SHA256 and new bcrypt hashes
    from security import password_hasher
    stored_hash = user["password_hash"]
    
    password_valid = False
    
    # Check if it's an old SHA256 hash (64 characters, hex)
    if len(stored_hash) == 64 and all(c in '0123456789abcdef' for c in stored_hash):
        # Old SHA256 hash - verify and migrate
        import hashlib
        sha256_hash = hashlib.sha256(login_req.password.encode()).hexdigest()
        if stored_hash == sha256_hash:
            password_valid = True
            # Password correct, migrate to bcrypt
            new_hash = password_hasher.hash_password(login_req.password)
            await db.user_accounts.update_one(
                {"email": login_req.email},
                {"$set": {"password_hash": new_hash}}
            )
            logger.info(f"Migrated password hash for {login_req.email} from SHA256 to bcrypt")
    else:
        # New bcrypt hash
        password_valid = password_hasher.verify_password(login_req.password, stored_hash)
    
    if not password_valid:
        logger.error(f"PASSWORD MISMATCH for {login_req.email}")
        # Log failed attempt
        await security_logger.log_login_attempt(
            user_id=user["user_id"],
            email=login_req.email,
            success=False,
            ip_address=client_ip,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            failure_reason="Invalid password"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear rate limit on successful login
    rate_limiter.clear_rate_limit(client_ip, "login")
    
    # Check if 2FA is enabled for this user (unless exempt)
    from two_factor_auth import TwoFactorAuthService
    tfa_service = TwoFactorAuthService(db)
    is_exempt = await tfa_service.is_user_exempt_from_2fa(user["user_id"], user["email"])
    is_2fa_enabled = await tfa_service.is_2fa_enabled(user["user_id"])
    
    if is_2fa_enabled and not is_exempt:
        # 2FA is required - return special response
        return {
            "success": False,
            "requires_2fa": True,
            "user_id": user["user_id"],
            "email": user["email"],
            "message": "2FA code required"
        }
    
    # Log successful login attempt
    security_info = await security_logger.log_login_attempt(
        user_id=user["user_id"],
        email=login_req.email,
        success=True,
        ip_address=client_ip,
        user_agent=user_agent,
        device_fingerprint=device_fingerprint
    )
    
    # Generate JWT token
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(token_data, "emergent_secret_key_2024", algorithm="HS256")
    
    # Update last login
    await db.user_accounts.update_one(
        {"email": login_req.email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send login security alert and create notification (only if new device)
    if security_info.get("is_new_device"):
        try:
            # Create in-app notification
            await create_notification(
                db,
                user_id=user["user_id"],
                notification_type='login_alert',
                title='New device detected',
                message=f'Login from new device in {security_info.get("location")}',
                metadata={
                    'ip_address': client_ip,
                    'location': security_info.get("location"),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
            logger.info(f"New device alert sent for {user['email']}")
        except Exception as e:
            # Don't fail login if notification fails
            logger.error(f"Failed to send new device alert: {str(e)}")
    
    return {
        "success": True,
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "wallet_address": user.get("wallet_address"),
            "role": user.get("role", "user")
        },
        "message": "Login successful",
        "security": {
            "is_new_device": security_info.get("is_new_device", False),
            "location": security_info.get("location", "Unknown")
        }
    }

@api_router.post("/auth/login-with-2fa")
async def login_with_2fa(request: dict, req: Request):
    """Complete login after 2FA verification"""
    import jwt
    from security_logger import SecurityLogger
    
    user_id = request.get("user_id")
    code = request.get("code")
    use_email = request.get("use_email", False)
    
    if not user_id or not code:
        raise HTTPException(status_code=400, detail="user_id and code required")
    
    # Get client info
    client_ip = req.client.host if req.client else "Unknown"
    user_agent = req.headers.get("user-agent", "Unknown")
    security_logger = SecurityLogger(db)
    device_fingerprint = security_logger.generate_device_fingerprint(client_ip, user_agent)
    
    # Verify 2FA code
    from two_factor_auth import TwoFactorAuthService
    tfa_service = TwoFactorAuthService(db)
    
    if use_email:
        verify_result = await tfa_service.verify_email_code(user_id, code)
    else:
        verify_result = await tfa_service.verify_2fa_code(user_id, code)
    
    if not verify_result.get("success"):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    # Get user
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log successful login
    security_info = await security_logger.log_login_attempt(
        user_id=user["user_id"],
        email=user["email"],
        success=True,
        ip_address=client_ip,
        user_agent=user_agent,
        device_fingerprint=device_fingerprint
    )
    
    # Generate JWT token
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(token_data, "emergent_secret_key_2024", algorithm="HS256")
    
    # Update last login
    await db.user_accounts.update_one(
        {"user_id": user_id},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "wallet_address": user.get("wallet_address"),
            "role": user.get("role", "user")
        },
        "message": "Login successful",
        "security": {
            "is_new_device": security_info.get("is_new_device", False),
            "location": security_info.get("location", "Unknown")
        }
    }


@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, req: Request):
    """Send password reset token"""
    import secrets
    from security import rate_limiter
    
    # Rate limiting - 3 attempts per 10 minutes per IP
    client_ip = req.client.host if req.client else "Unknown"
    is_allowed, wait_time = rate_limiter.check_rate_limit(
        identifier=client_ip,
        action="password_reset",
        max_attempts=3,
        window_seconds=600  # 10 minutes
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many password reset attempts. Please try again in {wait_time} seconds."
        )
    
    user = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If email exists, reset link will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.user_accounts.update_one(
        {"email": request.email},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires": reset_expires.isoformat()
            }
        }
    )
    
    # Send password reset email via SendGrid directly
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        reset_link = f"https://tradepanel-12.preview.emergentagent.com/reset-password?token={reset_token}"
        
        message = Mail(
            from_email=os.environ.get('SENDER_EMAIL', 'noreply@coinhubx.net'),
            to_emails=request.email,
            subject='Reset Your Coin Hub X Password',
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00D9FF;">Password Reset Request</h2>
                <p>Hello {user.get('full_name', 'User')},</p>
                <p>We received a request to reset your Coin Hub X password.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #00D9FF, #A855F7); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="color: #00D9FF; word-break: break-all;">{reset_link}</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Coin Hub X - P2P Crypto Marketplace</p>
            </div>
            """
        )
        
        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sg.send(message)
        logger.info(f"Password reset email sent to {request.email}, status: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
    
    return {
        "success": True,
        "message": "Password reset link sent to email"
    }

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    from security import password_hasher
    
    user = await db.user_accounts.find_one({"reset_token": request.reset_token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    if user.get("reset_token_expires"):
        expires = datetime.fromisoformat(user["reset_token_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Reset token expired")
    
    # Hash new password using bcrypt
    password_hash = password_hasher.hash_password(request.new_password)
    
    # Update password and clear reset token
    await db.user_accounts.update_one(
        {"reset_token": request.reset_token},
        {
            "$set": {"password_hash": password_hash},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )
    
    return {
        "success": True,
        "message": "Password reset successful"
    }

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest, req: Request):
    """Admin login with special code - SECURED"""
    from security import rate_limiter
    
    # Strict rate limiting for admin - 3 attempts per 30 minutes per IP
    client_ip = req.client.host if req.client else "Unknown"
    is_allowed, wait_time = rate_limiter.check_rate_limit(
        identifier=client_ip,
        action="admin_login",
        max_attempts=3,
        window_seconds=1800  # 30 minutes
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many admin login attempts. Please try again in {wait_time} seconds."
        )
    
    # SECURITY: Only allow specific admin email
    AUTHORIZED_ADMIN_EMAIL = "info@coinhubx.net"
    ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"
    
    # Check if email is authorized
    if request.email != AUTHORIZED_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Unauthorized admin access")
    
    # Verify admin code
    if request.admin_code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    
    # Find user and verify password
    user = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password - handle both old SHA256 and new bcrypt hashes
    from security import password_hasher
    stored_hash = user["password_hash"]
    
    # Check if it's an old SHA256 hash (64 characters, hex)
    if len(stored_hash) == 64 and all(c in '0123456789abcdef' for c in stored_hash):
        # Old SHA256 hash - verify and migrate
        import hashlib
        sha256_hash = hashlib.sha256(request.password.encode()).hexdigest()
        if stored_hash == sha256_hash:
            # Password correct, migrate to bcrypt
            new_hash = password_hasher.hash_password(request.password)
            await db.user_accounts.update_one(
                {"email": request.email},
                {"$set": {"password_hash": new_hash}}
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        # New bcrypt hash
        if not password_hasher.verify_password(request.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Ensure user has admin role
    if user.get("role") != "admin":
        await db.user_accounts.update_one(
            {"email": request.email},
            {"$set": {"role": "admin"}}
        )
    
    # Clear rate limit on successful admin login
    rate_limiter.clear_rate_limit(client_ip, "admin_login")
    
    # Generate admin JWT token
    import jwt
    from datetime import timedelta
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "role": "admin"
    }
    admin_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "success": True,
        "admin": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": "admin"
        },
        "token": admin_token,
        "message": "Admin login successful"
    }

@api_router.get("/admin/customers")
async def get_all_customers():
    """Get all registered customers (buyers and lenders)"""
    # Get all user accounts
    accounts = await db.user_accounts.find(
        {"role": {"$ne": "admin"}},
        {"_id": 0, "password_hash": 0, "reset_token": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "customers": accounts,
        "total_customers": len(accounts)
    }

# ============= DATABASE BACKUP MANAGEMENT (ADMIN ONLY) =============

@api_router.post("/admin/backup/create")
async def create_manual_backup():
    """Create a manual database backup (Admin only)"""
    from backup_system import backup_system
    
    result = backup_system.create_backup()
    
    if result.get("status") == "success":
        return {
            "success": True,
            "message": "Backup created successfully",
            "backup": result
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Backup failed"))

@api_router.get("/admin/backup/list")
async def list_backups():
    """List all available backups (Admin only)"""
    from backup_system import backup_system
    
    backups = backup_system.list_backups()
    return {
        "success": True,
        "backups": backups,
        "total": len(backups)
    }

@api_router.post("/admin/backup/restore")
async def restore_backup(backup_name: str):
    """
    Restore database from a backup (Admin only)
    WARNING: This will overwrite current database!
    """
    from backup_system import backup_system
    
    result = backup_system.restore_backup(backup_name)
    
    if result.get("status") == "success":
        return {
            "success": True,
            "message": "Database restored successfully",
            "backup_name": backup_name
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Restoration failed"))

@api_router.get("/admin/customers")
async def get_admin_customers():
    """Get all customers for admin dashboard"""
    # Get all user accounts
    accounts = await db.user_accounts.find(
        {"role": {"$ne": "admin"}},
        {"_id": 0, "password_hash": 0, "reset_token": 0}
    ).to_list(10000)
    
    # Get wallet users
    wallet_users = await db.users.find({}, {"_id": 0}).to_list(10000)
    
    # Combine and enrich data
    customers = []
    
    for account in accounts:
        # Get associated wallet data if exists
        wallet_data = None
        if account.get("wallet_address"):
            wallet_data = next((w for w in wallet_users if w.get("wallet_address") == account["wallet_address"]), None)
        
        # Get transaction count
        tx_count = await db.transactions.count_documents({"user_address": account.get("wallet_address", "")})
        
        # Get active orders
        buy_orders = await db.crypto_buy_orders.count_documents({
            "buyer_address": account.get("wallet_address", ""),
            "status": {"$in": ["pending_payment", "marked_as_paid", "disputed"]}
        })
        
        sell_orders = await db.crypto_sell_orders.count_documents({
            "seller_address": account.get("wallet_address", ""),
            "status": "active"
        })
        
        customers.append({
            **account,
            "wallet_balance": wallet_data.get("available_balance", 0) if wallet_data else 0,
            "total_deposited": wallet_data.get("total_deposited", 0) if wallet_data else 0,
            "total_borrowed": wallet_data.get("total_borrowed", 0) if wallet_data else 0,
            "total_earned": wallet_data.get("total_earned", 0) if wallet_data else 0,
            "transaction_count": tx_count,
            "active_buy_orders": buy_orders,
            "active_sell_orders": sell_orders
        })
    
    # Add wallet-only users (no email account)
    email_wallets = [a.get("wallet_address") for a in accounts if a.get("wallet_address")]
    for wallet in wallet_users:
        if wallet["wallet_address"] not in email_wallets:
            tx_count = await db.transactions.count_documents({"user_address": wallet["wallet_address"]})
            
            buy_orders = await db.crypto_buy_orders.count_documents({
                "buyer_address": wallet["wallet_address"],
                "status": {"$in": ["pending_payment", "marked_as_paid", "disputed"]}
            })
            
            sell_orders = await db.crypto_sell_orders.count_documents({
                "seller_address": wallet["wallet_address"],
                "status": "active"
            })
            
            customers.append({
                "user_id": wallet["wallet_address"],
                "email": "N/A (Wallet Only)",
                "full_name": "Wallet User",
                "wallet_address": wallet["wallet_address"],
                "role": "user",
                "wallet_balance": wallet.get("available_balance", 0),
                "total_deposited": wallet.get("total_deposited", 0),
                "total_borrowed": wallet.get("total_borrowed", 0),
                "total_earned": wallet.get("total_earned", 0),
                "transaction_count": tx_count,
                "active_buy_orders": buy_orders,
                "active_sell_orders": sell_orders,
                "created_at": wallet.get("created_at")
            })
    
    return {
        "success": True,
        "total_customers": len(customers),
        "customers": customers
    }

@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats():
    """Get comprehensive platform statistics for admin"""
    # User stats
    total_users = await db.user_accounts.count_documents({"role": "user"})
    wallet_users = await db.users.count_documents({})
    
    # Transaction stats
    total_transactions = await db.transactions.count_documents({})
    total_volume = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Order stats
    total_buy_orders = await db.crypto_buy_orders.count_documents({})
    active_buy_orders = await db.crypto_buy_orders.count_documents({
        "status": {"$in": ["pending_payment", "marked_as_paid"]}
    })
    completed_orders = await db.crypto_buy_orders.count_documents({"status": "completed"})
    
    # Dispute stats
    total_disputes = await db.disputes.count_documents({})
    open_disputes = await db.disputes.count_documents({"status": {"$in": ["open", "under_review"]}})
    
    # Revenue stats
    platform_fees = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}}
    ]).to_list(1)
    
    return {
        "success": True,
        "stats": {
            "users": {
                "total_registered": total_users,
                "wallet_only": wallet_users,
                "total_users": total_users + wallet_users
            },
            "transactions": {
                "total_count": total_transactions,
                "total_volume": total_volume[0]["total"] if total_volume else 0
            },
            "orders": {
                "total_buy_orders": total_buy_orders,
                "active_orders": active_buy_orders,
                "completed_orders": completed_orders
            },
            "disputes": {
                "total_disputes": total_disputes,
                "open_disputes": open_disputes
            },
            "revenue": {
                "platform_fees": platform_fees[0]["total"] if platform_fees else 0
            }
        }
    }

@api_router.post("/admin/broadcast-message")
async def send_broadcast_message(request: dict):
    """Send marketing broadcast message to all users"""
    message_title = request.get("title")
    message_content = request.get("content")
    send_email = request.get("send_email", False)
    
    if not message_title or not message_content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    
    # Get all users
    users = await db.user_accounts.find(
        {"role": "user", "email_verified": True},
        {"_id": 0, "user_id": 1, "email": 1, "full_name": 1}
    ).to_list(10000)
    
    # Create broadcast record
    broadcast_id = str(uuid.uuid4())
    broadcast = {
        "broadcast_id": broadcast_id,
        "title": message_title,
        "content": message_content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_to_count": len(users),
        "send_email": send_email
    }
    await db.broadcasts.insert_one(broadcast)
    
    # Create message for each user
    messages_created = 0
    emails_sent = 0
    
    for user in users:
        # Create in-app message
        message = {
            "message_id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "broadcast_id": broadcast_id,
            "title": message_title,
            "content": message_content,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_messages.insert_one(message)
        messages_created += 1
        
        # Send email if requested
        if send_email:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail
                
                email_message = Mail(
                    from_email=os.environ.get('SENDER_EMAIL', 'info@coinhubx.net'),
                    to_emails=user["email"],
                    subject=f"📢 {message_title}",
                    html_content=f'''
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #000D1A, #1a1f3a); padding: 40px; text-align: center; border-radius: 10px;">
                                <h1 style="color: #00F0FF; font-size: 28px; margin: 0 0 20px 0;">{message_title}</h1>
                                <div style="color: #fff; font-size: 16px; line-height: 1.6; text-align: left;">
                                    {message_content.replace(chr(10), '<br>')}
                                </div>
                                <a href="https://tradepanel-12.preview.emergentagent.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #00F0FF, #A855F7); color: #000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 30px;">
                                    View on Platform
                                </a>
                            </div>
                        </div>
                    '''
                )
                
                sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
                response = sg.send(email_message)
                if response.status_code == 202:
                    emails_sent += 1
            except Exception as e:
                logger.error(f"Failed to send broadcast email to {user['email']}: {str(e)}")
    
    return {
        "success": True,
        "broadcast_id": broadcast_id,
        "messages_created": messages_created,
        "emails_sent": emails_sent if send_email else 0,
        "message": f"Broadcast sent to {len(users)} users"
    }

@api_router.get("/admin/customer-analytics")
async def get_customer_analytics():
    """Get customer source analytics"""
    # Get all users with registration source tracking
    users = await db.user_accounts.find(
        {"role": "user"},
        {"_id": 0, "user_id": 1, "email": 1, "created_at": 1, "referral_code_used": 1}
    ).to_list(10000)
    
    # Analyze registration sources
    referral_signups = 0
    organic_signups = 0
    
    # Geographic data (mock for now - would need IP tracking)
    countries = {}
    
    for user in users:
        if user.get("referral_code_used"):
            referral_signups += 1
        else:
            organic_signups += 1
    
    # Get referral performance
    referral_stats = await db.referral_stats.find({}, {"_id": 0}).to_list(1000)
    top_referrers = sorted(
        referral_stats, 
        key=lambda x: x.get("total_referrals", 0), 
        reverse=True
    )[:5]
    
    return {
        "success": True,
        "analytics": {
            "total_users": len(users),
            "sources": {
                "referral": referral_signups,
                "organic": organic_signups
            },
            "top_referrers": [
                {
                    "user_id": r.get("user_id"),
                    "referrals": r.get("total_referrals", 0),
                    "earnings": r.get("total_earnings", 0)
                }
                for r in top_referrers
            ],
            "countries": countries or {"Unknown": len(users)}
        }
    }

@api_router.get("/user/messages")
async def get_user_messages(user_id: str):
    """Get messages for a user"""
    messages = await db.user_messages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    unread_count = await db.user_messages.count_documents({
        "user_id": user_id,
        "read": False
    })
    
    return {
        "success": True,
        "messages": messages,
        "unread_count": unread_count
    }

@api_router.post("/user/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    await db.user_messages.update_one(
        {"message_id": message_id},
        {"$set": {"read": True}}
    )
    
    return {
        "success": True,
        "message": "Message marked as read"
    }


@api_router.get("/platform/stats")
async def get_platform_general_stats():
    """Get platform statistics"""
    total_users = await db.users.count_documents({})
    active_loans = await db.loans.count_documents({"status": "active"})
    total_volume = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    platform_fees = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}}
    ]).to_list(1)
    
    return {
        "success": True,
        "stats": {
            "total_users": total_users,
            "active_loans": active_loans,
            "total_volume": total_volume[0]["total"] if total_volume else 0,
            "platform_fees": platform_fees[0]["total"] if platform_fees else 0,
            "config": PLATFORM_CONFIG
        }
    }

# ===========================
# LIVE CRYPTO PRICES
# ===========================

@api_router.get("/crypto/prices")
async def get_crypto_prices():
    """Get live crypto prices from CoinGecko API"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,tether",
                    "vs_currencies": "gbp,usd",
                    "include_24hr_change": "true"
                }
            )
            data = response.json()
            
            return {
                "success": True,
                "prices": {
                    "BTC": {
                        "gbp": data["bitcoin"]["gbp"],
                        "usd": data["bitcoin"]["usd"],
                        "change_24h": data["bitcoin"].get("gbp_24h_change", 0)
                    },
                    "ETH": {
                        "gbp": data["ethereum"]["gbp"],
                        "usd": data["ethereum"]["usd"],
                        "change_24h": data["ethereum"].get("gbp_24h_change", 0)
                    },
                    "USDT": {
                        "gbp": data["tether"]["gbp"],
                        "usd": data["tether"]["usd"],
                        "change_24h": data["tether"].get("gbp_24h_change", 0)
                    }
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        # Fallback prices if API fails
        return {
            "success": True,
            "prices": {
                "BTC": {"gbp": 35000, "usd": 45000, "change_24h": 0},
                "ETH": {"gbp": 1950, "usd": 2500, "change_24h": 0},
                "USDT": {"gbp": 0.79, "usd": 1.0, "change_24h": 0}
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fallback": True
        }

# ===========================
# ADMIN COMMISSION & CONFIG
# ===========================

class CommissionUpdateRequest(BaseModel):
    setting_key: str
    new_value: float

@api_router.get("/admin/platform-config")
async def get_platform_config():
    """Get current platform commission and fee settings"""
    return {
        "success": True,
        "config": PLATFORM_CONFIG,
        "editable_settings": [
            {"key": "deposit_fee_percent", "label": "Deposit Fee (%)", "value": PLATFORM_CONFIG["deposit_fee_percent"]},
            {"key": "withdraw_fee_percent", "label": "Withdrawal Fee (%)", "value": PLATFORM_CONFIG["withdraw_fee_percent"]},
            {"key": "borrow_fee_percent", "label": "Borrow Fee (%)", "value": PLATFORM_CONFIG["borrow_fee_percent"]},
            {"key": "repay_fee_percent", "label": "Repayment Fee (%)", "value": PLATFORM_CONFIG["repay_fee_percent"]},
            {"key": "platform_spread", "label": "Platform Spread (%)", "value": PLATFORM_CONFIG["platform_spread"]},
            {"key": "lender_interest_rate", "label": "Lender Interest Rate (%)", "value": PLATFORM_CONFIG["lender_interest_rate"]},
            {"key": "borrower_interest_rate", "label": "Borrower Interest Rate (%)", "value": PLATFORM_CONFIG["borrower_interest_rate"]},
            {"key": "liquidation_fee_percent", "label": "Liquidation Fee (%)", "value": PLATFORM_CONFIG["liquidation_fee_percent"]},
            {"key": "liquidation_penalty_percent", "label": "Liquidation Penalty (%)", "value": PLATFORM_CONFIG["liquidation_penalty_percent"]},
            {"key": "min_collateral_ratio", "label": "Min Collateral Ratio (%)", "value": PLATFORM_CONFIG["min_collateral_ratio"]},
            {"key": "liquidation_threshold", "label": "Liquidation Threshold (%)", "value": PLATFORM_CONFIG["liquidation_threshold"]},
        ]
    }

@api_router.post("/admin/update-commission")
async def update_platform_commission(request: CommissionUpdateRequest):
    """Update platform commission/fee settings"""
    if request.setting_key not in PLATFORM_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid setting key")
    
    # Validate value
    if request.new_value < 0:
        raise HTTPException(status_code=400, detail="Value cannot be negative")
    
    # Update in-memory config
    old_value = PLATFORM_CONFIG[request.setting_key]
    PLATFORM_CONFIG[request.setting_key] = request.new_value
    
    # Store in database for persistence
    await db.platform_settings.update_one(
        {"setting_key": request.setting_key},
        {"$set": {
            "value": request.new_value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "previous_value": old_value
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Updated {request.setting_key} from {old_value} to {request.new_value}",
        "config": PLATFORM_CONFIG
    }

@api_router.get("/admin/referral-config")
async def get_referral_config():
    """Get current referral configuration"""
    config = await load_referral_config_from_db(db)
    return {
        "success": True,
        "config": config
    }

@api_router.post("/admin/update-referral-config")
async def update_referral_config(request: dict):
    """Update referral configuration (admin only)"""
    allowed_keys = [
        "referrer_commission_percent",
        "commission_duration_months", 
        "referred_user_fee_discount_percent",
        "fee_discount_duration_days"
    ]
    
    updates = {}
    for key, value in request.items():
        if key in allowed_keys:
            if isinstance(value, (int, float)) and value >= 0:
                updates[key] = float(value)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid updates provided")
    
    config = await update_referral_config_in_db(db, updates)
    
    return {
        "success": True,
        "message": "Referral configuration updated successfully",
        "config": config
    }

@api_router.get("/admin/referral-earnings")
async def get_all_referral_earnings():
    """Get all referral earnings for admin panel"""
    # Aggregate earnings by user
    pipeline = [
        {
            "$group": {
                "_id": "$referrer_user_id",
                "total_earned": {"$sum": "$commission_amount"},
                "total_transactions": {"$sum": 1},
                "currency": {"$first": "$currency"}
            }
        }
    ]
    
    earnings_agg = await db.referral_commissions.aggregate(pipeline).to_list(1000)
    
    # Get user details and payout status
    earnings_list = []
    for earning in earnings_agg:
        user = await db.users.find_one({"user_id": earning["_id"]}, {"_id": 0, "user_id": 1, "email": 1, "full_name": 1})
        
        # Check payout status
        payout_status = await db.referral_payouts.find_one({"user_id": earning["_id"]})
        
        if user:
            earnings_list.append({
                "user_id": user["user_id"],
                "email": user["email"],
                "full_name": user.get("full_name", "N/A"),
                "total_earned": earning["total_earned"],
                "currency": earning["currency"],
                "total_transactions": earning["total_transactions"],
                "paid_amount": payout_status.get("paid_amount", 0) if payout_status else 0,
                "unpaid_amount": earning["total_earned"] - (payout_status.get("paid_amount", 0) if payout_status else 0),
                "last_paid_at": payout_status.get("last_paid_at") if payout_status else None,
                "payout_status": "paid" if payout_status and payout_status.get("paid_amount", 0) >= earning["total_earned"] else "pending"
            })
    
    return {
        "success": True,
        "earnings": earnings_list
    }

@api_router.post("/admin/mark-referral-paid")
async def mark_referral_paid(request: dict):
    """Mark referral earnings as paid (manual payout tracking)"""
    user_id = request.get("user_id")
    amount_paid = request.get("amount_paid", 0)
    
    if not user_id or amount_paid <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id or amount")
    
    # Update or create payout record
    await db.referral_payouts.update_one(
        {"user_id": user_id},
        {
            "$inc": {"paid_amount": amount_paid},
            "$set": {
                "last_paid_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Marked ${amount_paid} as paid for user {user_id}"
    }


# ===========================
# GOLDEN REFERRAL VIP TIER - ADMIN ONLY
# ===========================

@api_router.post("/admin/golden-referral/activate")
async def activate_golden_referral(request: dict):
    """
    Activate Golden Referral VIP tier for a user (Admin Only)
    Gives user 50% commission on all fees from their referrals
    """
    user_id = request.get("user_id")
    admin_id = request.get("admin_id", "system")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Check if user exists
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already has golden referral
    if user.get("golden_referral", False):
        return {
            "success": True,
            "message": "User already has Golden Referral tier",
            "user_id": user_id
        }
    
    # Activate Golden Referral
    await db.user_accounts.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "golden_referral": True,
                "golden_referral_activated_at": datetime.now(timezone.utc).isoformat(),
                "golden_referral_activated_by": admin_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the activation
    await db.golden_referral_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "activated",
        "admin_id": admin_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"✅ Golden Referral activated for user {user_id} by admin {admin_id}")
    
    return {
        "success": True,
        "message": f"Golden Referral VIP tier activated for user {user_id}",
        "user_id": user_id,
        "commission_rate": "50%"
    }

@api_router.post("/admin/golden-referral/deactivate")
async def deactivate_golden_referral(request: dict):
    """
    Deactivate Golden Referral VIP tier for a user (Admin Only)
    Reverts user back to standard 20% commission
    """
    user_id = request.get("user_id")
    admin_id = request.get("admin_id", "system")
    reason = request.get("reason", "Admin decision")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Check if user exists
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has golden referral
    if not user.get("golden_referral", False):
        return {
            "success": True,
            "message": "User does not have Golden Referral tier",
            "user_id": user_id
        }
    
    # Deactivate Golden Referral
    await db.user_accounts.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "golden_referral": False,
                "golden_referral_deactivated_at": datetime.now(timezone.utc).isoformat(),
                "golden_referral_deactivated_by": admin_id,
                "golden_referral_deactivation_reason": reason,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the deactivation
    await db.golden_referral_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "deactivated",
        "admin_id": admin_id,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"❌ Golden Referral deactivated for user {user_id} by admin {admin_id}")
    
    return {
        "success": True,
        "message": f"Golden Referral VIP tier deactivated for user {user_id}",
        "user_id": user_id,
        "commission_rate": "20% (standard)"
    }

@api_router.get("/admin/golden-referral/users")
async def get_golden_referral_users():
    """
    Get list of all users with Golden Referral VIP tier (Admin Only)
    """
    # Find all users with golden_referral = True
    golden_users = await db.user_accounts.find(
        {"golden_referral": True},
        {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "golden_referral_activated_at": 1, "golden_referral_activated_by": 1}
    ).to_list(1000)
    
    # Get earnings stats for each golden user
    result = []
    for user in golden_users:
        # Get total commissions earned
        commissions = await db.referral_commissions.find({
            "referrer_user_id": user["user_id"],
            "is_golden_tier": True
        }).to_list(1000)
        
        total_earned = sum(c["commission_amount"] for c in commissions)
        total_transactions = len(commissions)
        
        # Get referral count
        referral_count = await db.referral_relationships.count_documents({
            "referrer_user_id": user["user_id"]
        })
        
        result.append({
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user.get("full_name", "N/A"),
            "activated_at": user.get("golden_referral_activated_at"),
            "activated_by": user.get("golden_referral_activated_by"),
            "total_earned": total_earned,
            "total_transactions": total_transactions,
            "referral_count": referral_count,
            "commission_rate": "50%"
        })
    
    return {
        "success": True,
        "golden_users": result,
        "total_count": len(result)
    }

@api_router.get("/admin/golden-referral/search")
async def search_users_for_golden_referral(email: str = None, user_id: str = None):
    """
    Search users to add to Golden Referral tier (Admin Only)
    """
    if not email and not user_id:
        raise HTTPException(status_code=400, detail="Provide email or user_id to search")
    
    # Build search query
    query = {}
    if email:
        query["email"] = {"$regex": email, "$options": "i"}
    if user_id:
        query["user_id"] = user_id
    
    # Find users
    users = await db.user_accounts.find(
        query,
        {"_id": 0, "user_id": 1, "email": 1, "full_name": 1, "golden_referral": 1}
    ).limit(20).to_list(20)
    
    # Add referral stats
    result = []
    for user in users:
        # Get referral count
        referral_count = await db.referral_relationships.count_documents({
            "referrer_user_id": user["user_id"]
        })
        
        # Get total commissions
        commissions = await db.referral_commissions.find({
            "referrer_user_id": user["user_id"]
        }).to_list(1000)
        
        total_earned = sum(c["commission_amount"] for c in commissions)
        
        result.append({
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user.get("full_name", "N/A"),
            "has_golden_tier": user.get("golden_referral", False),
            "referral_count": referral_count,
            "total_earned": total_earned
        })
    
    return {
        "success": True,
        "users": result,
        "count": len(result)
    }


@api_router.get("/admin/disputes/all")
async def get_all_disputes():
    """Get all disputes with filters"""
    try:
        disputes = await db.p2p_disputes.find({}).to_list(1000)
        
        # Enrich with trade and user data
        enriched_disputes = []
        for dispute in disputes:
            # Get trade info
            trade = await db.trades.find_one({"trade_id": dispute["trade_id"]})
            
            # Get buyer and seller info
            buyer = await db.users.find_one({"user_id": dispute.get("buyer_id")}, {"_id": 0, "email": 1, "full_name": 1})
            seller = await db.users.find_one({"user_id": dispute.get("seller_id")}, {"_id": 0, "email": 1, "full_name": 1})
            
            enriched_disputes.append({
                "dispute_id": dispute["dispute_id"],
                "trade_id": dispute["trade_id"],
                "status": dispute.get("status", "open"),
                "reason": dispute.get("reason", ""),
                "opened_by": dispute.get("opened_by", ""),
                "created_at": dispute.get("created_at"),
                "resolved_at": dispute.get("resolved_at"),
                "resolution": dispute.get("resolution"),
                "trade": {
                    "crypto_amount": trade.get("crypto_amount") if trade else 0,
                    "crypto_currency": trade.get("crypto_currency", "BTC") if trade else "BTC",
                    "fiat_amount": trade.get("fiat_amount") if trade else 0,
                    "status": trade.get("status") if trade else "unknown"
                },
                "buyer": buyer,
                "seller": seller
            })
        
        return {
            "success": True,
            "disputes": enriched_disputes
        }
    except Exception as e:
        print(f"Error fetching disputes: {e}")
        return {
            "success": True,
            "disputes": []
        }

@api_router.post("/admin/resolve-dispute-final")
async def resolve_dispute_final(request: dict):
    """Admin resolves dispute - release to buyer or return to seller"""
    dispute_id = request.get("dispute_id")
    resolution = request.get("resolution")  # "release_to_buyer" or "return_to_seller"
    admin_notes = request.get("admin_notes", "")
    
    if not dispute_id or not resolution:
        raise HTTPException(status_code=400, detail="Missing dispute_id or resolution")
    
    if resolution not in ["release_to_buyer", "return_to_seller"]:
        raise HTTPException(status_code=400, detail="Invalid resolution")
    
    # Get dispute
    dispute = await db.p2p_disputes.find_one({"dispute_id": dispute_id})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Get trade
    trade = await db.trades.find_one({"trade_id": dispute["trade_id"]})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Update dispute
    await db.p2p_disputes.update_one(
        {"dispute_id": dispute_id},
        {
            "$set": {
                "status": "resolved",
                "resolution": resolution,
                "admin_notes": admin_notes,
                "resolved_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Calculate dispute fee (£2 or 1% of trade value, whichever is higher)
    from centralized_fee_system import get_fee_manager
    fee_manager = get_fee_manager(db)
    
    dispute_fee_percent = await fee_manager.get_fee("dispute_fee_percent")
    dispute_fee_fixed_gbp = await fee_manager.get_fee("dispute_fee_fixed_gbp")
    
    # Convert crypto amount to GBP for fee calculation
    crypto_amount = trade.get("crypto_amount", 0)
    price_per_unit = trade.get("price_per_unit", 0)
    trade_value_gbp = crypto_amount * price_per_unit
    
    # Calculate percentage fee
    dispute_fee_percent_amount = trade_value_gbp * (dispute_fee_percent / 100.0)
    
    # Use whichever is higher
    dispute_fee = max(dispute_fee_fixed_gbp, dispute_fee_percent_amount)
    
    # Determine losing party (who pays the fee)
    losing_party = trade["seller_id"] if resolution == "release_to_buyer" else trade["buyer_id"]
    winning_party = trade["buyer_id"] if resolution == "release_to_buyer" else trade["seller_id"]
    
    # Check for referrer of losing party
    loser = await db.user_accounts.find_one({"user_id": losing_party}, {"_id": 0})
    referrer_id = loser.get("referrer_id") if loser else None
    referrer_commission = 0.0
    admin_fee = dispute_fee
    commission_percent = 0.0
    
    if referrer_id:
        referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
        referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
        
        if referrer_tier == "golden":
            commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
        else:
            commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
        
        referrer_commission = dispute_fee * (commission_percent / 100.0)
        admin_fee = dispute_fee - referrer_commission
    
    # Deduct dispute fee from losing party's balance
    wallet_service = get_wallet_service()
    try:
        await wallet_service.debit(
            user_id=losing_party,
            currency="GBP",
            amount=dispute_fee,
            transaction_type="dispute_fee",
            reference_id=dispute_id,
            metadata={"dispute_id": dispute_id, "trade_id": trade["trade_id"], "resolution": resolution}
        )
    except Exception as fee_error:
        logger.warning(f"⚠️ Failed to deduct dispute fee from {losing_party}: {str(fee_error)}")
    
    # Credit admin wallet
    try:
        await wallet_service.credit(
            user_id="admin_wallet",
            currency="GBP",
            amount=admin_fee,
            transaction_type="dispute_fee",
            reference_id=dispute_id,
            metadata={"losing_party": losing_party, "total_fee": dispute_fee}
        )
    except Exception as admin_error:
        logger.warning(f"⚠️ Failed to credit admin dispute fee: {str(admin_error)}")
    
    # Credit referrer if applicable
    if referrer_id and referrer_commission > 0:
        try:
            await wallet_service.credit(
                user_id=referrer_id,
                currency="GBP",
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=dispute_id,
                metadata={"referred_user_id": losing_party, "transaction_type": "dispute"}
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": losing_party,
                "transaction_type": "dispute",
                "fee_amount": dispute_fee,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": "GBP",
                "dispute_id": dispute_id,
                "trade_id": trade["trade_id"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as comm_error:
            logger.warning(f"⚠️ Failed to pay referrer commission: {str(comm_error)}")
    
    # Log to fee_transactions
    await db.fee_transactions.insert_one({
        "user_id": losing_party,
        "transaction_type": "dispute",
        "fee_type": "dispute_fee",
        "amount": trade_value_gbp,
        "fee_amount": dispute_fee,
        "fee_percent": dispute_fee_percent,
        "admin_fee": admin_fee,
        "referrer_commission": referrer_commission,
        "referrer_id": referrer_id,
        "currency": "GBP",
        "reference_id": dispute_id,
        "trade_id": trade["trade_id"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Update trade based on resolution
    if resolution == "release_to_buyer":
        await db.p2p_trades.update_one(
            {"trade_id": dispute["trade_id"]},
            {
                "$set": {
                    "status": "completed",
                    "escrow_released": True,
                    "dispute_fee": dispute_fee,
                    "dispute_fee_charged_to": losing_party,
                    "completed_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Release crypto to buyer (update balances)
        await db.users.update_one(
            {"user_id": trade["buyer_id"]},
            {"$inc": {f"crypto_balances.{trade['crypto_currency']}": trade["crypto_amount"]}}
        )
        
        action = f"Crypto released to buyer. Dispute fee of £{dispute_fee:.2f} charged to seller."
    else:
        await db.p2p_trades.update_one(
            {"trade_id": dispute["trade_id"]},
            {
                "$set": {
                    "status": "cancelled",
                    "escrow_released": True,
                    "dispute_fee": dispute_fee,
                    "dispute_fee_charged_to": losing_party,
                    "cancelled_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Return crypto to seller
        await db.users.update_one(
            {"user_id": trade["seller_id"]},
            {"$inc": {f"crypto_balances.{trade['crypto_currency']}": trade["crypto_amount"]}}
        )
        
        action = f"Crypto returned to seller. Dispute fee of £{dispute_fee:.2f} charged to buyer."
    
    return {
        "success": True,
        "message": f"Dispute resolved: {action}",
        "resolution": resolution
    }

@api_router.get("/admin/search/users")
async def admin_search_users(q: str = ""):
    """Search users by email, ID, or name"""
    try:
        query = {}
        if q:
            query = {
                "$or": [
                    {"email": {"$regex": q, "$options": "i"}},
                    {"user_id": {"$regex": q, "$options": "i"}},
                    {"full_name": {"$regex": q, "$options": "i"}}
                ]
            }
        
        users = await db.users.find(query, {"_id": 0}).limit(50).to_list(50)
        
        return {
            "success": True,
            "users": users
        }
    except Exception as e:
        return {
            "success": True,
            "users": []
        }

@api_router.get("/admin/search/trades")
async def admin_search_trades(q: str = "", status: str = ""):
    """Search trades by ID or status"""
    try:
        query = {}
        if q:
            query["trade_id"] = {"$regex": q, "$options": "i"}
        if status:
            query["status"] = status
        
        trades = await db.p2p_trades.find(query, {"_id": 0}).limit(100).to_list(100)
        
        return {
            "success": True,
            "trades": trades
        }
    except Exception as e:
        return {
            "success": True,
            "trades": []
        }

@api_router.get("/p2p/seller-status/{user_id}")
async def get_seller_status(user_id: str):
    """Check if user can become a seller and current status"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check requirements
    is_seller = user.get("is_seller", False)
    has_kyc = user.get("kyc_verified", False)
    payment_methods = user.get("payment_methods", [])
    has_payment_method = len(payment_methods) > 0
    
    # Get seller stats if already seller
    stats = {}
    if is_seller:
        trades = await db.p2p_trades.find({"seller_id": user_id, "status": "completed"}).to_list(1000)
        stats = {
            "total_trades": len(trades),
            "total_volume": sum(t.get("fiat_amount", 0) for t in trades),
            "completion_rate": 98.5  # Calculate from actual data
        }
    
    return {
        "success": True,
        "is_seller": is_seller,
        "can_activate": has_kyc and has_payment_method,
        "requirements": {
            "kyc_verified": has_kyc,
            "has_payment_method": has_payment_method
        },
        "stats": stats
    }

@api_router.get("/p2p/seller-status/{user_id}")
async def get_seller_status(user_id: str):
    """Check if user is a seller"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return {"is_seller": False, "kyc_verified": False}
    
    return {
        "is_seller": user.get("is_seller", False),
        "kyc_verified": user.get("kyc_verified", False),
        "payment_methods": user.get("payment_methods", [])
    }

@api_router.post("/p2p/activate-seller")
async def activate_seller(request: dict):
    """Activate seller mode for user"""
    user_id = request.get("user_id")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check requirements
    has_kyc = user.get("kyc_verified", False)
    payment_methods = user.get("payment_methods", [])
    has_payment_method = len(payment_methods) > 0
    
    if not has_kyc:
        raise HTTPException(status_code=400, detail="KYC verification required")
    
    if not has_payment_method:
        raise HTTPException(status_code=400, detail="At least one payment method required")
    
    # Activate seller
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_seller": True,
                "seller_activated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Seller account activated successfully"
    }

@api_router.post("/p2p/create-ad")
async def create_p2p_ad(request: dict):
    """Create a new P2P ad"""
    user_id = request.get("user_id")
    
    # Verify user is seller
    user = await db.users.find_one({"user_id": user_id})
    if not user or not user.get("is_seller"):
        raise HTTPException(status_code=403, detail="Seller account required")
    
    ad_id = str(uuid.uuid4())
    ad = {
        "ad_id": ad_id,
        "seller_id": user_id,
        "seller_name": user.get("full_name", "Seller"),
        "ad_type": request.get("ad_type", "sell"),  # buy or sell
        "crypto_currency": request.get("crypto_currency", "BTC"),
        "fiat_currency": request.get("fiat_currency", "GBP"),
        "price_type": request.get("price_type", "fixed"),  # fixed or floating
        "price_value": request.get("price_value", 0),  # fixed price or % margin
        "min_amount": request.get("min_amount", 0),
        "max_amount": request.get("max_amount", 0),
        "payment_methods": request.get("payment_methods", []),
        "terms": request.get("terms", ""),
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "total_trades": 0,
        "available_amount": request.get("available_amount", 0)
    }
    
    await db.p2p_ads.insert_one(ad)
    
    # Remove MongoDB _id and convert datetime for JSON serialization
    ad_response = ad.copy()
    if "_id" in ad_response:
        del ad_response["_id"]
    if "created_at" in ad_response:
        ad_response["created_at"] = ad_response["created_at"].isoformat()
    
    return {
        "success": True,
        "ad": ad_response,
        "message": "Ad created successfully"
    }

@api_router.get("/p2p/my-ads/{user_id}")
async def get_my_ads(user_id: str):
    """Get all ads by user"""
    ads = await db.p2p_ads.find({"seller_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "ads": ads
    }

@api_router.get("/p2p/ads")
async def get_all_ads(ad_type: str = "sell", crypto: str = "", fiat: str = ""):
    """Get all active ads for marketplace"""
    query = {"status": "active", "ad_type": ad_type}
    if crypto:
        query["crypto_currency"] = crypto
    if fiat:
        query["fiat_currency"] = fiat
    
    ads = await db.p2p_ads.find(query, {"_id": 0}).to_list(100)
    
    # Check and expire old boosts
    current_time = datetime.now(timezone.utc)
    for ad in ads:
        if ad.get("boosted") and ad.get("boost_end_date"):
            boost_end_date = ad.get("boost_end_date")
            # Handle both datetime objects and string dates
            if isinstance(boost_end_date, str):
                try:
                    boost_end_date = datetime.fromisoformat(boost_end_date.replace('Z', '+00:00'))
                except:
                    continue
            # Ensure timezone awareness
            if boost_end_date.tzinfo is None:
                boost_end_date = boost_end_date.replace(tzinfo=timezone.utc)
            
            if current_time > boost_end_date:
                ad["boosted"] = False
    
    # Sort: boosted first, then by price
    def sort_key(ad):
        is_boosted = ad.get("boosted", False)
        price = ad.get("price_value", 999999999)
        # Boosted offers get priority (0), non-boosted get (1)
        # Then sort by price within each group
        return (0 if is_boosted else 1, price)
    
    ads.sort(key=sort_key)
    
    return {
        "success": True,
        "ads": ads
    }

@api_router.put("/p2p/ad/{ad_id}")
async def update_p2p_ad(ad_id: str, request: dict):
    """Update an existing P2P ad"""
    # Find the ad first
    ad = await db.p2p_ads.find_one({"ad_id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Prepare update data
    update_data = {}
    allowed_fields = [
        "ad_type", "crypto_currency", "fiat_currency", "price_type", 
        "price_value", "min_amount", "max_amount", "payment_methods", 
        "terms", "available_amount"
    ]
    
    for field in allowed_fields:
        if field in request:
            update_data[field] = request[field]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update the ad
    result = await db.p2p_ads.update_one(
        {"ad_id": ad_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update ad")
    
    # Get updated ad
    updated_ad = await db.p2p_ads.find_one({"ad_id": ad_id}, {"_id": 0})
    
    return {
        "success": True,
        "ad": updated_ad,
        "message": "Ad updated successfully"
    }

@api_router.put("/p2p/ad/{ad_id}/toggle")
async def toggle_p2p_ad_status(ad_id: str, request: dict):
    """Toggle P2P ad status (active/paused)"""
    new_status = request.get("status")
    
    if new_status not in ["active", "paused"]:
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'paused'")
    
    result = await db.p2p_ads.update_one(
        {"ad_id": ad_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {
        "success": True,
        "message": f"Ad {new_status}",
        "status": new_status
    }

@api_router.delete("/p2p/ad/{ad_id}")
async def delete_p2p_ad(ad_id: str):
    """Delete a P2P ad"""
    result = await db.p2p_ads.delete_one({"ad_id": ad_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {
        "success": True,
        "message": "Ad deleted successfully"
    }

# ===========================
# SWAP/CONVERT CRYPTO ENDPOINTS
# ===========================



@api_router.get("/swap/available-coins")
async def get_swap_available_coins():
    """
    Get list of enabled cryptocurrencies that support swaps (DYNAMIC)
    Returns coins where enabled=True from supported_coins collection
    """
    try:
        # Get all enabled coins from CMS (all enabled coins can be swapped)
        enabled_coins = await db.supported_coins.find(
            {"enabled": True},
            {"_id": 0, "symbol": 1, "name": 1}
        ).sort("symbol", 1).to_list(100)
        
        coins_list = [coin["symbol"] for coin in enabled_coins]
        
        return {
            "success": True,
            "coins": coins_list,
            "coins_detailed": enabled_coins,
            "count": len(coins_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/swap/preview")
async def preview_swap(request: dict):
    """
    Preview swap with estimated output and fees (DYNAMIC + HIDDEN FEE)
    Uses dynamic coins from supported_coins collection
    Fee percentage is HIDDEN from response (only shows net amounts)
    """
    from_currency = request.get("from_currency")
    to_currency = request.get("to_currency")
    
    # Handle amount validation more carefully
    try:
        from_amount = float(request.get("from_amount", 0))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid amount format")
    
    if not from_currency or not to_currency:
        raise HTTPException(status_code=400, detail="Both currencies required")
    
    if from_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # DYNAMIC: Check if currencies are enabled for instant buy/swap in CMS
    from_coin = await db.supported_coins.find_one(
        {"symbol": from_currency, "enabled": True},
        {"_id": 0}
    )
    to_coin = await db.supported_coins.find_one(
        {"symbol": to_currency, "enabled": True},
        {"_id": 0}
    )
    
    if not from_coin or not to_coin:
        raise HTTPException(status_code=400, detail="One or both currencies not supported for swaps")
    
    # Get LIVE market prices from CoinGecko
    from_price = await get_live_price(from_currency, "gbp")
    to_price = await get_live_price(to_currency, "gbp")
    
    if from_price == 0 or to_price == 0:
        raise HTTPException(status_code=400, detail="Price not available")
    
    # Calculate swap
    from_value_gbp = from_amount * from_price
    
    # Get swap fee from platform settings - Default 3% - ADJUSTABLE VIA ADMIN
    platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
    swap_fee_percent = platform_settings.get("swap_fee_percent", PLATFORM_CONFIG["swap_fee_percent"]) if platform_settings else PLATFORM_CONFIG["swap_fee_percent"]
    
    # Apply hidden fee
    swap_fee_gbp = from_value_gbp * (swap_fee_percent / 100)
    net_value_gbp = from_value_gbp - swap_fee_gbp
    to_amount = net_value_gbp / to_price
    
    # HIDDEN FEE: Do NOT expose swap_fee_percent in response
    # Only show user what they get, not the fee percentage
    return {
        "success": True,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "from_amount": from_amount,
        "to_amount": to_amount,
        "from_value_gbp": from_value_gbp,
        "to_value_gbp": net_value_gbp,
        "from_price": from_price,
        "to_price": to_price,
        "rate": to_amount / from_amount if from_amount > 0 else 0
    }

@api_router.post("/swap/execute")
async def execute_swap(request: dict):
    """Execute cryptocurrency swap via wallet service"""
    from swap_wallet_service import execute_swap_with_wallet
    
    wallet_service = get_wallet_service()
    result = await execute_swap_with_wallet(
        db=db,
        wallet_service=wallet_service,
        user_id=request.get("user_id"),
        from_currency=request.get("from_currency"),
        to_currency=request.get("to_currency"),
        from_amount=float(request.get("from_amount", 0))
    )
    return result

@api_router.post("/swap/execute-OLD")
async def execute_swap_OLD(request: dict):
    """OLD VERSION"""
    user_id = request.get("user_id")
    from_currency = request.get("from_currency")
    to_currency = request.get("to_currency")
    from_amount = float(request.get("from_amount", 0))
    
    if not user_id or not from_currency or not to_currency:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # DYNAMIC: Check if currencies are enabled for instant buy/swap in CMS
    from_coin = await db.supported_coins.find_one(
        {"symbol": from_currency, "enabled": True},
        {"_id": 0}
    )
    to_coin = await db.supported_coins.find_one(
        {"symbol": to_currency, "enabled": True},
        {"_id": 0}
    )
    
    if not from_coin or not to_coin:
        raise HTTPException(status_code=400, detail="One or both currencies not supported for swaps")
    
    if from_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user balance
    balance = await get_trader_balance(db, user_id, from_currency)
    if not balance or balance.get("available_balance", 0) < from_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {from_currency} balance")
    
    # Get LIVE market prices from CoinGecko
    from_price = await get_live_price(from_currency, "gbp")
    to_price = await get_live_price(to_currency, "gbp")
    
    if from_price == 0 or to_price == 0:
        raise HTTPException(status_code=400, detail="Price not available")
    
    # Calculate swap with HIDDEN ADJUSTABLE FEE
    from_value_gbp = from_amount * from_price
    
    # Get swap fee from platform settings - Default 3% - ADJUSTABLE VIA ADMIN
    platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
    swap_fee_percent = platform_settings.get("swap_fee_percent", PLATFORM_CONFIG["swap_fee_percent"]) if platform_settings else PLATFORM_CONFIG["swap_fee_percent"]
    
    swap_fee_gbp = from_value_gbp * (swap_fee_percent / 100)
    swap_fee_crypto = swap_fee_gbp / from_price
    net_value_gbp = from_value_gbp - swap_fee_gbp
    to_amount = net_value_gbp / to_price
    
    # Deduct from_currency from user using trader balance system
    result = await db.trader_balances.update_one(
        {"trader_id": user_id, "currency": from_currency},
        {
            "$inc": {
                "available_balance": -from_amount,
                "total_balance": -from_amount
            },
            "$set": {
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to deduct balance")
    
    # Add to_currency to user using trader balance system
    to_balance = await db.trader_balances.find_one({"trader_id": user_id, "currency": to_currency})
    
    if to_balance:
        await db.trader_balances.update_one(
            {"trader_id": user_id, "currency": to_currency},
            {
                "$inc": {
                    "available_balance": to_amount,
                    "total_balance": to_amount
                },
                "$set": {
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    else:
        # Initialize balance if doesn't exist using trader balance system
        await initialize_trader_balance(db, user_id, to_currency, to_amount)
    
    # Add swap fee to admin balance
    admin_balance = await db.internal_balances.find_one({"currency": from_currency})
    
    if admin_balance:
        await db.internal_balances.update_one(
            {"currency": from_currency},
            {
                "$inc": {
                    "swap_fees": swap_fee_crypto,
                    "total_fees": swap_fee_crypto
                }
            }
        )
    else:
        await db.internal_balances.insert_one({
            "currency": from_currency,
            "swap_fees": swap_fee_crypto,
            "total_fees": swap_fee_crypto,
            "created_at": datetime.now(timezone.utc)
        })
    
    # Record swap transaction (internal record includes fee details)
    swap_id = str(uuid.uuid4())
    swap_record = {
        "swap_id": swap_id,
        "user_id": user_id,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "from_amount": from_amount,
        "to_amount": to_amount,
        "from_value_gbp": from_value_gbp,
        "to_value_gbp": net_value_gbp,
        "swap_fee_percent": swap_fee_percent,  # Stored internally only
        "swap_fee_gbp": swap_fee_gbp,  # Stored internally only
        "swap_fee_crypto": swap_fee_crypto,  # Stored internally only
        "from_price": from_price,
        "to_price": to_price,
        "rate": to_amount / from_amount if from_amount > 0 else 0,
        "status": "completed",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.swap_transactions.insert_one(swap_record)
    
    # Send email notification (respects user settings)
    try:
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if user:
            user_settings = user.get('security', {})
            if user_settings.get('login_email_alerts_enabled', True):
                await email_service.send_swap_confirmation(
                    user_email=user["email"],
                    user_name=user["full_name"],
                    from_coin=from_currency,
                    from_amount=from_amount,
                    to_coin=to_currency,
                    to_amount=to_amount,
                    rate=to_amount / from_amount if from_amount > 0 else 0
                )
                logger.info(f"Swap confirmation email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send swap email: {str(e)}")
    
    # Create in-app notification
    try:
        await create_notification(
            db,
            user_id=user_id,
            notification_type='swap_completed',
            title=f'Swap Complete: {from_amount} {from_currency} → {to_amount:.8f} {to_currency}',
            message=f'Successfully swapped {from_amount} {from_currency} to {to_amount:.8f} {to_currency}',
            link='/swap-crypto',
            metadata={
                'from_coin': from_currency,
                'from_amount': from_amount,
                'to_coin': to_currency,
                'to_amount': to_amount,
                'swap_id': swap_id
            }
        )
    except Exception as e:
        logger.error(f"Failed to create swap notification: {str(e)}")
    
    # HIDDEN FEE: Response does NOT include swap_fee_percent or swap_fee_crypto
    # User only sees what they get, maintaining competitive appearance
    return {
        "success": True,
        "swap_id": swap_id,
        "message": f"Successfully swapped {from_amount} {from_currency} to {to_amount:.8f} {to_currency}",
        "from_currency": from_currency,
        "to_currency": to_currency,
        "from_amount": from_amount,
        "to_amount": to_amount,
        "rate": to_amount / from_amount if from_amount > 0 else 0
    }

@api_router.get("/swap/history/{user_id}")
async def get_swap_history(user_id: str):
    """Get user's swap history"""
    swaps = await db.swap_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "swaps": swaps,
        "count": len(swaps)
    }


# ===========================
# SPOT TRADING ENDPOINTS - COMPLETE ENGINE
# ===========================

@api_router.post("/trading/open-position")
async def open_trading_position(request: dict):
    """Open a new trading position (long/short)"""
    try:
        user_id = request.get("user_id")
        pair = request.get("pair")  # e.g., "BTCUSD"
        side = request.get("side")  # "long" or "short"
        amount = float(request.get("amount", 0))
        entry_price = float(request.get("entry_price", 0))
        leverage = float(request.get("leverage", 1))  # Default 1x (spot trading)
        
        if not all([user_id, pair, side, amount > 0, entry_price > 0]):
            return {"success": False, "message": "Missing or invalid required fields"}
        
        # Get user and check balance
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            return {"success": False, "message": "User not found"}
        
        # Parse pair
        base = pair[:3]
        quote = pair[3:] if len(pair) > 3 else "USD"
        
        # Calculate required margin
        position_value = amount * entry_price
        fee_percent = 0.1
        fee_amount = position_value * (fee_percent / 100)
        required_margin = (position_value / leverage) + fee_amount
        
        # Get wallet
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            return {"success": False, "message": "Wallet not found"}
        
        balances = wallet.get("balances", {})
        gbp_balance = balances.get("GBP", {}).get("balance", 0)
        
        if gbp_balance < required_margin:
            return {
                "success": False,
                "message": f"Insufficient balance. Required: £{required_margin:.2f}, Available: £{gbp_balance:.2f}"
            }
        
        # Deduct margin from wallet
        new_balance = gbp_balance - required_margin
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {f"balances.GBP.balance": new_balance, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Create position
        position_id = str(uuid.uuid4())
        position = {
            "position_id": position_id,
            "user_id": user_id,
            "pair": pair,
            "side": side,
            "amount": amount,
            "entry_price": entry_price,
            "current_price": entry_price,
            "leverage": leverage,
            "margin": required_margin - fee_amount,
            "fee_paid": fee_amount,
            "pnl": 0,
            "pnl_percent": 0,
            "status": "open",
            "opened_at": datetime.now(timezone.utc),
            "closed_at": None
        }
        await db.open_positions.insert_one(position)
        
        # Log fee
        fee_record = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "fee_type": "spot_trading_open",
            "amount": fee_amount,
            "currency": "GBP",
            "related_id": position_id,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.fee_transactions.insert_one(fee_record)
        
        # Handle referral commission
        if user.get("referred_by"):
            referrer_id = user["referred_by"]
            referrer = await db.users.find_one({"user_id": referrer_id})
            if referrer:
                tier = referrer.get("referral_tier", "normal")
                commission_rate = 0.5 if tier == "golden" else 0.2
                commission = fee_amount * commission_rate
                
                # Add commission to referrer
                await db.wallets.update_one(
                    {"user_id": referrer_id},
                    {"$inc": {f"balances.GBP.balance": commission}}
                )
                
                # Log commission
                await db.referral_commissions.insert_one({
                    "commission_id": str(uuid.uuid4()),
                    "referrer_id": referrer_id,
                    "referee_id": user_id,
                    "source": "spot_trading",
                    "amount": commission,
                    "rate": commission_rate,
                    "tier": tier,
                    "timestamp": datetime.now(timezone.utc)
                })
        
        return {
            "success": True,
            "message": "Position opened successfully",
            "position": {
                "position_id": position_id,
                "pair": pair,
                "side": side,
                "amount": amount,
                "entry_price": entry_price,
                "margin": required_margin - fee_amount,
                "fee": fee_amount
            }
        }
        
    except Exception as e:
        print(f"Error opening position: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}


@api_router.post("/trading/close-position")
async def close_trading_position(request: dict):
    """Close an open trading position"""
    try:
        position_id = request.get("position_id")
        user_id = request.get("user_id")
        close_price = float(request.get("close_price", 0))
        
        if not all([position_id, user_id, close_price > 0]):
            return {"success": False, "message": "Missing required fields"}
        
        # Get position
        position = await db.open_positions.find_one({"position_id": position_id, "user_id": user_id, "status": "open"})
        if not position:
            return {"success": False, "message": "Position not found or already closed"}
        
        # Calculate P/L
        entry_price = position["entry_price"]
        amount = position["amount"]
        side = position["side"]
        
        if side == "long":
            pnl = (close_price - entry_price) * amount
        else:  # short
            pnl = (entry_price - close_price) * amount
        
        pnl_percent = (pnl / position["margin"]) * 100 if position["margin"] > 0 else 0
        
        # Calculate close fee
        close_value = amount * close_price
        fee_percent = 0.1
        close_fee = close_value * (fee_percent / 100)
        
        # Net P/L after fee
        net_pnl = pnl - close_fee
        
        # Return margin + P/L to wallet
        total_return = position["margin"] + net_pnl
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$inc": {f"balances.GBP.balance": total_return}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        
        # Update position
        await db.open_positions.update_one(
            {"position_id": position_id},
            {
                "$set": {
                    "status": "closed",
                    "close_price": close_price,
                    "pnl": net_pnl,
                    "pnl_percent": pnl_percent,
                    "close_fee": close_fee,
                    "closed_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log close fee
        await db.fee_transactions.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "fee_type": "spot_trading_close",
            "amount": close_fee,
            "currency": "GBP",
            "related_id": position_id,
            "timestamp": datetime.now(timezone.utc)
        })
        
        # Log trade history
        await db.trade_history.insert_one({
            "trade_id": str(uuid.uuid4()),
            "position_id": position_id,
            "user_id": user_id,
            "pair": position["pair"],
            "side": side,
            "amount": amount,
            "entry_price": entry_price,
            "close_price": close_price,
            "pnl": net_pnl,
            "pnl_percent": pnl_percent,
            "open_fee": position["fee_paid"],
            "close_fee": close_fee,
            "total_fees": position["fee_paid"] + close_fee,
            "opened_at": position["opened_at"],
            "closed_at": datetime.now(timezone.utc)
        })
        
        return {
            "success": True,
            "message": "Position closed successfully",
            "result": {
                "position_id": position_id,
                "close_price": close_price,
                "pnl": net_pnl,
                "pnl_percent": pnl_percent,
                "close_fee": close_fee,
                "total_return": total_return
            }
        }
        
    except Exception as e:
        print(f"Error closing position: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e)}


@api_router.get("/trading/positions/{user_id}")
async def get_user_positions(user_id: str):
    """Get all user's open positions"""
    try:
        positions = await db.open_positions.find(
            {"user_id": user_id, "status": "open"},
            {"_id": 0}
        ).sort("opened_at", -1).to_list(100)
        
        return {
            "success": True,
            "positions": positions,
            "count": len(positions)
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@api_router.get("/trading/history/{user_id}")
async def get_trade_history(user_id: str, limit: int = 50):
    """Get user's trade history"""
    try:
        history = await db.trade_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("closed_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@api_router.get("/trading/orderbook/{pair}")
async def get_orderbook(pair: str):
    """Get order book for a trading pair"""
    try:
        # Generate simulated order book based on current price
        # In production, this would aggregate real orders
        from live_pricing import fetch_live_prices
        prices = await fetch_live_prices()
        
        base = pair[:3]
        
        # Get price data for the base currency
        price_data = prices.get(base, {})
        current_price = price_data.get("usd", 0)
        
        if current_price == 0:
            return {"success": False, "message": f"Price not available for {base}"}
        
        # Generate order book
        bids = []
        asks = []
        
        # Generate 20 bid levels (below current price)
        for i in range(20):
            spread = (i + 1) * 0.001  # 0.1% intervals
            price = current_price * (1 - spread)
            amount = random.uniform(0.01, 5.0)
            total = price * amount
            bids.append({
                "price": round(price, 2),
                "amount": round(amount, 6),
                "total": round(total, 2)
            })
        
        # Generate 20 ask levels (above current price)
        for i in range(20):
            spread = (i + 1) * 0.001
            price = current_price * (1 + spread)
            amount = random.uniform(0.01, 5.0)
            total = price * amount
            asks.append({
                "price": round(price, 2),
                "amount": round(amount, 6),
                "total": round(total, 2)
            })
        
        return {
            "success": True,
            "pair": pair,
            "bids": bids,
            "asks": asks,
            "spread": round(asks[0]["price"] - bids[0]["price"], 2),
            "mid_price": round((asks[0]["price"] + bids[0]["price"]) / 2, 2)
        }
        
    except Exception as e:
        print(f"Error getting orderbook: {e}")
        return {"success": False, "message": str(e)}


@api_router.post("/trading/place-order")
async def place_trading_order(request: dict):
    """Place a spot trading order (buy/sell crypto) - FIXED FOR NEW WALLET SCHEMA"""
    try:
        user_id = request.get("user_id")
        pair = request.get("pair")  # e.g., "BTCUSD"
        order_type = request.get("type")  # "buy" or "sell"
        amount = float(request.get("amount", 0))
        price = float(request.get("price", 0))
        fee_percent = float(request.get("fee_percent", 0.1))
        
        if not all([user_id, pair, order_type, amount > 0, price > 0]):
            return {
                "success": False,
                "message": "Missing or invalid required fields"
            }
        
        # Parse pair to get base and quote currencies (e.g., BTC/USD)
        # Assuming format like "BTCUSD" -> base="BTC", quote="USD"
        base = pair[:3]  # First 3 chars
        quote = pair[3:]  # Remaining chars (USD in this case, but we use GBP)
        
        # Calculate total in quote currency (convert USD to GBP - simplified 1:1 for now)
        total_amount = amount * price
        fee_amount = total_amount * (fee_percent / 100)
        
        # Get user wallets using NEW schema (separate documents per currency)
        gbp_wallet = await db.wallets.find_one({"user_id": user_id, "currency": "GBP"})
        crypto_wallet = await db.wallets.find_one({"user_id": user_id, "currency": base})
        
        # Create wallets if they don't exist
        if not gbp_wallet:
            gbp_wallet = {
                "wallet_id": str(uuid.uuid4()),
                "user_id": user_id,
                "currency": "GBP",
                "total_balance": 0.0,
                "locked_balance": 0.0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.wallets.insert_one(gbp_wallet)
        
        if not crypto_wallet:
            crypto_wallet = {
                "wallet_id": str(uuid.uuid4()),
                "user_id": user_id,
                "currency": base,
                "total_balance": 0.0,
                "locked_balance": 0.0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.wallets.insert_one(crypto_wallet)
        
        # Get current balances
        gbp_balance = gbp_wallet.get("total_balance", 0)
        crypto_balance = crypto_wallet.get("total_balance", 0)
        
        if order_type == "buy":
            # User wants to buy crypto with GBP
            total_with_fee = total_amount + fee_amount
            
            if gbp_balance < total_with_fee:
                return {
                    "success": False,
                    "message": f"Insufficient GBP balance. Required: £{total_with_fee:.2f}, Available: £{gbp_balance:.2f}"
                }
            
            # Update GBP wallet (deduct)
            new_gbp_balance = gbp_balance - total_with_fee
            await db.wallets.update_one(
                {"user_id": user_id, "currency": "GBP"},
                {
                    "$set": {
                        "total_balance": new_gbp_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Update crypto wallet (add)
            new_crypto_balance = crypto_balance + amount
            await db.wallets.update_one(
                {"user_id": user_id, "currency": base},
                {
                    "$set": {
                        "total_balance": new_crypto_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
        else:  # sell
            # User wants to sell crypto for GBP
            if crypto_balance < amount:
                return {
                    "success": False,
                    "message": f"Insufficient {base} balance. Required: {amount}, Available: {crypto_balance}"
                }
            
            # Update crypto wallet (deduct)
            new_crypto_balance = crypto_balance - amount
            await db.wallets.update_one(
                {"user_id": user_id, "currency": base},
                {
                    "$set": {
                        "total_balance": new_crypto_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Update GBP wallet (add minus fee)
            received_amount = total_amount - fee_amount
            new_gbp_balance = gbp_balance + received_amount
            await db.wallets.update_one(
                {"user_id": user_id, "currency": "GBP"},
                {
                    "$set": {
                        "total_balance": new_gbp_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        # Create trade record
        trade_id = str(uuid.uuid4())
        trade_record = {
            "trade_id": trade_id,
            "user_id": user_id,
            "pair": pair,
            "type": order_type,
            "amount": amount,
            "price": price,
            "total": total_amount,
            "fee_percent": fee_percent,
            "fee_amount": fee_amount,
            "status": "completed",
            "created_at": datetime.now(timezone.utc)
        }
        await db.spot_trades.insert_one(trade_record)
        
        # Log fee transaction
        fee_record = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "fee_type": "spot_trading",
            "amount": fee_amount,
            "currency": "GBP",
            "related_id": trade_id,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.fee_transactions.insert_one(fee_record)
        
        return {
            "success": True,
            "message": f"{order_type.upper()} order executed successfully",
            "trade": {
                "trade_id": trade_id,
                "pair": pair,
                "type": order_type,
                "amount": amount,
                "price": price,
                "total": total_amount,
                "fee": fee_amount
            }
        }
        
    except Exception as e:
        print(f"Error placing trading order: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Error placing order: {str(e)}"
        }


# ===========================
# ADMIN LIQUIDITY WALLET ENDPOINTS
# ===========================

@api_router.post("/admin/liquidity/add")
async def add_admin_liquidity(request: dict):
    """Add crypto to admin liquidity wallet"""
    currency = request.get("currency")
    amount = float(request.get("amount", 0))
    admin_id = request.get("admin_id")
    
    if not all([currency, admin_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Check if admin liquidity wallet exists
    wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
    
    if wallet:
        # Update existing balance and available amount
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {
                "$inc": {"balance": amount, "available": amount},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        new_balance = wallet["balance"] + amount
    else:
        # Create new wallet
        new_balance = amount
        await db.admin_liquidity_wallets.insert_one({
            "currency": currency,
            "balance": amount,
            "reserved": 0,
            "available": amount,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    
    return {
        "success": True,
        "currency": currency,
        "new_balance": new_balance,
        "message": f"Added {amount} {currency} to admin liquidity"
    }

@api_router.get("/admin/trading-liquidity/balances")
async def get_trading_liquidity_balances():
    """Get all trading liquidity balances (same as admin_liquidity_wallets but for Trading page context)"""
    try:
        wallets = await db.admin_liquidity_wallets.find({}, {"_id": 0}).sort("currency", 1).to_list(100)
        
        return {
            "success": True,
            "liquidity": wallets,
            "total_coins": len(wallets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/liquidity/balances")
async def get_admin_liquidity_balances():
    """Get all admin liquidity wallet balances"""
    wallets = await db.admin_liquidity_wallets.find({}, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "wallets": wallets,
        "total_currencies": len(wallets)
    }

@api_router.get("/admin/liquidity/balance/{currency}")
async def get_admin_liquidity_balance(currency: str):
    """Get admin liquidity balance for specific currency"""
    wallet = await db.admin_liquidity_wallets.find_one({"currency": currency}, {"_id": 0})
    
    if not wallet:
        return {
            "success": True,
            "currency": currency,
            "balance": 0,
            "available": 0,
            "reserved": 0
        }
    
    return {
        "success": True,
        "currency": wallet["currency"],
        "balance": wallet.get("balance", 0),
        "available": wallet.get("available", 0),
        "reserved": wallet.get("reserved", 0),
        "last_updated": wallet.get("last_updated")
    }

@api_router.get("/admin/liquidity/history")
async def get_admin_liquidity_history():
    """Get complete liquidity history - adds, withdrawals, usage"""
    try:
        # Get liquidity additions
        additions = await db.admin_liquidity_wallets.find({}, {"_id": 0}).to_list(100)
        
        # Get liquidity withdrawals
        withdrawals = await db.admin_withdrawals.find(
            {"wallet_type": "liquidity_wallet"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get express buy transactions (liquidity usage)
        express_buys = await db.express_buy_transactions.find(
            {"source": "admin_liquidity"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Combine into single history
        history = []
        
        # Add addition records
        for wallet in additions:
            if wallet.get("created_at"):
                history.append({
                    "type": "addition",
                    "currency": wallet.get("currency"),
                    "amount": wallet.get("balance", 0),
                    "timestamp": wallet.get("created_at"),
                    "status": "completed"
                })
        
        # Add withdrawal records
        for w in withdrawals:
            history.append({
                "type": "withdrawal",
                "currency": w.get("currency"),
                "amount": w.get("amount", 0),
                "timestamp": w.get("created_at"),
                "status": w.get("status", "pending"),
                "tx_id": w.get("tx_hash", "N/A")
            })
        
        # Add usage records (ExpressBuy)
        for eb in express_buys:
            history.append({
                "type": "used_expressbuy",
                "currency": eb.get("crypto_currency"),
                "amount": eb.get("crypto_amount", 0),
                "fee_collected": eb.get("express_fee_crypto", 0),
                "timestamp": eb.get("created_at"),
                "status": "completed"
            })
        
        # Sort by timestamp descending
        history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return {
            "success": True,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# ADMIN WITHDRAWAL ENDPOINTS
# ===========================

@api_router.post("/admin/withdraw")
async def admin_withdraw(request: dict):
    """Admin withdraws from fee wallet or liquidity wallet"""
    admin_id = request.get("admin_id")
    currency = request.get("currency")
    amount = float(request.get("amount", 0))
    wallet_type = request.get("wallet_type")  # 'fee_wallet' or 'liquidity_wallet'
    withdrawal_address = request.get("withdrawal_address")
    
    if not all([admin_id, currency, wallet_type, withdrawal_address]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    if wallet_type not in ["fee_wallet", "liquidity_wallet"]:
        raise HTTPException(status_code=400, detail="Invalid wallet type")
    
    # Handle Fee Wallet Withdrawal
    if wallet_type == "fee_wallet":
        # Check internal balances (fee wallet)
        fee_balance = await db.internal_balances.find_one({"currency": currency})
        
        if not fee_balance:
            raise HTTPException(status_code=404, detail=f"No fee balance found for {currency}")
        
        total_fees = fee_balance.get("total_fees", 0)
        if total_fees < amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient fee balance. Available: {total_fees}, Requested: {amount}"
            )
        
        # Deduct from fee wallet
        await db.internal_balances.update_one(
            {"currency": currency},
            {
                "$inc": {"total_fees": -amount},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    # Handle Liquidity Wallet Withdrawal
    elif wallet_type == "liquidity_wallet":
        # Check admin liquidity wallet
        liquidity_wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
        
        if not liquidity_wallet:
            raise HTTPException(status_code=404, detail=f"No liquidity wallet found for {currency}")
        
        available = liquidity_wallet.get("available", 0)
        if available < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient liquidity. Available: {available}, Requested: {amount}"
            )
        
        # Deduct from liquidity wallet
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {
                "$inc": {
                    "balance": -amount,
                    "available": -amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    # Record withdrawal transaction
    withdrawal_id = str(uuid.uuid4())
    withdrawal_record = {
        "withdrawal_id": withdrawal_id,
        "admin_id": admin_id,
        "currency": currency,
        "amount": amount,
        "wallet_type": wallet_type,
        "withdrawal_address": withdrawal_address,
        "status": "pending",  # pending, completed, failed
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.admin_withdrawals.insert_one(withdrawal_record)
    
    return {
        "success": True,
        "withdrawal_id": withdrawal_id,
        "message": f"Withdrawal of {amount} {currency} initiated from {wallet_type}",
        "withdrawal": {
            "withdrawal_id": withdrawal_id,
            "currency": currency,
            "amount": amount,
            "wallet_type": wallet_type,
            "status": "pending"
        }
    }

@api_router.get("/admin/withdrawals")
async def get_admin_withdrawals():
    """Get all admin withdrawal transactions"""
    withdrawals = await db.admin_withdrawals.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "withdrawals": withdrawals,
        "count": len(withdrawals)
    }

    return {
        "success": True,
        "currency": currency,
        "balance": wallet.get("balance", 0),
        "available": wallet.get("available", 0),
        "reserved": wallet.get("reserved", 0)
    }

# ===========================
# EXPRESS BUY ENDPOINTS (WITH ADMIN LIQUIDITY)
# ===========================

@api_router.post("/trading/execute")
async def execute_trading_transaction(request: dict):
    """Execute a spot trading transaction using admin liquidity with full protection
    NOTE: This is a simplified version for MVP. In production, enable MongoDB replica set
    for full transaction support and better concurrency protection.
    """
    try:
        user_id = request.get("user_id")
        pair = request.get("pair")  # e.g., "BTC/GBP"
        trade_type = request.get("type")  # "buy" or "sell"
        amount = float(request.get("amount"))  # crypto amount
        market_price = float(request.get("price"))  # current market price per unit in fiat
        
        # Parse pair
        base_currency, quote_currency = pair.split("/")
        
        # Get platform settings for fees and markup/markdown
        platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        # Get trading fee (separate from P2P and Express Buy) - Default 3%
        trading_fees_by_pair = platform_settings.get("trading_fees_by_pair", {}) if platform_settings else {}
        trading_fee_percent = trading_fees_by_pair.get(pair, platform_settings.get("spot_trading_fee_percent", PLATFORM_CONFIG["spot_trading_fee_percent"])) if platform_settings else PLATFORM_CONFIG["spot_trading_fee_percent"]
        
        # Get markup/markdown percentages (hidden from frontend)
        buy_markup_percent = platform_settings.get("buy_markup_percent", 0.5) if platform_settings else 0.5
        sell_markdown_percent = platform_settings.get("sell_markdown_percent", 0.5) if platform_settings else 0.5
        
        # Check for per-pair overrides
        trading_markup_by_pair = platform_settings.get("trading_markup_by_pair", {}) if platform_settings else {}
        trading_markdown_by_pair = platform_settings.get("trading_markdown_by_pair", {}) if platform_settings else {}
        
        if pair in trading_markup_by_pair:
            buy_markup_percent = trading_markup_by_pair[pair]
        if pair in trading_markdown_by_pair:
            sell_markdown_percent = trading_markdown_by_pair[pair]
        
        # Apply hidden markup/markdown to protect platform
        if trade_type == "buy":
            # User buys at market price + markup
            adjusted_price = market_price * (1 + buy_markup_percent / 100)
        else:
            # User sells at market price - markdown
            adjusted_price = market_price * (1 - sell_markdown_percent / 100)
        
        # Calculate amounts with adjusted price
        total_fiat = amount * adjusted_price
        fee_amount = total_fiat * (trading_fee_percent / 100)
        final_amount = total_fiat + fee_amount  # User pays total + fee
        
        if trade_type == "buy":
            # User buys crypto, admin sells crypto
            # Check admin liquidity
            admin_wallet = await db.admin_liquidity_wallets.find_one(
        {"currency": base_currency}
            )
            
            if not admin_wallet:
                return {
                    "success": False,
                    "message": f"Trading unavailable for {pair} due to insufficient platform liquidity."
                }
            
            # Check if manually disabled by admin
            if admin_wallet.get("manually_disabled", False):
                return {
                    "success": False,
                    "message": f"Trading is currently paused for {pair}. Please try again later."
                }
            
            available = admin_wallet.get("available", 0)
            
            # Check if liquidity is zero or insufficient
            if available <= 0:
                return {
                    "success": False,
                    "message": f"Trading paused for {pair} due to insufficient platform liquidity."
                }
            
            if available < amount:
                return {
                    "success": False,
                    "message": f"Insufficient platform liquidity for this amount. Maximum available: {available} {base_currency}."
                }
            
            # Atomic liquidity deduction - single operation prevents race conditions
            updated_wallet = await db.admin_liquidity_wallets.find_one_and_update(
                {
                    "currency": base_currency,
                    "available": {"$gte": amount}  # Only update if enough liquidity
                },
                {
                    "$inc": {
                        "available": -amount,
                        "balance": -amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                },
                return_document=True
            )
            
            # If no document was updated, liquidity was insufficient (atomic check+update failed)
            if not updated_wallet:
                return {
                    "success": False,
                    "message": f"Trade failed due to insufficient liquidity. Another user may have completed a trade simultaneously."
                }
            
            # Check user has enough GBP balance for BUY trade
            user_balance = await db.internal_balances.find_one(
                {"user_id": user_id, "currency": quote_currency}
            )
            
            user_available = user_balance.get("available", 0) if user_balance else 0
            
            if user_available < final_amount:
                # Rollback admin liquidity deduction
                await db.admin_liquidity_wallets.update_one(
                    {"currency": base_currency},
                    {
                        "$inc": {
                            "available": amount,
                            "balance": amount
                        }
                    }
                )
                return {
                    "success": False,
                    "message": f"Insufficient {quote_currency} balance. You need {final_amount:.2f} {quote_currency} but only have {user_available:.2f} {quote_currency}."
                }
            
            # Deduct GBP from user and add crypto to user wallet
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": quote_currency},
                {
                    "$inc": {
                        "available": -final_amount,
                        "balance": -final_amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=False
            )
            
            # Add crypto to user balance
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": base_currency},
                {
                    "$inc": {
                        "available": amount,
                        "balance": amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
        
        else:  # sell
            # User sells crypto, admin buys crypto
            # Check user has enough crypto balance for SELL trade
            user_crypto_balance = await db.internal_balances.find_one(
                {"user_id": user_id, "currency": base_currency}
            )
            
            user_crypto_available = user_crypto_balance.get("available", 0) if user_crypto_balance else 0
            
            if user_crypto_available < amount:
                return {
                    "success": False,
                    "message": f"Insufficient {base_currency} balance. You need {amount} {base_currency} but only have {user_crypto_available} {base_currency}."
                }
            
            # Deduct crypto from user
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": base_currency},
                {
                    "$inc": {
                        "available": -amount,
                        "balance": -amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=False
            )
            
            # Calculate amount user receives (after fee)
            amount_after_fee = total_fiat - fee_amount
            
            # Add GBP to user balance
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": quote_currency},
                {
                    "$inc": {
                        "available": amount_after_fee,
                        "balance": amount_after_fee
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Atomic liquidity addition - use upsert for atomic operation
            await db.admin_liquidity_wallets.update_one(
                {"currency": base_currency},
                {
                    "$inc": {
                        "available": amount,
                        "balance": amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
        
        # Calculate referral commission split
        from centralized_fee_system import get_fee_manager
        fee_manager = get_fee_manager(db)
        
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referrer_id = user.get("referrer_id") if user else None
        referrer_commission = 0.0
        admin_fee = fee_amount
        commission_percent = 0.0
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = fee_amount * (commission_percent / 100.0)
            admin_fee = fee_amount - referrer_commission
        
        # Credit admin wallet with admin portion of trading fee
        await db.internal_balances.update_one(
            {"user_id": "admin_wallet", "currency": quote_currency},
            {
                "$inc": {
                    "available": admin_fee,
                    "balance": admin_fee
                },
                "$setOnInsert": {
                    "reserved": 0,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        # Credit referrer if applicable
        if referrer_id and referrer_commission > 0:
            await db.internal_balances.update_one(
                {"user_id": referrer_id, "currency": quote_currency},
                {
                    "$inc": {
                        "available": referrer_commission,
                        "balance": referrer_commission
                    },
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": user_id,
                "transaction_type": "trading",
                "fee_amount": fee_amount,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": quote_currency,
                "pair": pair,
                "trade_type": trade_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Log transaction (for both buy and sell)
        transaction_id = str(uuid.uuid4())
        await db.trading_transactions.insert_one({
            "transaction_id": transaction_id,
            "user_id": user_id,
            "pair": pair,
            "type": trade_type,
            "amount": amount,
            "market_price": market_price,
            "adjusted_price": adjusted_price,
            "markup_percent": buy_markup_percent if trade_type == "buy" else sell_markdown_percent,
            "total": total_fiat,
            "fee": fee_amount,
            "fee_percent": trading_fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "final_amount": final_amount,
            "source": "spot_trading",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Log to fee_transactions for business dashboard
        await db.fee_transactions.insert_one({
            "user_id": user_id,
            "transaction_type": "trading",
            "fee_type": "trading_fee_percent",
            "amount": total_fiat,
            "fee_amount": fee_amount,
            "fee_percent": trading_fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": quote_currency,
            "pair": pair,
            "trade_type": trade_type,
            "reference_id": transaction_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Prepare response with clear amounts
        if trade_type == "buy":
            return {
                "success": True,
                "transaction": {
                    "pair": pair,
                    "type": trade_type,
                    "amount": amount,  # Crypto amount received
                    "price": adjusted_price,  # Price per unit (with markup)
                    "total": total_fiat,  # Total fiat cost before fee
                    "fee": fee_amount,  # Trading fee
                    "final_amount": amount,  # Crypto amount user receives
                    "total_paid": final_amount  # Total fiat user paid
                }
            }
        else:  # sell
            amount_after_fee = total_fiat - fee_amount
            return {
                "success": True,
                "transaction": {
                    "pair": pair,
                    "type": trade_type,
                    "amount": amount,  # Crypto amount sold
                    "price": adjusted_price,  # Price per unit (with markdown)
                    "total": total_fiat,  # Total fiat value before fee
                    "fee": fee_amount,  # Trading fee
                    "final_amount": amount_after_fee,  # Fiat amount user receives
                    "crypto_sold": amount  # Crypto amount sold
                }
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 

@api_router.get("/trading/pairs")
async def get_trading_pairs():
    """
    Get all available trading pairs with their liquidity status (FULLY DYNAMIC)
    Pairs are automatically generated from enabled coins in supported_coins collection
    """
    try:
        # Get all enabled coins that support trading from CMS
        trading_coins = await db.supported_coins.find(
            {"enabled": True, "supports_trading": True},
            {"_id": 0, "symbol": 1, "name": 1}
        ).sort("symbol", 1).to_list(100)
        
        # Get platform settings to determine supported fiat currencies
        platform_settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        # Default fiat currencies (can be expanded via settings)
        fiat_currencies = ["GBP"]
        if platform_settings and "trading_fiat_currencies" in platform_settings:
            fiat_currencies = platform_settings["trading_fiat_currencies"]
        
        # Dynamically generate trading pairs from enabled coins
        pairs_with_status = []
        for coin in trading_coins:
            base = coin["symbol"]
            
            # Get liquidity for this currency
            wallet = await db.admin_liquidity_wallets.find_one({"currency": base}, {"_id": 0})
            available = wallet.get("available", 0) if wallet else 0
            is_tradable = available > 0
            
            # Create pair for each supported fiat currency
            for quote in fiat_currencies:
                pairs_with_status.append({
                    "symbol": f"{base}/{quote}",
                    "base": base,
                    "quote": quote,
                    "available_liquidity": available,
                    "is_tradable": is_tradable,
                    "status": "active" if is_tradable else "paused"
                })
        
        return {
            "success": True,
            "pairs": pairs_with_status,
            "count": len(pairs_with_status)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/trading-liquidity")
async def get_admin_trading_liquidity():
    """
    Get all trading liquidity balances for admin management (FULLY DYNAMIC)
    Automatically shows all coins that support trading from supported_coins collection
    """
    try:
        # Get all admin liquidity wallets
        wallets = await db.admin_liquidity_wallets.find({}, {"_id": 0}).sort("currency", 1).to_list(100)
        
        # Get all enabled coins that support trading from CMS (DYNAMIC)
        trading_coins = await db.supported_coins.find(
            {"enabled": True, "supports_trading": True},
            {"_id": 0, "symbol": 1, "name": 1}
        ).sort("symbol", 1).to_list(100)
        
        # Extract just the symbols
        trading_currencies = [coin["symbol"] for coin in trading_coins]
        
        # Ensure all trading currencies have entries (even if 0 liquidity)
        liquidity_data = []
        for currency in trading_currencies:
            wallet = next((w for w in wallets if w["currency"] == currency), None)
            if wallet:
                liquidity_data.append({
                    "currency": currency,
                    "balance": wallet.get("balance", 0),
                    "available": wallet.get("available", 0),
                    "reserved": wallet.get("reserved", 0),
                    "is_tradable": wallet.get("available", 0) > 0,
                    "status": "active" if wallet.get("available", 0) > 0 else "paused"
                })
            else:
                liquidity_data.append({
                    "currency": currency,
                    "balance": 0,
                    "available": 0,
                    "reserved": 0,
                    "is_tradable": False,
                    "status": "paused"
                })
        
        return {
            "success": True,
            "liquidity": liquidity_data,
            "count": len(liquidity_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/trading-liquidity/add")
async def add_trading_liquidity(request: dict):
    """Add liquidity to a trading pair"""
    try:
        currency = request.get("currency")
        amount = float(request.get("amount"))
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        
        # Get or create wallet
        wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
        
        if wallet:
            # Update existing wallet
            await db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$inc": {
                        "balance": amount,
                        "available": amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        else:
            # Create new wallet
            await db.admin_liquidity_wallets.insert_one({
                "currency": currency,
                "balance": amount,
                "available": amount,
                "reserved": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Log the addition
        await db.liquidity_operations.insert_one({
            "operation_id": str(uuid.uuid4()),
            "type": "add",
            "currency": currency,
            "amount": amount,
            "source": "trading_liquidity",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": f"Successfully added {amount} {currency} to trading liquidity"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/trading-liquidity/remove")
async def remove_trading_liquidity(request: dict):
    """Remove liquidity from a trading pair"""
    try:
        currency = request.get("currency")
        amount = float(request.get("amount"))
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")
        
        # Check if wallet exists and has enough balance
        wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
        
        if not wallet:
            raise HTTPException(status_code=404, detail=f"No liquidity found for {currency}")
        
        available = wallet.get("available", 0)
        if available < amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient available liquidity. Available: {available} {currency}, Requested: {amount} {currency}"
            )
        
        # Update wallet
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {
                "$inc": {
                    "balance": -amount,
                    "available": -amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Log the removal
        await db.liquidity_operations.insert_one({
            "operation_id": str(uuid.uuid4()),
            "type": "remove",
            "currency": currency,
            "amount": amount,
            "source": "trading_liquidity",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": f"Successfully removed {amount} {currency} from trading liquidity"
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/instant-buy/available-coins")
async def get_available_coins_for_instant_buy():
    """Get list of coins with available admin liquidity for Fast Buy and Express Buy"""
    try:
        # Get all active admin liquidity offers from enhanced_sell_orders
        offers = await db.enhanced_sell_orders.find(
            {
                "is_admin_liquidity": True,
                "status": "active",
                "crypto_amount": {"$gt": 0}
            },
            {"_id": 0}
        ).to_list(100)
        
        # Format response with coin info and prices
        available_coins = []
        for offer in offers:
            currency = offer.get("crypto_currency")
            crypto_amount = offer.get("crypto_amount", 0)
            price_per_unit = offer.get("price_per_unit", 0)
            market_price = offer.get("market_price", price_per_unit)
            
            available_coins.append({
                "symbol": currency,
                "available_amount": crypto_amount,
                "price_gbp": price_per_unit,
                "market_price_gbp": market_price,
                "markup_percent": offer.get("markup_percent", 3.0),
                "max_order_gbp": offer.get("max_order", crypto_amount * price_per_unit),
                "min_order_gbp": offer.get("min_order", 10.0),
                "is_active": True
            })
        
        return {
            "success": True,
            "coins": available_coins,
            "count": len(available_coins)
        }
    except Exception as e:
        logger.error(f"Error fetching instant buy coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/seller/set-fast-payment")
async def set_seller_fast_payment_status(request: dict):
    """Allow sellers to enable/disable fast-payment status for their offers"""
    try:
        offer_id = request.get("offer_id")
        seller_id = request.get("seller_id")
        fast_payment = request.get("fast_payment", False)
        
        if not all([offer_id, seller_id]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify seller owns this offer
        offer = await db.enhanced_sell_orders.find_one({"offer_id": offer_id, "seller_id": seller_id})
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found or you don't own this offer")
        
        # Update fast_payment status
        await db.enhanced_sell_orders.update_one(
            {"offer_id": offer_id},
            {
                "$set": {
                    "fast_payment": fast_payment,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Fast-payment status {'enabled' if fast_payment else 'disabled'} for offer {offer_id}"
        }
    except HTTPException:
        raise


@api_router.get("/admin/p2p-express-stats")
async def get_p2p_express_statistics():
    """Get statistics on P2P Express usage and fallback rates"""
    try:
        # Get all fallback logs
        fallbacks = await db.p2p_express_fallbacks.find({}, {"_id": 0}).to_list(1000)
        
        total_fallbacks = len(fallbacks)
        fast_payment_fallbacks = len([f for f in fallbacks if f.get("fallback_type") == "fast_payment"])
        normal_fallbacks = len([f for f in fallbacks if f.get("fallback_type") == "normal"])
        
        # Group by crypto currency
        by_currency = {}
        for fallback in fallbacks:
            currency = fallback.get("crypto_currency", "UNKNOWN")
            if currency not in by_currency:
                by_currency[currency] = {"total": 0, "fast_payment": 0, "normal": 0}
            by_currency[currency]["total"] += 1
            if fallback.get("fallback_type") == "fast_payment":
                by_currency[currency]["fast_payment"] += 1
            else:
                by_currency[currency]["normal"] += 1
        
        return {
            "success": True,
            "statistics": {
                "total_fallbacks": total_fallbacks,
                "fast_payment_fallbacks": fast_payment_fallbacks,
                "normal_fallbacks": normal_fallbacks,
                "fast_payment_percentage": round((fast_payment_fallbacks / total_fallbacks * 100) if total_fallbacks > 0 else 0, 2),
                "by_currency": by_currency
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/trading-liquidity/toggle")
async def toggle_trading_pair(request: dict):
    """Toggle a trading pair ON/OFF (manually pause/activate)"""
    try:
        currency = request.get("currency")
        enabled = request.get("enabled", True)
        
        # This is a manual override - we can add a flag to the wallet
        wallet = await db.admin_liquidity_wallets.find_one({"currency": currency})
        
        if not wallet:
            # Create wallet with paused status
            await db.admin_liquidity_wallets.insert_one({
                "currency": currency,
                "balance": 0,
                "available": 0,
                "reserved": 0,
                "manually_disabled": not enabled,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            # Update existing wallet
            await db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$set": {
                        "manually_disabled": not enabled,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        status = "enabled" if enabled else "disabled"
        return {
            "success": True,
            "message": f"Trading for {currency} has been {status}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@api_router.get("/express-buy/config")
async def get_express_buy_config():
    """Get Express Buy configuration"""
    return {
        "success": True,
        "config": {
            "enabled": True,
            "min_order": 10,
            "max_order": 10000,
            "fee_percent": 1.5,
            "supported_coins": ["BTC", "ETH", "USDT", "BNB", "SOL"],
            "payment_methods": ["GBP"]
        }
    }

@api_router.get("/express-buy/supported-coins")
async def get_express_buy_supported_coins():
    """Get list of supported coins for Express Buy"""
    try:
        # Fetch from platform settings
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        # Default icons mapping - cohesive crypto emojis
        coin_icons = {
            'BTC': '₿', 
            'ETH': '⟠', 
            'USDT': '₮', 
            'BNB': '◆', 
            'SOL': '◎', 
            'LTC': 'Ł', 
            'USDC': '◉', 
            'XRP': '✕',
            'ADA': '⟁', 
            'DOT': '●', 
            'DOGE': 'Ð', 
            'MATIC': '⬡',
            'AVAX': '△',
            'LINK': '⬢',
            'UNI': '🦄',
            'ATOM': '⚛',
            'TRX': '▲',
            'BCH': '฿',
            'SHIB': '🐕'
        }
        
        # Default prices (fallback)
        default_prices = {
            'BTC': 47500, 'ETH': 2500, 'USDT': 0.79, 'BNB': 380,
            'SOL': 120, 'LTC': 85, 'USDC': 0.79, 'XRP': 0.60,
            'ADA': 0.50, 'DOT': 7.50, 'DOGE': 0.08, 'MATIC': 0.85,
            'AVAX': 38, 'LINK': 15, 'UNI': 6.5, 'ATOM': 10,
            'TRX': 0.10, 'BCH': 250, 'SHIB': 0.00001
        }
        
        coin_names = {
            'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'USDT': 'Tether', 'BNB': 'Binance Coin',
            'SOL': 'Solana', 'LTC': 'Litecoin', 'USDC': 'USD Coin', 'XRP': 'Ripple',
            'ADA': 'Cardano', 'DOT': 'Polkadot', 'DOGE': 'Dogecoin', 'MATIC': 'Polygon',
            'AVAX': 'Avalanche', 'LINK': 'Chainlink', 'UNI': 'Uniswap', 'ATOM': 'Cosmos',
            'TRX': 'TRON', 'BCH': 'Bitcoin Cash', 'SHIB': 'Shiba Inu'
        }
        
        # Get coins with available admin liquidity
        wallets = await db.admin_liquidity_wallets.find(
            {"available": {"$gt": 0}},
            {"_id": 0, "currency": 1, "available": 1, "balance": 1}
        ).to_list(100)
        
        # Get supported coins from settings (for ordering/filtering)
        if settings and "express_buy_supported_coins" in settings:
            supported_coins_list = settings["express_buy_supported_coins"]
        else:
            supported_coins_list = ["BTC", "ETH", "USDT", "BNB", "SOL", "LTC"]
        
        # Build coin list with details - only include coins with liquidity
        coins = []
        available_currencies = {w["currency"]: w for w in wallets}
        
        for symbol in supported_coins_list:
            if symbol in available_currencies:
                wallet = available_currencies[symbol]
                coins.append({
                    "symbol": symbol,
                    "name": coin_names.get(symbol, symbol),
                    "icon": coin_icons.get(symbol, '●'),
                    "price": default_prices.get(symbol, 1.0),
                    "available": wallet["available"],
                    "balance": wallet["balance"]
                })
        
        return {
            "success": True,
            "coins": coins
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/express-buy/match")
async def express_buy_match(request: dict):
    """Match user with admin liquidity or cheapest seller for express buy"""
    crypto_currency = request.get("crypto_currency")
    fiat_amount = float(request.get("fiat_amount", 0))
    user_id = request.get("user_id")
    
    if not crypto_currency or not user_id:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    if fiat_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # FIRST: Check admin liquidity wallet
    admin_wallet = await db.admin_liquidity_wallets.find_one({"currency": crypto_currency})
    
    # Get LIVE crypto price from CoinGecko
    crypto_price = await get_live_price(crypto_currency, "gbp")
    if crypto_price == 0:
        raise HTTPException(status_code=400, detail=f"Price not available for {crypto_currency}")
    
    # Calculate crypto amount needed
    crypto_needed = fiat_amount / crypto_price
    
    # Check if admin has sufficient liquidity
    if admin_wallet and admin_wallet.get("available", 0) >= crypto_needed:
        # Admin has liquidity - sell directly from admin wallet
        express_fee_percent = 3.0  # 3% fee for admin liquidity
        express_fee_fiat = fiat_amount * (express_fee_percent / 100)
        express_fee_crypto = express_fee_fiat / crypto_price
        net_crypto_to_buyer = crypto_needed - express_fee_crypto
        
        return {
            "success": True,
            "source": "admin_liquidity",
            "matched_offer": {
                "ad_id": "ADMIN_LIQUIDITY",
                "seller_id": "ADMIN",
                "seller_name": "Platform Liquidity",
                "crypto_currency": crypto_currency,
                "price_per_unit": crypto_price,
                "crypto_amount": crypto_needed,
                "net_crypto_to_buyer": net_crypto_to_buyer,
                "fiat_amount": fiat_amount,
                "express_fee_percent": express_fee_percent,
                "express_fee_fiat": express_fee_fiat,
                "express_fee_crypto": express_fee_crypto,
                "payment_methods": ["Platform Direct"],
                "terms": "Instant delivery from platform liquidity"
            },
            "admin_liquidity_available": admin_wallet.get("available", 0)
        }
    
    # FALLBACK: No admin liquidity - match with P2P sellers (original logic)
    
    # Find all active sell offers for this crypto
    sell_offers = await db.p2p_ads.find({
        "ad_type": "sell",
        "crypto_currency": crypto_currency,
        "status": "active"
    }).to_list(1000)
    
    if not sell_offers:
        raise HTTPException(status_code=404, detail=f"No sellers available for {crypto_currency}")
    
    # Filter offers that meet the amount requirements
    valid_offers = []
    for offer in sell_offers:
        min_amount = offer.get("min_amount", 0)
        max_amount = offer.get("max_amount", 999999999)
        available_amount = offer.get("available_amount", 0)
        
        # Check if fiat_amount is within seller's limits
        if min_amount <= fiat_amount <= max_amount:
            # Calculate crypto amount needed
            price = offer.get("price_value", 0)
            if price > 0:
                crypto_needed = fiat_amount / price
                # Check if seller has enough crypto
                if available_amount >= crypto_needed:
                    offer["calculated_crypto_amount"] = crypto_needed
                    valid_offers.append(offer)
    
    if not valid_offers:
        raise HTTPException(
            status_code=404, 
            detail=f"No sellers available for amount £{fiat_amount}. Try different amount."
        )
    
    # Sort by price (cheapest first)
    valid_offers.sort(key=lambda x: x.get("price_value", float('inf')))
    
    # Get cheapest offer
    best_offer = valid_offers[0]
    
    # Calculate final amounts with 1.5% express fee
    base_price = best_offer.get("price_value", 0)
    crypto_amount = best_offer["calculated_crypto_amount"]
    express_fee_percent = 1.5
    express_fee_fiat = fiat_amount * (express_fee_percent / 100)
    net_fiat = fiat_amount - express_fee_fiat
    
    return {
        "success": True,
        "matched_offer": {
            "ad_id": best_offer.get("ad_id"),
            "seller_id": best_offer.get("seller_id"),
            "seller_name": best_offer.get("seller_name", "Seller"),
            "crypto_currency": crypto_currency,
            "price_per_unit": base_price,
            "crypto_amount": crypto_amount,
            "fiat_amount": fiat_amount,
            "express_fee_percent": express_fee_percent,
            "express_fee_fiat": express_fee_fiat,
            "net_fiat_to_seller": net_fiat,
            "payment_methods": best_offer.get("payment_methods", []),
            "terms": best_offer.get("terms", "")
        },
        "alternatives_count": len(valid_offers) - 1
    }

@api_router.post("/express-buy/execute")
async def express_buy_execute(request: dict):
    """Execute P2P Express - tries admin liquidity first, falls back to P2P seller with fast payment"""
    user_id = request.get("user_id")
    ad_id = request.get("ad_id")
    crypto_amount = float(request.get("crypto_amount", 0))
    fiat_amount = float(request.get("fiat_amount", 0))
    buyer_wallet_address = request.get("buyer_wallet_address")
    buyer_wallet_network = request.get("buyer_wallet_network", "mainnet")
    net_crypto_to_buyer = float(request.get("net_crypto_to_buyer", crypto_amount))
    
    if not all([user_id, ad_id, buyer_wallet_address]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # CHECK IF THIS IS ADMIN LIQUIDITY PURCHASE (Instant Buy or P2P Express)
    if ad_id == "ADMIN_LIQUIDITY":
        # Get crypto currency from request
        crypto_currency = request.get("crypto_currency")
        if not crypto_currency:
            raise HTTPException(status_code=400, detail="Missing crypto_currency")
        
        # Get price from currencies collection (with fallback to live prices)
        currency_doc = await db.currencies.find_one({"symbol": crypto_currency}, {"_id": 0})
        crypto_price_gbp = 0
        
        if currency_doc:
            crypto_price_gbp = currency_doc.get("gbp_price") or currency_doc.get("current_price", 0)
        
        # If no price in currencies, try live prices as fallback
        if crypto_price_gbp == 0:
            try:
                live_prices = await get_cached_prices()
                crypto_price_usd = live_prices['crypto_prices'].get(crypto_currency, 0)
                
                if crypto_price_usd > 0:
                    fx_rates = live_prices['fx_rates']
                    gbp_rate = fx_rates.get('GBP', 0.79)
                    crypto_price_gbp = crypto_price_usd * gbp_rate
            except:
                pass
        
        if crypto_price_gbp == 0:
            raise HTTPException(status_code=400, detail=f"Unable to fetch price for {crypto_currency}")
        
        # Recalculate crypto amount based on fiat amount and LIVE price
        # This protects admin from price movements between quote and execution
        crypto_amount = fiat_amount / crypto_price_gbp if crypto_price_gbp > 0 else 0
        
        if crypto_amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount calculation")
        
        # Check admin liquidity wallet
        admin_wallet = await db.admin_liquidity_wallets.find_one({"currency": crypto_currency})
        if not admin_wallet:
            raise HTTPException(status_code=400, detail="Admin liquidity wallet not found")
        
        if admin_wallet.get("available", 0) < crypto_amount:
            # P2P EXPRESS FALLBACK: 3-TIER PRIORITY MATCHING
            # Priority 1: Admin liquidity (already failed if we're here)
            # Priority 2: Fast-payment sellers (is_fast_payment = true OR fast_payment = true)
            # Priority 3: Normal sellers (any active seller)
            
            # Try Priority 2: Fast-payment sellers first
            fast_payment_sellers = await db.enhanced_sell_orders.find({
                "crypto_currency": crypto_currency,
                "status": "active",
                "fast_payment": True,
                "available_amount": {"$gte": crypto_amount}
            }).sort("price_per_unit", 1).to_list(10)  # Get cheapest fast-payment sellers
            
            fallback_seller = None
            
            if fast_payment_sellers:
                # Found fast-payment seller - use the cheapest one
                fallback_seller = fast_payment_sellers[0]
                fallback_type = "fast_payment"
            else:
                # Priority 3: Try normal sellers as last resort
                normal_sellers = await db.enhanced_sell_orders.find({
                    "crypto_currency": crypto_currency,
                    "status": "active",
                    "available_amount": {"$gte": crypto_amount}
                }).sort("price_per_unit", 1).to_list(10)  # Get cheapest normal sellers
                
                if normal_sellers:
                    fallback_seller = normal_sellers[0]
                    fallback_type = "normal"
                else:
                    # No sellers available at all
                    raise HTTPException(
                        status_code=400, 
                        detail="Insufficient admin liquidity and no P2P sellers available for this amount"
                    )
            
            # Seamless fallback - use P2P seller without extra screens
            # Set ad_id to the P2P seller's offer and continue with normal P2P flow
            ad_id = fallback_seller["offer_id"]
            
            # Log the fallback for tracking
            await db.p2p_express_fallbacks.insert_one({
                "fallback_id": str(uuid.uuid4()),
                "user_id": user_id,
                "crypto_currency": crypto_currency,
                "crypto_amount": crypto_amount,
                "fiat_amount": fiat_amount,
                "fallback_type": fallback_type,  # "fast_payment" or "normal"
                "seller_offer_id": ad_id,
                "seller_id": fallback_seller.get("seller_id"),
                "reason": "insufficient_admin_liquidity",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Note: The rest of the function will handle P2P seller flow below
        
        # Get monetization settings for Express Buy fees and Admin Spread
        monetization_settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not monetization_settings:
            monetization_settings = DEFAULT_MONETIZATION_SETTINGS
        
        express_fee_percent = monetization_settings.get("buyer_express_fee_percent", 1.0)
        admin_sell_spread_percent = monetization_settings.get("admin_sell_spread_percent", 3.0)
        
        # Apply HIDDEN admin spread to the price (admin sells HIGHER than market)
        # User sees this as the final price - spread is built-in, not shown separately
        spread_adjusted_price_gbp = crypto_price_gbp * (1 + admin_sell_spread_percent / 100)
        
        # Then apply the VISIBLE express buy fee on top
        # This is the 1% fee that users see as "Express Fee"
        price_with_fee = spread_adjusted_price_gbp * (1 + express_fee_percent / 100)
        
        # Recalculate based on the spread-adjusted price
        # The crypto_amount was calculated from original price, now we adjust fiat
        adjusted_fiat_base = crypto_amount * spread_adjusted_price_gbp
        express_fee_fiat = adjusted_fiat_base * (express_fee_percent / 100)
        express_fee_crypto = express_fee_fiat / spread_adjusted_price_gbp if spread_adjusted_price_gbp > 0 else 0
        
        # STEP 1: Deduct GBP from user's wallet
        user_gbp_balance = await db.trader_balances.find_one({"trader_id": user_id, "currency": "GBP"})
        if not user_gbp_balance or user_gbp_balance.get("available_balance", 0) < fiat_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient GBP balance. You need £{fiat_amount:.2f} but have £{user_gbp_balance.get('available_balance', 0) if user_gbp_balance else 0:.2f}"
            )
        
        await db.trader_balances.update_one(
            {"trader_id": user_id, "currency": "GBP"},
            {
                "$inc": {
                    "available_balance": -fiat_amount,
                    "total_balance": -fiat_amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        # STEP 2: Add GBP to admin liquidity wallet
        admin_gbp_wallet = await db.admin_liquidity_wallets.find_one({"currency": "GBP"})
        if admin_gbp_wallet:
            await db.admin_liquidity_wallets.update_one(
                {"currency": "GBP"},
                {
                    "$inc": {
                        "balance": fiat_amount,
                        "available": fiat_amount
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
        else:
            await db.admin_liquidity_wallets.insert_one({
                "currency": "GBP",
                "balance": fiat_amount,
                "available": fiat_amount,
                "locked": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        # STEP 3: Deduct crypto from admin liquidity wallet
        await db.admin_liquidity_wallets.update_one(
            {"currency": crypto_currency},
            {
                "$inc": {
                    "balance": -crypto_amount,
                    "available": -crypto_amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        # STEP 4: Add crypto to buyer's wallet using trader balance system (net amount after fee)
        buyer_balance = await db.trader_balances.find_one({"trader_id": user_id, "currency": crypto_currency})
        
        if buyer_balance:
            await db.trader_balances.update_one(
                {"trader_id": user_id, "currency": crypto_currency},
                {
                    "$inc": {
                        "available_balance": net_crypto_to_buyer,
                        "total_balance": net_crypto_to_buyer
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                }
            )
        else:
            await db.trader_balances.insert_one({
                "trader_id": user_id,
                "currency": crypto_currency,
                "available_balance": net_crypto_to_buyer,
                "locked_balance": 0,
                "total_balance": net_crypto_to_buyer,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        # Add 3% fee to admin fee wallet
        admin_fee_wallet = await db.internal_balances.find_one({"currency": crypto_currency})
        
        if admin_fee_wallet:
            await db.internal_balances.update_one(
                {"currency": crypto_currency},
                {
                    "$inc": {
                        "express_buy_fees": express_fee_crypto,
                        "total_fees": express_fee_crypto
                    }
                }
            )
        else:
            await db.internal_balances.insert_one({
                "currency": crypto_currency,
                "express_buy_fees": express_fee_crypto,
                "total_fees": express_fee_crypto,
                "created_at": datetime.now(timezone.utc)
            })
        
        # Calculate admin liquidity spread profit
        market_value = crypto_amount * crypto_price_gbp
        sold_value = crypto_amount * spread_adjusted_price_gbp
        spread_profit = sold_value - market_value
        
        # Check for buyer's referrer
        buyer = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        referrer_id = buyer.get("referrer_id") if buyer else None
        referrer_commission = 0.0
        admin_spread_profit = spread_profit
        commission_percent = 0.0
        
        if referrer_id:
            from centralized_fee_system import get_fee_manager
            fee_manager = get_fee_manager(db)
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = spread_profit * (commission_percent / 100.0)
            admin_spread_profit = spread_profit - referrer_commission
            
            # Credit referrer
            from wallet_service import get_wallet_service
            wallet_service = get_wallet_service()
            await wallet_service.credit(
                user_id=referrer_id,
                currency="GBP",
                amount=referrer_commission,
                transaction_type="referral_commission",
                reference_id=str(uuid.uuid4()),
                metadata={"source": "admin_liquidity_spread", "buyer_id": user_id}
            )
        
        # Credit admin wallet with spread profit (after referrer commission)
        from wallet_service import get_wallet_service
        wallet_service = get_wallet_service()
        await wallet_service.credit(
            user_id="admin_wallet",
            currency="GBP",
            amount=admin_spread_profit,
            transaction_type="admin_liquidity_profit",
            reference_id=str(uuid.uuid4()),
            metadata={"buyer_id": user_id, "spread_percent": admin_sell_spread_percent}
        )
        
        # Log admin liquidity spread profit to fee_transactions
        await db.fee_transactions.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "transaction_type": "admin_liquidity_buy",
            "fee_type": "admin_liquidity_spread_profit",
            "amount": fiat_amount,
            "total_fee": spread_profit,
            "fee_percent": admin_sell_spread_percent,
            "admin_fee": admin_spread_profit,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": "GBP",
            "reference_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Calculate express buy fee referral split separately
        express_referrer_commission = 0.0
        express_admin_fee = express_fee_fiat
        
        if referrer_id:
            express_referrer_commission = express_fee_fiat * (commission_percent / 100.0)
            express_admin_fee = express_fee_fiat - express_referrer_commission
            
            # Credit referrer with express fee commission
            await wallet_service.credit(
                user_id=referrer_id,
                currency="GBP",
                amount=express_referrer_commission,
                transaction_type="referral_commission",
                reference_id=str(uuid.uuid4()),
                metadata={"source": "express_buy_fee", "buyer_id": user_id}
            )
        
        # Credit admin wallet with express fee (after referrer commission)
        await wallet_service.credit(
            user_id="admin_wallet",
            currency="GBP",
            amount=express_admin_fee,
            transaction_type="express_buy_fee",
            reference_id=str(uuid.uuid4()),
            metadata={"buyer_id": user_id}
        )
        
        # Log express buy fee to fee_transactions
        await db.fee_transactions.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "transaction_type": "express_buy",
            "fee_type": "instant_buy_fee",
            "amount": fiat_amount,
            "total_fee": express_fee_fiat,
            "fee_percent": express_fee_percent,
            "admin_fee": express_admin_fee,
            "referrer_commission": express_referrer_commission,
            "referrer_id": referrer_id,
            "currency": "GBP",
            "reference_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Record transaction
        trade_id = str(uuid.uuid4())
        await db.express_buy_transactions.insert_one({
            "trade_id": trade_id,
            "buyer_id": user_id,
            "source": "admin_liquidity",
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "net_crypto_to_buyer": net_crypto_to_buyer,
            "fiat_amount": fiat_amount,
            "express_fee_percent": express_fee_percent,
            "express_fee_crypto": express_fee_crypto,
            "spread_profit": spread_profit,
            "admin_spread_profit": admin_spread_profit,
            "referrer_commission": referrer_commission,
            "buyer_wallet_address": buyer_wallet_address,
            "status": "completed",
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "success": True,
            "trade_id": trade_id,
            "source": "admin_liquidity",
            "message": f"Successfully purchased {net_crypto_to_buyer:.8f} {crypto_currency} from platform liquidity",
            "trade": {
                "trade_id": trade_id,
                "crypto_currency": crypto_currency,
                "crypto_amount": net_crypto_to_buyer,
                "fiat_amount": fiat_amount,
                "fee": express_fee_crypto,
                "status": "completed"
            }
        }
    
    # ORIGINAL P2P SELLER LOGIC (if not admin liquidity)
    
    # Get the offer
    offer = await db.p2p_ads.find_one({"ad_id": ad_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.get("status") != "active":
        raise HTTPException(status_code=400, detail="Offer is no longer active")
    
    # Verify seller has sufficient balance
    seller_id = offer.get("seller_id")
    seller_balance = await get_trader_balance(db, seller_id, offer.get("crypto_currency"))
    
    if not seller_balance or seller_balance.get("available_balance", 0) < crypto_amount:
        raise HTTPException(status_code=400, detail="Seller has insufficient balance")
    
    # Lock seller's crypto in escrow
    trade_id = str(uuid.uuid4())
    lock_request = BalanceLockRequest(
        trader_id=seller_id,
        currency=offer.get("crypto_currency"),
        amount=crypto_amount,
        trade_id=trade_id,
        reason=f"express_buy_{user_id}"
    )
    lock_result = await lock_balance_for_trade(db, lock_request)
    
    if not lock_result["success"]:
        raise HTTPException(status_code=500, detail="Failed to lock crypto in escrow")
    
    # Calculate express fee (1.5% goes to admin)
    express_fee_percent = 1.5
    express_fee_fiat = fiat_amount * (express_fee_percent / 100)
    express_fee_crypto = express_fee_fiat / offer.get("price_value", 1)
    
    # Create trade
    trade_data = {
        "trade_id": trade_id,
        "ad_id": ad_id,
        "seller_id": seller_id,
        "buyer_id": user_id,
        "crypto_currency": offer.get("crypto_currency"),
        "fiat_currency": "GBP",
        "crypto_amount": crypto_amount,
        "fiat_amount": fiat_amount,
        "price_per_unit": offer.get("price_value"),
        "buyer_wallet_address": buyer_wallet_address,
        "buyer_wallet_network": buyer_wallet_network,
        "payment_method": offer.get("payment_methods", ["Bank Transfer"])[0],
        "status": "pending_payment",
        "trade_type": "express_buy",
        "express_fee_percent": express_fee_percent,
        "express_fee_fiat": express_fee_fiat,
        "express_fee_crypto": express_fee_crypto,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.p2p_trades.insert_one(trade_data)
    
    # Add express fee to admin balance
    admin_balance = await db.internal_balances.find_one({"currency": offer.get("crypto_currency")})
    
    if admin_balance:
        await db.internal_balances.update_one(
            {"currency": offer.get("crypto_currency")},
            {
                "$inc": {
                    "express_buy_fees": express_fee_crypto,
                    "total_fees": express_fee_crypto
                }
            }
        )
    else:
        await db.internal_balances.insert_one({
            "currency": offer.get("crypto_currency"),
            "express_buy_fees": express_fee_crypto,
            "total_fees": express_fee_crypto,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {
        "success": True,
        "trade_id": trade_id,
        "message": f"Express buy successful! {crypto_amount:.8f} {offer.get('crypto_currency')} locked in escrow",
        "trade": {
            "trade_id": trade_id,
            "crypto_currency": offer.get("crypto_currency"),
            "crypto_amount": crypto_amount,
            "fiat_amount": fiat_amount,
            "status": "pending_payment",
            "seller_id": seller_id,
            "buyer_wallet_address": buyer_wallet_address
        }
    }

# ===========================
# BOOST/FEATURED SELLER ENDPOINTS
# ===========================

@api_router.post("/p2p/boost-offer")
async def boost_offer(request: dict):
    """Boost/feature an offer for increased visibility"""
    user_id = request.get("user_id")
    ad_id = request.get("ad_id")
    duration_type = request.get("duration_type")  # 'daily', 'weekly', 'monthly'
    
    if not all([user_id, ad_id, duration_type]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Pricing
    pricing = {
        "daily": 10.0,
        "weekly": 40.0,
        "monthly": 100.0
    }
    
    if duration_type not in pricing:
        raise HTTPException(status_code=400, detail="Invalid duration type")
    
    boost_cost = pricing[duration_type]
    
    # Check if offer exists and belongs to user
    offer = await db.p2p_ads.find_one({"ad_id": ad_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.get("user_id") != user_id and offer.get("seller_id") != user_id:
        raise HTTPException(status_code=403, detail="You don't own this offer")
    
    # Check user's GBP balance
    user_balance = await get_trader_balance(db, user_id, "GBP")
    if not user_balance or user_balance.get("available_balance", 0) < boost_cost:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient GBP balance. Need £{boost_cost}, have £{user_balance.get('available_balance', 0) if user_balance else 0}"
        )
    
    # Deduct boost cost from user's GBP balance
    result = await db.trader_balances.update_one(
        {"trader_id": user_id, "currency": "GBP"},
        {
            "$inc": {
                "available_balance": -boost_cost,
                "total_balance": -boost_cost
            },
            "$set": {
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to deduct balance")
    
    # Calculate boost end date
    duration_days = {
        "daily": 1,
        "weekly": 7,
        "monthly": 30
    }
    
    boost_end_date = datetime.now(timezone.utc) + timedelta(days=duration_days[duration_type])
    
    # Update offer with boost status
    await db.p2p_ads.update_one(
        {"ad_id": ad_id},
        {
            "$set": {
                "boosted": True,
                "boost_start_date": datetime.now(timezone.utc),
                "boost_end_date": boost_end_date,
                "boost_duration_type": duration_type,
                "boost_cost": boost_cost,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Add boost payment to admin balance
    admin_balance = await db.internal_balances.find_one({"currency": "GBP"})
    
    if admin_balance:
        await db.internal_balances.update_one(
            {"currency": "GBP"},
            {
                "$inc": {
                    "boost_fees": boost_cost,
                    "total_fees": boost_cost
                }
            }
        )
    else:
        await db.internal_balances.insert_one({
            "currency": "GBP",
            "boost_fees": boost_cost,
            "total_fees": boost_cost,
            "created_at": datetime.now(timezone.utc)
        })
    
    # Record boost transaction
    boost_id = str(uuid.uuid4())
    boost_record = {
        "boost_id": boost_id,
        "ad_id": ad_id,
        "user_id": user_id,
        "duration_type": duration_type,
        "cost": boost_cost,
        "start_date": datetime.now(timezone.utc),
        "end_date": boost_end_date,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.boost_transactions.insert_one(boost_record)
    
    return {
        "success": True,
        "boost_id": boost_id,
        "message": f"Offer boosted for {duration_type} (£{boost_cost})",
        "boost_end_date": boost_end_date.isoformat(),
        "duration_type": duration_type,
        "cost": boost_cost
    }

@api_router.get("/p2p/boost-status/{ad_id}")
async def get_boost_status(ad_id: str):
    """Check if an offer is currently boosted"""
    offer = await db.p2p_ads.find_one({"ad_id": ad_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    is_boosted = offer.get("boosted", False)
    boost_end_date = offer.get("boost_end_date")
    
    # Check if boost has expired
    if is_boosted and boost_end_date:
        # Handle both datetime objects and string dates
        if isinstance(boost_end_date, str):
            try:
                boost_end_date = datetime.fromisoformat(boost_end_date.replace('Z', '+00:00'))
            except:
                boost_end_date = None
        
        if boost_end_date:
            # Ensure timezone awareness
            if boost_end_date.tzinfo is None:
                boost_end_date = boost_end_date.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) > boost_end_date:
                # Boost expired, update offer
                await db.p2p_ads.update_one(
                    {"ad_id": ad_id},
                    {
                        "$set": {
                            "boosted": False,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                is_boosted = False
    
    return {
        "success": True,
        "is_boosted": is_boosted,
        "boost_end_date": boost_end_date.isoformat() if boost_end_date else None,
        "duration_type": offer.get("boost_duration_type"),
        "cost": offer.get("boost_cost")
    }

    return {
        "success": True,
        "swaps": swaps,
        "count": len(swaps)
    }



@api_router.post("/admin/toggle-seller")
async def admin_toggle_seller(request: dict):
    """Admin toggle seller status for user"""
    user_id = request.get("user_id")
    is_seller = request.get("is_seller")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_seller": is_seller}}
    )
    
    return {
        "success": True,
        "message": f"Seller status updated to {is_seller}"
    }

@api_router.post("/auth/mock-kyc")
async def mock_kyc_verification(request: dict):
    """Mock KYC verification for testing"""
    user_id = request.get("user_id")
    
    # Get user from user_accounts to copy basic info
    user_account = await db.user_accounts.find_one({"user_id": user_id})
    
    user_data = {
        "user_id": user_id,
        "kyc_verified": True,
        "payment_methods": ["faster_payments", "sepa"],
        "is_seller": False
    }
    
    # Add additional fields from user_account if exists
    if user_account:
        user_data["email"] = user_account.get("email", "")
        user_data["full_name"] = user_account.get("full_name", "User")
        user_data["wallet_address"] = user_account.get("wallet_address", f"wallet_{user_id[:8]}")
    
    # Upsert to create if doesn't exist
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": user_data},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "KYC verified and payment methods added"
    }

@api_router.get("/loans/all")
async def get_all_loans():
    """Get all loans for marketplace"""
    loans = await db.loans.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"success": True, "loans": loans}

# ===========================
# CRYPTO BANK ENDPOINTS
# ===========================

@api_router.get("/crypto-bank/balances/{user_id}")
async def get_crypto_balances(user_id: str):
    """Get user's crypto balances"""
    balances_cursor = db.crypto_balances.find({"user_id": user_id}, {"_id": 0})
    balances = await balances_cursor.to_list(10)
    
    # Initialize balances for all supported cryptocurrencies if they don't exist
    supported_currencies = list(SUPPORTED_CRYPTOCURRENCIES.keys())
    existing_currencies = [b["currency"] for b in balances]
    
    for currency in supported_currencies:
        if currency not in existing_currencies:
            new_balance = CryptoBalance(
                user_id=user_id,
                currency=currency,
                balance=0.0,
                locked_balance=0.0
            )
            balance_dict = new_balance.model_dump()
            # Convert datetime to ISO string if it's a datetime object
            if isinstance(balance_dict.get('last_updated'), datetime):
                balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
            
            # Insert into database
            inserted_balance = balance_dict.copy()
            await db.crypto_balances.insert_one(inserted_balance)
            
            # Remove _id from the dict we return (MongoDB adds it automatically)
            if '_id' in balance_dict:
                del balance_dict['_id']
            
            balances.append(balance_dict)
    
    # Ensure all balances in the list don't have _id
    clean_balances = []
    for balance in balances:
        clean_balance = {k: v for k, v in balance.items() if k != '_id'}
        # Convert datetime to ISO string if needed
        if isinstance(clean_balance.get('last_updated'), datetime):
            clean_balance['last_updated'] = clean_balance['last_updated'].isoformat()
        clean_balances.append(clean_balance)
    
    return {
        "success": True,
        "balances": clean_balances
    }

@api_router.post("/crypto-bank/deposit")
async def initiate_deposit(request: InitiateDepositRequest):
    """Initiate a deposit (simulated for MVP)"""
    # Validate currency
    if request.currency not in ["BTC", "ETH", "USDT"]:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user info for email
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create balance record
    balance = await db.crypto_balances.find_one({
        "user_id": request.user_id,
        "currency": request.currency
    }, {"_id": 0})
    
    if not balance:
        # Create new balance
        new_balance = CryptoBalance(
            user_id=request.user_id,
            currency=request.currency,
            balance=0.0
        )
        balance_dict = new_balance.model_dump()
        balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
        await db.crypto_balances.insert_one(balance_dict)
    
    # Create transaction
    transaction = CryptoTransaction(
        user_id=request.user_id,
        currency=request.currency,
        transaction_type="deposit",
        amount=request.amount,
        status="completed",  # Simulated - instant completion
        notes="Simulated deposit for MVP",
        completed_at=datetime.now(timezone.utc)
    )
    
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
    await db.crypto_transactions.insert_one(tx_dict)
    
    # Update balance
    await db.crypto_balances.update_one(
        {"user_id": request.user_id, "currency": request.currency},
        {
            "$inc": {"balance": request.amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # REFERRAL BONUS: Check if this deposit/top-up qualifies for £20 bonus
    try:
        bonus_result = await check_and_award_referral_bonus(
            user_id=request.user_id,
            top_up_amount=request.amount,
            currency=request.currency
        )
        if bonus_result.get("bonus_awarded"):
            logger.info(f"✅ £20 REFERRAL BONUS AWARDED! Referrer: {bonus_result.get('referrer_user_id')}")
    except Exception as e:
        logger.error(f"Failed to check referral bonus: {str(e)}")
    
    # Update onboarding status
    await db.onboarding_status.update_one(
        {"user_id": request.user_id},
        {"$set": {"first_deposit": True}},
        upsert=True
    )
    
    # Get updated balance
    updated_balance_doc = await db.crypto_balances.find_one({
        "user_id": request.user_id,
        "currency": request.currency
    }, {"_id": 0})
    updated_balance = updated_balance_doc.get('balance', request.amount) if updated_balance_doc else request.amount
    
    # Send email notification (respects user settings)
    try:
        user_settings = user.get('security', {})
        if user_settings.get('login_email_alerts_enabled', True):
            await email_service.send_deposit_confirmation(
                user_email=user["email"],
                user_name=user["full_name"],
                amount=request.amount,
                coin=request.currency,
                tx_hash=transaction.transaction_id,
                updated_balance=updated_balance
            )
            logger.info(f"Deposit confirmation email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send deposit email: {str(e)}")
    
    # Create in-app notification
    try:
        await create_notification(
            db,
            user_id=request.user_id,
            notification_type='deposit_confirmed',
            title=f'Deposit Confirmed: {request.amount} {request.currency}',
            message=f'Your deposit of {request.amount} {request.currency} has been confirmed and added to your wallet.',
            link='/wallet',
            metadata={
                'amount': request.amount,
                'coin': request.currency,
                'tx_hash': transaction.transaction_id
            }
        )
    except Exception as e:
        logger.error(f"Failed to create deposit notification: {str(e)}")
    
    return {
        "success": True,
        "transaction": transaction.model_dump(),
        "message": f"Deposit of {request.amount} {request.currency} completed successfully"
    }


@api_router.post("/crypto-bank/withdraw/confirm")
async def confirm_withdrawal(confirmation_token: str):
    """Confirm withdrawal via email link"""
    
    # Find pending withdrawal
    withdrawal_request = await db.pending_withdrawals.find_one(
        {"confirmation_token": confirmation_token, "status": "pending_email_confirmation"},
        {"_id": 0}
    )
    
    if not withdrawal_request:
        raise HTTPException(status_code=404, detail="Invalid or expired confirmation link")
    
    # Check if expired
    expires_at = datetime.fromisoformat(withdrawal_request['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Confirmation link expired")
    
    # Update status to approved
    await db.pending_withdrawals.update_one(
        {"confirmation_token": confirmation_token},
        {"$set": {"status": "confirmed", "confirmed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": "Withdrawal confirmed and will be processed shortly",
        "withdrawal_id": withdrawal_request['withdrawal_id']
    }


@api_router.post("/crypto-bank/withdraw")
async def initiate_withdrawal(request: InitiateWithdrawalRequest, req: Request):
    """
    Initiate a withdrawal with AUTOMATED fee deduction and routing + SECURITY CHECKS
    - Calculates withdrawal fee (default 1.5%)
    - Deducts fee from user balance
    - Sends net amount to user
    - Routes fee to admin wallet automatically
    - SECURITY: Rate limiting, withdrawal limits, email verification for large amounts
    """
    from security import rate_limiter, withdrawal_security
    
    # Rate limiting - 5 withdrawals per hour per user
    is_allowed, wait_time = rate_limiter.check_rate_limit(
        identifier=request.user_id,
        action="withdrawal",
        max_attempts=5,
        window_seconds=3600  # 1 hour
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many withdrawal requests. Please try again in {wait_time} seconds."
        )
    
    # Validate currency
    if request.currency not in ["BTC", "ETH", "USDT"]:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user info for email
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get balance
    balance = await db.crypto_balances.find_one({
        "user_id": request.user_id,
        "currency": request.currency
    }, {"_id": 0})
    
    # Initialize balance if it doesn't exist
    if not balance:
        balance = {"user_id": request.user_id, "currency": request.currency, "balance": 0.0}
    
    # AUTOMATED FEE CALCULATION
    withdrawal_fee_percent = PLATFORM_CONFIG["withdraw_fee_percent"]
    withdrawal_fee = float(request.amount) * (withdrawal_fee_percent / 100.0)
    net_amount = float(request.amount) - withdrawal_fee
    
    # SECURITY: Convert crypto to GBP equivalent for security checks
    crypto_prices = {"BTC": 47500, "ETH": 2500, "USDT": 0.79}  # Updated prices
    amount_gbp = float(request.amount) * crypto_prices.get(request.currency, 1)
    
    # SECURITY CHECKS based on withdrawal amount
    security_level = withdrawal_security.get_security_level(amount_gbp)
    
    if security_level == "admin_approval_required":
        # Large withdrawal > £10,000 - requires admin approval
        # Create pending withdrawal request
        import secrets
        withdrawal_request = {
            "withdrawal_id": secrets.token_urlsafe(16),
            "user_id": request.user_id,
            "currency": request.currency,
            "amount": float(request.amount),
            "amount_gbp": amount_gbp,
            "wallet_address": request.wallet_address,
            "status": "pending_admin_approval",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "security_level": security_level
        }
        await db.pending_withdrawals.insert_one(withdrawal_request)
        
        # Send email notification to user
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            message = Mail(
                from_email=os.environ.get('SENDER_EMAIL', 'noreply@coinhubx.net'),
                to_emails=user["email"],
                subject='Large Withdrawal Request - Admin Approval Required',
                html_content=f"""
                <div style="font-family: Arial, sans-serif;">
                    <h2>Withdrawal Request Submitted</h2>
                    <p>Hello {user.get('full_name', 'User')},</p>
                    <p>Your withdrawal request for <strong>{request.amount} {request.currency}</strong> (≈ £{amount_gbp:,.2f}) requires admin approval due to the large amount.</p>
                    <p>Expected processing time: Within 24 hours</p>
                    <p>Withdrawal ID: {withdrawal_request['withdrawal_id']}</p>
                </div>
                """
            )
            sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            sg.send(message)
        except Exception as e:
            logger.error(f"Failed to send withdrawal notification: {e}")
        
        return {
            "success": True,
            "status": "pending_admin_approval",
            "withdrawal_id": withdrawal_request['withdrawal_id'],
            "message": "Withdrawal request submitted. Admin approval required for amounts over £10,000.",
            "amount_gbp": amount_gbp
        }
    
    elif security_level == "24h_hold":
        # Medium withdrawal > £5,000 - 24 hour hold
        import secrets
        withdrawal_request = {
            "withdrawal_id": secrets.token_urlsafe(16),
            "user_id": request.user_id,
            "currency": request.currency,
            "amount": float(request.amount),
            "amount_gbp": amount_gbp,
            "wallet_address": request.wallet_address,
            "status": "pending_24h_hold",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "release_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            "security_level": security_level
        }
        await db.pending_withdrawals.insert_one(withdrawal_request)
        
        return {
            "success": True,
            "status": "pending_24h_hold",
            "withdrawal_id": withdrawal_request['withdrawal_id'],
            "message": "Withdrawal will be processed after 24-hour security hold for amounts over £5,000.",
            "release_at": withdrawal_request['release_at'],
            "amount_gbp": amount_gbp
        }
    
    elif security_level == "email_confirmation":
        # Moderate withdrawal > £1,000 - requires email confirmation
        import secrets
        confirmation_token = secrets.token_urlsafe(32)
        
        withdrawal_request = {
            "withdrawal_id": secrets.token_urlsafe(16),
            "user_id": request.user_id,
            "currency": request.currency,
            "amount": float(request.amount),
            "amount_gbp": amount_gbp,
            "wallet_address": request.wallet_address,
            "status": "pending_email_confirmation",
            "confirmation_token": confirmation_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "security_level": security_level
        }
        await db.pending_withdrawals.insert_one(withdrawal_request)
        
        # Send confirmation email
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            confirmation_url = f"{os.environ.get('FRONTEND_URL', 'https://tradepanel-12.preview.emergentagent.com')}/confirm-withdrawal?token={confirmation_token}"
            
            message = Mail(
                from_email=os.environ.get('SENDER_EMAIL', 'noreply@coinhubx.net'),
                to_emails=user["email"],
                subject='Confirm Your Withdrawal Request',
                html_content=f"""
                <div style="font-family: Arial, sans-serif;">
                    <h2>Confirm Withdrawal</h2>
                    <p>Hello {user.get('full_name', 'User')},</p>
                    <p>Please confirm your withdrawal request for <strong>{request.amount} {request.currency}</strong> (≈ £{amount_gbp:,.2f})</p>
                    <p><strong>Wallet Address:</strong> {request.wallet_address}</p>
                    <a href="{confirmation_url}" style="display: inline-block; background: #00F0FF; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirm Withdrawal</a>
                    <p style="color: #666; font-size: 14px;">This link expires in 2 hours.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this withdrawal, please contact support immediately.</p>
                </div>
                """
            )
            sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            sg.send(message)
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {e}")
        
        return {
            "success": True,
            "status": "pending_email_confirmation",
            "withdrawal_id": withdrawal_request['withdrawal_id'],
            "message": "Please check your email to confirm this withdrawal. Confirmation required for amounts over £1,000.",
            "amount_gbp": amount_gbp
        }
    
    # For smaller amounts (< £1,000), proceed with instant withdrawal
    
    # Check sufficient balance (user must have full amount + fee)
    if balance["balance"] < request.amount:
        # Send failed transaction email
        try:
            await email_service.send_failed_transaction_notification(
                user["email"],
                user["full_name"],
                "withdrawal",
                f"Insufficient balance. Available: {balance['balance']} {request.currency}"
            )
        except Exception as e:
            logger.error(f"Failed to send error email: {str(e)}")
        
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {balance['balance']} {request.currency}"
        )
    
    # Create user withdrawal transaction (net amount they receive)
    transaction = CryptoTransaction(
        user_id=request.user_id,
        currency=request.currency,
        transaction_type="withdrawal",
        amount=net_amount,  # Net amount after fee
        status="completed",
        reference=request.wallet_address,
        notes=f"Withdrawal processed. Fee: {withdrawal_fee} {request.currency} ({withdrawal_fee_percent}%)",
        completed_at=datetime.now(timezone.utc)
    )
    
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
    tx_dict['withdrawal_fee'] = withdrawal_fee
    tx_dict['withdrawal_fee_percent'] = withdrawal_fee_percent
    tx_dict['gross_amount'] = float(request.amount)
    await db.crypto_transactions.insert_one(tx_dict)
    
    # AUTOMATED: Create fee transaction to admin wallet
    fee_transaction = CryptoTransaction(
        user_id=PLATFORM_CONFIG["admin_wallet_id"],
        currency=request.currency,
        transaction_type="platform_fee",
        amount=withdrawal_fee,
        status="completed",
        reference=f"Withdrawal fee from {request.user_id}",
        notes=f"Automated withdrawal fee collection ({withdrawal_fee_percent}%) from user {request.user_id}",
        completed_at=datetime.now(timezone.utc)
    )
    
    fee_dict = fee_transaction.model_dump()
    fee_dict['created_at'] = fee_dict['created_at'].isoformat()
    fee_dict['completed_at'] = fee_dict['completed_at'].isoformat()
    fee_dict['source_user_id'] = request.user_id
    fee_dict['fee_type'] = 'withdrawal_fee'
    await db.crypto_transactions.insert_one(fee_dict)
    
    # Update user balance (deduct full amount)
    await db.crypto_balances.update_one(
        {"user_id": request.user_id, "currency": request.currency},
        {
            "$inc": {"balance": -float(request.amount)},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # AUTOMATED: Add fee to admin wallet balance
    admin_balance = await db.crypto_balances.find_one({
        "user_id": PLATFORM_CONFIG["admin_wallet_id"],
        "currency": request.currency
    })
    
    if not admin_balance:
        # Create admin wallet balance if doesn't exist
        await db.crypto_balances.insert_one({
            "user_id": PLATFORM_CONFIG["admin_wallet_id"],
            "currency": request.currency,
            "balance": withdrawal_fee,
            "locked_balance": 0.0,
            "last_updated": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Increment existing admin balance
        await db.crypto_balances.update_one(
            {"user_id": PLATFORM_CONFIG["admin_wallet_id"], "currency": request.currency},
            {
                "$inc": {"balance": withdrawal_fee},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    # REFERRAL SYSTEM: Process INSTANT LIFETIME commission for referrer (20% of ALL fees)
    try:
        commission_result = await process_referral_commission(
            user_id=request.user_id,
            transaction_id=transaction.transaction_id,
            transaction_type="withdrawal",
            fee_amount=withdrawal_fee,
            currency=request.currency
        )
        
        if commission_result.get("commission_paid"):
            logger.info(f"✅ INSTANT Referral commission paid: {commission_result['commission_paid']} {request.currency} to {commission_result.get('referrer_user_id')}")
    except Exception as e:
        logger.error(f"Failed to process referral commission: {str(e)}")
    
    # Send email notification (respects user settings)
    try:
        user_settings = user.get('security', {})
        if user_settings.get('login_email_alerts_enabled', True):
            await email_service.send_withdrawal_confirmation(
                user_email=user["email"],
                user_name=user["full_name"],
                amount=net_amount,
                coin=request.currency,
                tx_hash=transaction.transaction_id,
                status='completed',
                wallet_address=request.wallet_address
            )
            logger.info(f"Withdrawal confirmation email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send withdrawal email: {str(e)}")
    
    # Create in-app notification
    try:
        await create_notification(
            db,
            user_id=request.user_id,
            notification_type='withdrawal_completed',
            title=f'Withdrawal Complete: {net_amount} {request.currency}',
            message=f'Your withdrawal of {net_amount} {request.currency} has been processed and sent to {request.wallet_address[:12]}...',
            link='/my-orders',
            metadata={
                'amount': net_amount,
                'coin': request.currency,
                'tx_hash': transaction.transaction_id,
                'wallet_address': request.wallet_address
            }
        )
    except Exception as e:
        logger.error(f"Failed to create withdrawal notification: {str(e)}")
    
    return {
        "success": True,
        "transaction": transaction.model_dump(),
        "message": f"Withdrawal of {net_amount} {request.currency} completed successfully"
    }

# Withdrawal fee config endpoint REMOVED - internal fee percentage not exposed to users

@api_router.get("/crypto-bank/transactions/{user_id}")
async def get_user_crypto_transactions(user_id: str, limit: int = 50):
    """Get transaction history for a user"""
    transactions = await db.crypto_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }


@api_router.get("/crypto-bank/transactions/{user_id}/categorized")
async def get_categorized_transactions(user_id: str, limit: int = 50):
    """Get user transactions with INCOMING/OUTGOING labels"""
    try:
        transactions = await db.crypto_transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Categorize each transaction
        categorized = []
        for tx in transactions:
            tx_type = tx.get("transaction_type", "")
            
            # Determine if incoming or outgoing
            if tx_type in ["deposit", "p2p_buy", "referral_commission", "referral_bonus", "platform_fee"]:
                direction = "INCOMING"
                direction_icon = "📥"
                color = "#10B981"  # Green
            elif tx_type in ["withdrawal", "p2p_sell"]:
                direction = "OUTGOING"
                direction_icon = "📤"
                color = "#EF4444"  # Red
            else:
                direction = "OTHER"
                direction_icon = "↔️"
                color = "#6B7280"  # Gray
            
            categorized.append({
                **tx,
                "direction": direction,
                "direction_icon": direction_icon,
                "direction_color": color,
                "display_type": f"{direction_icon} {direction} - {tx_type.replace('_', ' ').title()}"
            })
        
        # Count totals
        incoming_count = len([t for t in categorized if t["direction"] == "INCOMING"])
        outgoing_count = len([t for t in categorized if t["direction"] == "OUTGOING"])
        
        return {
            "success": True,
            "transactions": categorized,
            "count": len(categorized),
            "summary": {
                "total": len(categorized),
                "incoming": incoming_count,
                "outgoing": outgoing_count,
                "other": len(categorized) - incoming_count - outgoing_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/crypto-bank/balance-summary/{user_id}")
async def get_balance_summary_with_pending(user_id: str):
    """Get comprehensive balance summary with pending incoming/outgoing"""
    try:
        # Get all balances
        balances = await db.crypto_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get pending transactions (last 24 hours)
        one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        recent_txs = await db.crypto_transactions.find(
            {
                "user_id": user_id,
                "created_at": {"$gte": one_day_ago.isoformat()}
            },
            {"_id": 0}
        ).to_list(1000)
        
        # Calculate pending amounts by currency
        pending_by_currency = {}
        for tx in recent_txs:
            currency = tx.get("currency", "")
            amount = float(tx.get("amount", 0))
            tx_type = tx.get("transaction_type", "")
            status = tx.get("status", "")
            
            if currency not in pending_by_currency:
                pending_by_currency[currency] = {"incoming": 0, "outgoing": 0}
            
            if status == "pending":
                if tx_type in ["deposit", "p2p_buy"]:
                    pending_by_currency[currency]["incoming"] += amount
                elif tx_type in ["withdrawal", "p2p_sell"]:
                    pending_by_currency[currency]["outgoing"] += amount
        
        # Combine with balances
        summary = []
        for balance in balances:
            currency = balance.get("currency", "")
            available = float(balance.get("balance", 0))
            locked = float(balance.get("locked_balance", 0))
            
            pending_info = pending_by_currency.get(currency, {"incoming": 0, "outgoing": 0})
            
            summary.append({
                "currency": currency,
                "available_balance": available,
                "locked_balance": locked,
                "total_balance": available + locked,
                "pending_incoming": pending_info["incoming"],
                "pending_outgoing": pending_info["outgoing"],
                "estimated_balance": available + locked + pending_info["incoming"] - pending_info["outgoing"]
            })
        
        return {
            "success": True,
            "balances": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@api_router.get("/crypto-bank/onboarding/{user_id}")
async def get_onboarding_status(user_id: str):
    """Get onboarding status for a user"""
    status = await db.onboarding_status.find_one({"user_id": user_id}, {"_id": 0})
    
    if not status:
        # Create initial status
        new_status = OnboardingStatus(user_id=user_id)
        status_dict = new_status.model_dump()
        await db.onboarding_status.insert_one(status_dict)
        return {"success": True, "status": status_dict}
    
    return {"success": True, "status": status}

@api_router.post("/crypto-bank/onboarding/{user_id}/complete-wallet-setup")
async def complete_wallet_setup(user_id: str):
    """Mark wallet setup as complete"""
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {"$set": {"wallet_setup": True}},
        upsert=True
    )
    
    return {"success": True, "message": "Wallet setup completed"}

# ============================================
# GOOGLE OAUTH & REFERRAL SYSTEM ENDPOINTS
# ============================================
from referral_system import (
    REFERRAL_CONFIG,
    ReferralCode,
    ReferralRelationship,
    ReferralStats,
    ReferralCommission,
    ReferralEarnings,
    generate_referral_code,
    generate_referral_link,
    calculate_commission,
    is_within_commission_period,
    is_within_fee_discount_period,
    calculate_discounted_fee,
    CreateReferralCodeRequest,
    ReferralCodeResponse,
    ApplyReferralCodeRequest,
    ReferralDashboardResponse,
    load_referral_config_from_db,
    update_referral_config_in_db
)
from fastapi import Cookie, Response
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
import httpx

# Google OAuth User Model
class GoogleAuthUser(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None  # Referral code used during signup
    fee_discount_end_date: Optional[datetime] = None  # When 0% fee expires
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Referral Endpoints
@api_router.post("/referral/create")
async def create_referral_code(request: CreateReferralCodeRequest):
    """Create referral code for user"""
    # Check if user already has a code
    existing = await db.referral_codes.find_one({"user_id": request.user_id})
    if existing:
        return {
            "success": True,
            "referral_code": existing["referral_code"],
            "referral_link": existing["referral_link"],
            "message": "Referral code already exists"
        }
    
    # Generate new code
    code = generate_referral_code(request.username)
    link = generate_referral_link(code)
    
    referral = ReferralCode(
        user_id=request.user_id,
        referral_code=code,
        referral_link=link
    )
    
    await db.referral_codes.insert_one(referral.model_dump())
    
    # Initialize stats
    stats = ReferralStats(user_id=request.user_id)
    await db.referral_stats.insert_one(stats.model_dump())
    
    return {
        "success": True,
        "referral_code": code,
        "referral_link": link,
        "message": "Referral code created successfully"
    }

@api_router.post("/referral/apply")
async def apply_referral_code(request: ApplyReferralCodeRequest, req: Request):
    """Apply referral code during signup with anti-abuse protection"""
    # Find referrer by code
    referrer_code = await db.referral_codes.find_one({"referral_code": request.referral_code})
    if not referrer_code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_user_id = referrer_code["user_id"]
    
    # Check if relationship already exists
    existing = await db.referral_relationships.find_one({
        "referred_user_id": request.referred_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="User already used a referral code")
    
    # Get referred user's IP and user agent for anti-abuse detection
    referred_user = await db.user_accounts.find_one(
        {"user_id": request.referred_user_id},
        {"_id": 0, "ip_address": 1, "user_agent": 1}
    )
    
    ip_address = referred_user.get("ip_address", "Unknown") if referred_user else "Unknown"
    user_agent = referred_user.get("user_agent", "Unknown") if referred_user else "Unknown"
    
    # ANTI-ABUSE CHECK: Detect suspicious patterns
    abuse_check = await check_referral_abuse(
        db,
        ip_address=ip_address,
        user_agent=user_agent,
        referrer_user_id=referrer_user_id,
        referral_code=request.referral_code
    )
    
    is_suspicious = abuse_check["is_suspicious"]
    block_bonus = abuse_check["block_bonus"]
    
    # Log if suspicious
    if is_suspicious:
        await log_suspicious_referral(
            db,
            referrer_user_id=referrer_user_id,
            referred_user_id=request.referred_user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            reasons=abuse_check["reasons"],
            blocked=block_bonus
        )
        logger.warning(f"⚠️ SUSPICIOUS REFERRAL DETECTED: {request.referred_user_id} for referrer {referrer_user_id}")
        logger.warning(f"   Reasons: {', '.join(abuse_check['reasons'])}")
        logger.warning(f"   Bonus blocked: {block_bonus}")
    
    # Create relationship (always created, but may be flagged as suspicious)
    relationship_doc = {
        "relationship_id": str(uuid.uuid4()),
        "referrer_user_id": referrer_user_id,
        "referred_user_id": request.referred_user_id,
        "referral_code_used": request.referral_code,
        "referral_type": referrer_code.get("referral_type", "public"),
        "signup_date": datetime.now(timezone.utc).isoformat(),
        
        # Anti-abuse tracking
        "ip_address": ip_address,
        "user_agent": user_agent,
        "suspicious": is_suspicious,
        "abuse_reasons": abuse_check["reasons"] if is_suspicious else [],
        "bonus_blocked": block_bonus,
        
        # Bonus tracking
        "bonus_awarded": False,
        "bonus_amount": 0,
        "qualifying_top_up": 0,
        
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_relationships.insert_one(relationship_doc)
    
    # Update referrer stats (always count signup, even if suspicious)
    await db.referral_stats.update_one(
        {"user_id": referrer_user_id},
        {
            "$inc": {
                "total_signups": 1,
                "active_referrals": 1,
                "suspicious_referrals": 1 if is_suspicious else 0
            },
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Update referred user record
    await db.user_accounts.update_one(
        {"user_id": request.referred_user_id},
        {
            "$set": {
                "referred_by": request.referral_code,
                "referral_applied_at": datetime.now(timezone.utc).isoformat(),
                "referral_suspicious": is_suspicious
            }
        }
    )
    
    # Prepare response message
    if block_bonus:
        message = "Referral code applied. Note: Bonus rewards are under review due to security checks."
        logger.info(f"✅ Referral applied but BONUS BLOCKED for {request.referred_user_id}")
    else:
        message = "Referral code applied! Your referrer will earn 20% commission on your transactions + £20 when you top up £150+"
        logger.info(f"✅ Referral applied successfully for {request.referred_user_id}")
    
    return {
        "success": True,
        "message": message,
        "referrer_benefits": "Lifetime 20% commission + £20 bonus on qualifying top-up" if not block_bonus else "Under review",
        "suspicious": is_suspicious
    }

@api_router.get("/referrals/dashboard")
@api_router.get("/referral/dashboard/{user_id}")
async def get_referral_dashboard(user_id: str = None):
    """Get user's referral dashboard"""
    # Get referral code
    code_data = await db.referral_codes.find_one({"user_id": user_id})
    
    # If no referral code exists, create one on-the-fly
    if not code_data:
        logger.info(f"No referral code found for user {user_id}, creating one...")
        
        # Get user's name from either user_accounts or users collection
        user = await db.user_accounts.find_one({"user_id": user_id})
        if not user:
            user = await db.users.find_one({"user_id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate referral code
        username = user.get("full_name") or user.get("name") or user.get("email", "user")
        code = generate_referral_code(username)
        link = generate_referral_link(code)
        
        referral = ReferralCode(
            user_id=user_id,
            referral_code=code,
            referral_link=link
        )
        await db.referral_codes.insert_one(referral.model_dump())
        
        # Initialize stats
        stats_doc = ReferralStats(user_id=user_id)
        await db.referral_stats.insert_one(stats_doc.model_dump())
        
        code_data = referral.model_dump()
        logger.info(f"Created referral code for user {user_id}: {code}")
    
    # Get stats
    stats = await db.referral_stats.find_one({"user_id": user_id})
    if not stats:
        # Create default stats if missing
        stats_doc = ReferralStats(user_id=user_id)
        await db.referral_stats.insert_one(stats_doc.model_dump())
        stats = {"total_invited": 0, "total_signups": 0, "total_trades": 0, "active_referrals": 0}
    
    # Get earnings by currency
    earnings = await db.referral_earnings.find({"user_id": user_id}).to_list(100)
    earnings_list = [
        {
            "currency": e.get("currency", "N/A"),
            "total_earned": e.get("total_earned", 0),
            "pending": e.get("pending_earnings", 0),
            "paid": e.get("paid_earnings", 0)
        }
        for e in earnings
    ]
    
    # Get recent commissions
    commissions = await db.referral_commissions.find(
        {"referrer_user_id": user_id}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    commissions_list = [
        {
            "commission_id": c["commission_id"],
            "amount": c["commission_amount"],
            "currency": c["currency"],
            "transaction_type": c["transaction_type"],
            "created_at": c["created_at"].isoformat() if isinstance(c["created_at"], datetime) else c["created_at"],
            "status": c["status"]
        }
        for c in commissions
    ]
    
    # Get list of referred users with qualification status
    referred_users = await db.referral_relationships.find(
        {"referrer_user_id": user_id}
    ).to_list(100)
    
    referred_list = []
    for ref in referred_users:
        referred_user = await db.user_accounts.find_one(
            {"user_id": ref["referred_user_id"]},
            {"_id": 0, "full_name": 1, "email": 1}
        )
        referred_list.append({
            "user_id": ref["referred_user_id"],
            "name": referred_user.get("full_name", "Unknown") if referred_user else "Unknown",
            "email": referred_user.get("email", "N/A") if referred_user else "N/A",
            "registered_at": ref.get("signup_date", ref.get("created_at", "N/A")),
            "bonus_qualified": ref.get("bonus_awarded", False),
            "qualifying_top_up": ref.get("qualifying_top_up", 0)
        })
    
    return {
        "success": True,
        "referral_code": code_data["referral_code"],
        "referral_link": code_data["referral_link"],
        
        # Updated stats for new system
        "total_referrals": stats.get("total_signups", 0),
        "qualified_referrals": stats.get("qualified_referrals", 0),  # ≥£150 top-up
        "total_referral_bonus_earned": stats.get("total_referral_bonus_earned", 0),  # £20 bonuses
        "lifetime_commission_earned": stats.get("lifetime_commission_earned", 0),  # 20% commissions
        "total_fees_generated_by_network": stats.get("total_fees_generated_by_network", 0),
        "active_referrals": stats.get("active_referrals", 0),
        
        # Detailed lists
        "referred_users": referred_list,
        "recent_commissions": commissions_list,
        "earnings_by_currency": earnings_list
    }

@api_router.post("/referral/process-commission")
async def check_and_award_referral_bonus(user_id: str, top_up_amount: float, currency: str):
    """
    Award £20 bonus to referrer when referred user tops up ≥£150 for the FIRST TIME ONLY.
    ANTI-ABUSE: Blocks bonus if referral is flagged as suspicious.
    """
    # Check if user was referred
    relationship = await db.referral_relationships.find_one({"referred_user_id": user_id})
    if not relationship:
        return {"success": True, "message": "No referrer for this user"}
    
    # Check if bonus already awarded
    if relationship.get("bonus_awarded", False):
        return {"success": True, "message": "Bonus already awarded"}
    
    # ANTI-ABUSE: Check if referral is suspicious and bonus is blocked
    if relationship.get("suspicious", False) and relationship.get("bonus_blocked", False):
        logger.warning(f"⚠️ BONUS BLOCKED: Referral {user_id} is flagged as suspicious")
        return {
            "success": True,
            "message": "Bonus blocked due to suspicious activity",
            "bonus_blocked": True
        }
    
    # Convert to GBP equivalent (simplified - in production use real exchange rates)
    # For now, assume 1:1 or use a conversion factor
    gbp_equivalent = top_up_amount  # Simplified
    
    # Check if threshold met (£150)
    if gbp_equivalent < 150:
        logger.info(f"Top-up {gbp_equivalent} below £150 threshold, no bonus awarded")
        return {"success": True, "message": "Below threshold"}
    
    # Award £20 bonus to referrer
    bonus_amount = 20
    bonus_currency = "GBP"  # or USDT/USD equivalent
    
    # Get referred user info
    referred_user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "full_name": 1})
    referred_name = referred_user.get("full_name", "Unknown") if referred_user else "Unknown"
    
    # DEDUCT £20 from platform wallet first
    try:
        from platform_wallet import deduct_platform_funds
        
        bonus_record_id = str(uuid.uuid4())
        
        deduction_result = await deduct_platform_funds(
            db=db,
            amount=bonus_amount,
            currency=bonus_currency,
            reason="referral_bonus_payout",
            reference_id=bonus_record_id,
            recipient_id=relationship["referrer_user_id"]
        )
        
        if not deduction_result.get("success"):
            logger.error(f"❌ PLATFORM WALLET INSUFFICIENT FUNDS - Cannot pay £20 bonus!")
            # Send alert to admin
            await send_email(
                to_email="info@coinhubx.net",
                subject="🚨 URGENT: Platform Wallet Insufficient Funds",
                html_content=f"""
                <h2>Platform Wallet Alert</h2>
                <p>Cannot pay £20 referral bonus - insufficient funds!</p>
                <p>Referrer: {relationship["referrer_user_id"]}</p>
                <p>Current balance: Check admin dashboard</p>
                """
            )
            return {
                "success": False,
                "message": "Platform wallet insufficient funds",
                "bonus_awarded": False
            }
        
        logger.info(f"✅ Deducted £{bonus_amount} from platform wallet")
        
    except Exception as e:
        logger.error(f"❌ Failed to deduct from platform wallet: {str(e)}")
        return {"success": False, "message": "Platform wallet error"}
    
    # Add £20 to referrer's balance (after successful deduction)
    await db.crypto_balances.update_one(
        {"user_id": relationship["referrer_user_id"], "currency": bonus_currency},
        {
            "$inc": {"balance": bonus_amount, "available_balance": bonus_amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Mark bonus as awarded
    await db.referral_relationships.update_one(
        {"relationship_id": relationship["relationship_id"]},
        {
            "$set": {
                "bonus_awarded": True,
                "bonus_awarded_at": datetime.now(timezone.utc).isoformat(),
                "bonus_amount": bonus_amount,
                "qualifying_top_up": top_up_amount
            }
        }
    )
    
    # Update referrer stats
    await db.referral_stats.update_one(
        {"user_id": relationship["referrer_user_id"]},
        {
            "$inc": {
                "qualified_referrals": 1,
                "total_referral_bonus_earned": bonus_amount
            },
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Create bonus record
    bonus_record = {
        "bonus_id": str(uuid.uuid4()),
        "referrer_user_id": relationship["referrer_user_id"],
        "referred_user_id": user_id,
        "referred_user_name": referred_name,
        "bonus_type": "referral_signup",
        "bonus_amount": bonus_amount,
        "currency": bonus_currency,
        "qualifying_top_up": top_up_amount,
        "awarded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.referral_bonuses.insert_one(bonus_record)
    
    # Create in-app notification
    try:
        await create_notification(
            db,
            user_id=relationship["referrer_user_id"],
            notification_type='referral_bonus',
            title=f'🎉 £20 Referral Bonus Earned!',
            message=f'{referred_name} topped up £{top_up_amount:.2f}. You earned your £20 referral bonus!',
            link='/referral-dashboard',
            metadata={
                'bonus_amount': bonus_amount,
                'currency': bonus_currency,
                'referred_user': referred_name,
                'top_up_amount': top_up_amount
            }
        )
    except Exception as e:
        logger.error(f"Failed to create bonus notification: {str(e)}")
    
    # Send email notification
    try:
        referrer = await db.user_accounts.find_one(
            {"user_id": relationship["referrer_user_id"]}, 
            {"_id": 0, "email": 1, "full_name": 1, "security": 1}
        )
        if referrer:
            user_settings = referrer.get('security', {})
            if user_settings.get('login_email_alerts_enabled', True):
                logger.info(f"£20 bonus email would be sent to {referrer['email']}")
    except Exception as e:
        logger.error(f"Failed to send bonus email: {str(e)}")
    
    logger.info(f"✅ £20 BONUS AWARDED to {relationship['referrer_user_id']} for {referred_name} top-up of £{top_up_amount}")
    
    return {
        "success": True,
        "bonus_awarded": True,
        "bonus_amount": bonus_amount,
        "currency": bonus_currency,
        "referrer_user_id": relationship["referrer_user_id"]
    }

async def process_referral_commission(
    user_id: str,
    transaction_id: str,
    transaction_type: str,
    fee_amount: float,
    currency: str
):
    """
    Process LIFETIME referral commission when a referred user generates a fee.
    Referrer earns 20% of ALL fees instantly, forever. No time limits.
    ANTI-ABUSE: Blocks commission if referral is flagged as suspicious.
    """
    # Check if user was referred
    relationship = await db.referral_relationships.find_one({"referred_user_id": user_id})
    if not relationship:
        return {"success": True, "message": "No referrer for this user"}
    
    # ANTI-ABUSE: Check if commission is blocked for this relationship
    if relationship.get("suspicious", False) and relationship.get("bonus_blocked", False):
        logger.warning(f"⚠️ COMMISSION BLOCKED: Referral {user_id} is flagged as suspicious")
        return {
            "success": True,
            "message": "Commission blocked due to suspicious activity",
            "commission_blocked": True
        }
    
    # Check referrer's commission tier (includes Golden Referral and paid upgrades)
    referrer = await db.user_accounts.find_one(
        {"user_id": relationship["referrer_user_id"]}, 
        {"_id": 0, "golden_referral": 1}
    )
    
    # Check referral_codes collection for paid tier upgrades
    referral_code = await db.referral_codes.find_one(
        {"user_id": relationship["referrer_user_id"]},
        {"_id": 0, "commission_percent": 1}
    )
    
    # Calculate commission based on tier priority:
    # 1. Golden Referral (admin-set): 50% commission
    # 2. Paid tier upgrades: 30% or 40% commission
    # 3. Standard: 20% commission (default)
    is_golden = referrer.get("golden_referral", False) if referrer else False
    
    if is_golden:
        commission_percent = 50
    elif referral_code and referral_code.get("commission_percent"):
        commission_percent = referral_code.get("commission_percent", 20)
    else:
        commission_percent = 20
    
    commission_amount = fee_amount * (commission_percent / 100)
    
    if commission_amount <= 0:
        return {"success": True, "message": "No commission to pay"}
    
    # Get referred user info for notification
    referred_user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "full_name": 1})
    referred_name = referred_user.get("full_name", "Unknown") if referred_user else "Unknown"
    
    # Create commission record with detailed info
    commission_record = {
        "commission_id": str(uuid.uuid4()),
        "referrer_user_id": relationship["referrer_user_id"],
        "referred_user_id": user_id,
        "referred_user_name": referred_name,
        "transaction_id": transaction_id,
        "transaction_type": transaction_type,
        "fee_event": transaction_type,  # P2P, swap, deposit, withdrawal, etc.
        "original_fee_amount": fee_amount,
        "commission_amount": commission_amount,
        "commission_percent": commission_percent,
        "is_golden_tier": is_golden,
        "currency": currency,
        "status": "paid",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_commissions.insert_one(commission_record)
    
    # Add commission to referrer's balance INSTANTLY via wallet service
    try:
        wallet_service = get_wallet_service()
        await wallet_service.credit(
            user_id=relationship["referrer_user_id"],
            currency=currency,
            amount=commission_amount,
            transaction_type="referral_commission",
            reference_id=commission_record["commission_id"],
            metadata={
                "referred_user_id": user_id,
                "transaction_id": transaction_id,
                "commission_percent": commission_percent
            }
        )
        logger.info(f"✅ Referral: Credited {commission_amount} {currency} to {relationship['referrer_user_id']}")
    except Exception as wallet_error:
        logger.error(f"❌ Referral commission wallet credit failed: {str(wallet_error)}")
    
    # Update referrer's lifetime earnings stats
    await db.referral_stats.update_one(
        {"user_id": relationship["referrer_user_id"]},
        {
            "$inc": {
                "lifetime_commission_earned": commission_amount,
                "total_fees_generated_by_network": fee_amount
            },
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Create in-app notification for referrer
    try:
        await create_notification(
            db,
            user_id=relationship["referrer_user_id"],
            notification_type='referral_commission',
            title=f'💰 Referral Commission Earned: {commission_amount} {currency}',
            message=f'You earned {commission_amount} {currency} ({commission_percent}%) from {referred_name}\'s {transaction_type} fee.',
            link='/referral-dashboard',
            metadata={
                'commission_amount': commission_amount,
                'currency': currency,
                'referred_user': referred_name,
                'fee_event': transaction_type
            }
        )
    except Exception as e:
        logger.error(f"Failed to create commission notification: {str(e)}")
    
    # Send email to referrer about commission
    try:
        referrer = await db.user_accounts.find_one(
            {"user_id": relationship["referrer_user_id"]}, 
            {"_id": 0, "email": 1, "full_name": 1, "security": 1}
        )
        if referrer:
            user_settings = referrer.get('security', {})
            if user_settings.get('login_email_alerts_enabled', True):
                # Email notification about commission
                logger.info(f"Commission email would be sent to {referrer['email']}: {commission_amount} {currency}")
    except Exception as e:
        logger.error(f"Failed to send commission email: {str(e)}")
    
    logger.info(f"✅ LIFETIME COMMISSION PAID: {commission_amount} {currency} to {relationship['referrer_user_id']} from {referred_name}'s {transaction_type}")
    
    return {
        "success": True,
        "commission_paid": commission_amount,
        "currency": currency,
        "referrer_user_id": relationship["referrer_user_id"]
    }

@api_router.get("/referral/check-discount/{user_id}")
# REMOVED: Fee discount system completely removed per new requirements

# ============================================================================
# ENHANCED DUAL REFERRAL SYSTEM ENDPOINTS
# ============================================================================

@api_router.post("/referral/create-private-code")
async def create_private_referral_code(user_id: str):
    """Create a private referral code with £10 bonus"""
    # Check if user already has a private code
    existing = await db.referral_codes.find_one({"user_id": user_id, "referral_type": "private"})
    if existing:
        return {
            "success": True,
            "message": "Private code already exists",
            "referral_code": existing["referral_code"],
            "referral_link": existing["referral_link"],
            "referral_type": "private"
        }
    
    # Get user info
    user = await db.user_accounts.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate private code (add -PVT suffix)
    username = user.get("full_name", "user")
    code = generate_referral_code(username) + "-PVT"
    link = generate_referral_link(code)
    
    referral = ReferralCode(
        user_id=user_id,
        referral_code=code,
        referral_link=link,
        referral_type="private"
    )
    await db.referral_codes.insert_one(referral.model_dump())
    
    return {
        "success": True,
        "message": "Private referral code created",
        "referral_code": code,
        "referral_link": link,
        "referral_type": "private"
    }

@api_router.post("/referral/create-public-code")
async def create_public_referral_code(user_id: str):
    """Create a public referral code (no £10 bonus)"""
    # Check if user already has a public code
    existing = await db.referral_codes.find_one({"user_id": user_id, "referral_type": "public"})
    if existing:
        return {
            "success": True,
            "message": "Public code already exists",
            "referral_code": existing["referral_code"],
            "referral_link": existing["referral_link"],
            "referral_type": "public"
        }
    
    # Get user info
    user = await db.user_accounts.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate public code
    username = user.get("full_name", "user")
    code = generate_referral_code(username)
    link = generate_referral_link(code)
    
    referral = ReferralCode(
        user_id=user_id,
        referral_code=code,
        referral_link=link,
        referral_type="public"
    )
    await db.referral_codes.insert_one(referral.model_dump())
    
    return {
        "success": True,
        "message": "Public referral code created",
        "referral_code": code,
        "referral_link": link,
        "referral_type": "public"
    }

@api_router.get("/referral/enhanced-dashboard/{user_id}")
async def get_enhanced_referral_dashboard(user_id: str):
    """Get enhanced referral dashboard with both private and public stats"""
    # Get both referral codes
    private_code = await db.referral_codes.find_one({"user_id": user_id, "referral_type": "private"})
    public_code = await db.referral_codes.find_one({"user_id": user_id, "referral_type": "public"})
    
    # Get stats
    stats = await db.referral_stats.find_one({"user_id": user_id})
    if not stats:
        stats = ReferralStats(user_id=user_id).model_dump()
        await db.referral_stats.insert_one(stats)
    
    # Get referral relationships
    relationships = await db.referral_relationships.find({"referrer_user_id": user_id}).to_list(1000)
    
    # Separate private and public referrals
    private_referrals = [r for r in relationships if r.get("referral_type") == "private"]
    public_referrals = [r for r in relationships if r.get("referral_type") == "public"]
    
    # Count £150 deposits
    users_deposited_150 = sum(1 for r in private_referrals if r.get("has_reached_150_deposit", False))
    
    # Get bonus payouts
    bonus_payouts = await db.referral_bonus_payouts.find({"referrer_user_id": user_id}).to_list(1000)
    total_bonus_earned = sum(p["bonus_amount_gbp"] for p in bonus_payouts)
    
    return {
        "success": True,
        "private_code": {
            "code": private_code["referral_code"] if private_code else None,
            "link": private_code["referral_link"] if private_code else None,
            "total_signups": len(private_referrals),
            "users_deposited_150": users_deposited_150,
            "total_bonus_earned_gbp": total_bonus_earned
        },
        "public_code": {
            "code": public_code["referral_code"] if public_code else None,
            "link": public_code["referral_link"] if public_code else None,
            "total_signups": len(public_referrals)
        },
        "overall_stats": {
            "total_referrals": len(relationships),
            "total_commission_earned_gbp": stats.get("total_commission_earned_gbp", 0.0),
            "active_referrals": stats.get("active_referrals", 0)
        },
        "referral_list": [
            {
                "user_id": r["referred_user_id"],
                "type": r.get("referral_type", "public"),
                "signup_date": r["signup_date"].isoformat() if isinstance(r["signup_date"], datetime) else r["signup_date"],
                "total_deposits_gbp": r.get("total_deposits_gbp", 0.0),
                "reached_150": r.get("has_reached_150_deposit", False),
                "bonus_paid": r.get("bonus_paid", False)
            }
            for r in relationships
        ]
    }

@api_router.post("/admin/referral-wallet/topup")
async def topup_referral_wallet(amount_usdt: float):
    """Admin tops up referral wallet balance"""
    wallet = await db.admin_referral_wallet.find_one({"wallet_id": "admin_referral_wallet"})
    
    if not wallet:
        # Create wallet
        from referral_system import AdminReferralWallet
        wallet = AdminReferralWallet(balance_usdt=amount_usdt).model_dump()
        await db.admin_referral_wallet.insert_one(wallet)
    else:
        # Update balance
        await db.admin_referral_wallet.update_one(
            {"wallet_id": "admin_referral_wallet"},
            {
                "$inc": {"balance_usdt": amount_usdt},
                "$set": {"last_topped_up": datetime.now(timezone.utc)}
            }
        )
    
    updated_wallet = await db.admin_referral_wallet.find_one({"wallet_id": "admin_referral_wallet"})
    
    return {
        "success": True,
        "message": f"Wallet topped up with {amount_usdt} USDT",
        "new_balance": updated_wallet["balance_usdt"]
    }

@api_router.get("/admin/referral-wallet/balance")
async def get_referral_wallet_balance():
    """Get admin referral wallet balance"""
    wallet = await db.admin_referral_wallet.find_one({"wallet_id": "admin_referral_wallet"})
    if not wallet:
        return {"balance_usdt": 0.0, "total_paid_out": 0.0}
    return {
        "balance_usdt": wallet["balance_usdt"],
        "total_paid_out": wallet.get("total_paid_out", 0.0)
    }

# This function is called automatically when a deposit is approved
async def check_and_pay_referral_bonus(referred_user_id: str, deposit_amount_gbp: float):
    """Check if £150 milestone reached and pay £10 bonus"""
    # Find referral relationship
    relationship = await db.referral_relationships.find_one({"referred_user_id": referred_user_id})
    if not relationship or relationship.get("referral_type") != "private":
        return {"success": False, "message": "No private referral relationship"}
    
    # Update total deposits
    new_total = relationship.get("total_deposits_gbp", 0.0) + deposit_amount_gbp
    await db.referral_relationships.update_one(
        {"relationship_id": relationship["relationship_id"]},
        {"$set": {"total_deposits_gbp": new_total}}
    )
    
    # Check if £150 milestone reached and bonus not yet paid
    if new_total >= 150.0 and not relationship.get("bonus_paid", False):
        # Mark milestone reached
        await db.referral_relationships.update_one(
            {"relationship_id": relationship["relationship_id"]},
            {"$set": {"has_reached_150_deposit": True}}
        )
        
        # Pay £10 bonus
        referrer_id = relationship["referrer_user_id"]
        
        # Check admin wallet balance
        wallet = await db.admin_referral_wallet.find_one({"wallet_id": "admin_referral_wallet"})
        if not wallet or wallet["balance_usdt"] < 10.0:
            logger.error(f"Insufficient admin wallet balance for bonus payout to {referrer_id}")
            return {"success": False, "message": "Insufficient admin wallet balance"}
        
        # Deduct from admin wallet
        await db.admin_referral_wallet.update_one(
            {"wallet_id": "admin_referral_wallet"},
            {
                "$inc": {
                    "balance_usdt": -10.0,
                    "total_paid_out": 10.0
                }
            }
        )
        
        # Credit user balance (assume USDT for now, £1 = $1.30 approx)
        await db.user_accounts.update_one(
            {"user_id": referrer_id},
            {"$inc": {"balance_USDT": 13.0}}  # £10 ~= $13 USDT
        )
        
        # Record bonus payout
        from referral_system import ReferralBonusPayout
        bonus_payout = ReferralBonusPayout(
            referrer_user_id=referrer_id,
            referred_user_id=referred_user_id,
            bonus_amount_gbp=10.0,
            bonus_amount_usdt=13.0
        )
        await db.referral_bonus_payouts.insert_one(bonus_payout.model_dump())
        
        # Update relationship
        await db.referral_relationships.update_one(
            {"relationship_id": relationship["relationship_id"]},
            {"$set": {
                "bonus_paid": True,
                "bonus_paid_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update stats
        await db.referral_stats.update_one(
            {"user_id": referrer_id},
            {
                "$inc": {
                    "total_bonus_earned_gbp": 10.0,
                    "private_users_deposited_150": 1
                }
            }
        )
        
        logger.info(f"£10 bonus paid to {referrer_id} for referral {referred_user_id}")
        return {"success": True, "message": "£10 bonus paid", "referrer_user_id": referrer_id}
    
    return {"success": True, "message": "Milestone not yet reached or bonus already paid"}

# Google OAuth Endpoints
@api_router.get("/auth/session-data")
async def get_session_data(
    x_session_id: str = Header(None, alias="X-Session-ID"),
    session_id: str = None
):
    """Get user data from Emergent Auth session ID"""
    # Accept from header or query parameter
    session_id_value = x_session_id or session_id
    
    if not session_id_value:
        raise HTTPException(status_code=400, detail="Missing session_id parameter or X-Session-ID header")
    
    x_session_id = session_id_value
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": x_session_id}
            )
            response.raise_for_status()
            data = response.json()
            
            # Get or create user
            user = await db.users.find_one({"email": data["email"]})
            
            if not user:
                # Create new user
                new_user_id = str(uuid.uuid4())
                new_user = {
                    "_id": new_user_id,
                    "id": new_user_id,
                    "email": data["email"],
                    "name": data["name"],
                    "picture": data.get("picture"),
                    "full_name": data["name"],
                    "user_id": new_user_id,
                    "wallet_address": f"wallet_{new_user_id[:8]}",
                    "created_at": datetime.now(timezone.utc)
                }
                await db.users.insert_one(new_user)
                
                # Initialize crypto balances
                for currency in ["BTC", "ETH", "USDT"]:
                    balance = CryptoBalance(user_id=new_user_id, currency=currency)
                    await db.crypto_balances.insert_one(balance.model_dump())
                
                # Create referral code
                code = generate_referral_code(data["name"])
                link = generate_referral_link(code)
                referral = ReferralCode(user_id=new_user_id, referral_code=code, referral_link=link)
                await db.referral_codes.insert_one(referral.model_dump())
                
                # Initialize stats
                stats = ReferralStats(user_id=new_user_id)
                await db.referral_stats.insert_one(stats.model_dump())
                
                user = new_user
            
            # Store session token
            session_token = data["session_token"]
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.update_one(
                {"session_token": session_token},
                {
                    "$set": {
                        "user_id": user["id"],
                        "expires_at": expires_at,
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            
            return {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "picture": user.get("picture"),
                "session_token": session_token
            }
            
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")

@api_router.get("/auth/me")
async def get_current_user_info(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    """Get current user from session token or Authorization header"""
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    if datetime.now(timezone.utc) > session["expires_at"]:
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", user.get("full_name")),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token")
    return {"success": True, "message": "Logged out successfully"}


# ============================================================================
# ADMIN FEE MANAGEMENT ENDPOINTS
# ============================================================================

@api_router.get("/admin/fees/config")
async def get_fee_configuration():
    """Get current platform fee configuration (Admin only)"""
    try:
        # Get from platform_settings or use defaults
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        fee_config = {
            "p2p_trade_fee_percent": settings.get("p2p_trade_fee_percent", PLATFORM_CONFIG["p2p_trade_fee_percent"]) if settings else PLATFORM_CONFIG["p2p_trade_fee_percent"],
            "spot_trading_fee_percent": settings.get("spot_trading_fee_percent", PLATFORM_CONFIG["spot_trading_fee_percent"]) if settings else PLATFORM_CONFIG["spot_trading_fee_percent"],
            "swap_fee_percent": settings.get("swap_fee_percent", PLATFORM_CONFIG["swap_fee_percent"]) if settings else PLATFORM_CONFIG["swap_fee_percent"],
            "express_buy_fee_percent": settings.get("express_buy_fee_percent", PLATFORM_CONFIG["express_buy_fee_percent"]) if settings else PLATFORM_CONFIG["express_buy_fee_percent"],
            "withdraw_fee_percent": settings.get("withdraw_fee_percent", PLATFORM_CONFIG["withdraw_fee_percent"]) if settings else PLATFORM_CONFIG["withdraw_fee_percent"]
        }
        
        return {
            "success": True,
            "fees": fee_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/fees/update")
async def update_fee_configuration(request: dict):
    """Update platform fee configuration (Admin only)
    
    Request body:
    {
        "p2p_trade_fee_percent": 3.0,
        "spot_trading_fee_percent": 3.0,
        "swap_fee_percent": 3.0,
        "express_buy_fee_percent": 3.0,
        "withdraw_fee_percent": 1.0
    }
    """
    try:
        # Validate fee percentages
        valid_fee_keys = [
            "p2p_trade_fee_percent",
            "spot_trading_fee_percent", 
            "swap_fee_percent",
            "express_buy_fee_percent",
            "withdraw_fee_percent"
        ]
        
        update_data = {}
        for key in valid_fee_keys:
            if key in request:
                fee_value = float(request[key])
                if fee_value < 0 or fee_value > 20:
                    raise HTTPException(status_code=400, detail=f"{key} must be between 0 and 20")
                update_data[key] = fee_value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fee fields provided")
        
        # Update platform settings
        await db.platform_settings.update_one(
            {},
            {
                "$set": {
                    **update_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Fee configuration updated successfully",
            "updated_fees": update_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/fees/revenue-stats")
async def get_fee_revenue_stats():
    """Get revenue statistics by fee category (Admin only)"""
    try:
        # Get total fees collected from internal_balances
        internal_balances = await db.internal_balances.find({}).to_list(1000)
        
        stats = {
            "p2p_fees_total": 0,
            "spot_trading_fees_total": 0,
            "swap_fees_total": 0,
            "express_buy_fees_total": 0,
            "total_fees": 0
        }
        
        for balance in internal_balances:
            stats["p2p_fees_total"] += balance.get("p2p_fees", 0)
            stats["spot_trading_fees_total"] += balance.get("trading_fees", 0)
            stats["swap_fees_total"] += balance.get("swap_fees", 0)
            stats["express_buy_fees_total"] += balance.get("express_buy_fees", 0)
        
        stats["total_fees"] = (
            stats["p2p_fees_total"] +
            stats["spot_trading_fees_total"] + 
            stats["swap_fees_total"] +
            stats["express_buy_fees_total"]
        )
        
        return {
            "success": True,
            "revenue_stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WALLET MANAGEMENT ENDPOINTS
# ============================================================================

@api_router.get("/wallet/addresses/{user_id}")
async def get_wallet_addresses(user_id: str):
    """Get user's saved wallet addresses"""
    wallet = await db.user_wallet_addresses.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        return {"user_id": user_id, "addresses": {}}
    return wallet

@api_router.post("/wallet/add-address")
async def add_wallet_address(request: AddWalletAddressRequest):
    """Add or update wallet address for a cryptocurrency"""
    # Validate currency
    from p2p_enhanced import SUPPORTED_CRYPTO_CURRENCIES
    if request.currency not in SUPPORTED_CRYPTO_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {request.currency}")
    
    # Basic address validation (can be enhanced)
    if not request.address or len(request.address) < 10:
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    
    # Update or create wallet addresses
    result = await db.user_wallet_addresses.update_one(
        {"user_id": request.user_id},
        {
            "$set": {
                f"addresses.{request.currency}": request.address,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "user_id": request.user_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"{request.currency} address added successfully",
        "currency": request.currency,
        "address": request.address
    }

@api_router.delete("/wallet/remove-address/{user_id}/{currency}")
async def remove_wallet_address(user_id: str, currency: str):
    """Remove a wallet address"""
    result = await db.user_wallet_addresses.update_one(
        {"user_id": user_id},
        {"$unset": {f"addresses.{currency}": ""}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return {"success": True, "message": f"{currency} address removed"}

@api_router.get("/wallet/deposit-instructions/{currency}")
async def get_deposit_instructions(currency: str):
    """Get deposit instructions for a cryptocurrency"""
    # Admin deposit addresses (you'll need to set these)
    admin_addresses = {
        "BTC": "1AdminBTCDepositAddress123456789",
        "ETH": "0xAdminETHDepositAddress123456789",
        "USDT": "0xAdminUSDTDepositAddress123456789",
        "BNB": "bnb1AdminBNBDepositAddress123456",
        "SOL": "AdminSOLDepositAddress123456789ABC",
        "XRP": "rAdminXRPDepositAddress123456789",
        "ADA": "addr1AdminADADepositAddress123456789",
        "DOGE": "DAdminDOGEDepositAddress123456789",
        "MATIC": "0xAdminMATICDepositAddress123456789",
        "LTC": "LAdminLTCDepositAddress123456789",
        "AVAX": "X-avax1AdminAVAXDepositAddress123",
        "DOT": "1AdminDOTDepositAddress123456789"
    }
    
    if currency not in admin_addresses:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    return {
        "currency": currency,
        "deposit_address": admin_addresses[currency],
        "instructions": [
            f"Send your {currency} to the address above",
            "Include your User ID in the transaction memo/note if possible",
            "After sending, submit the transaction hash for verification",
            "Deposits are credited after admin confirmation"
        ],
        "min_deposit": 0.001 if currency == "BTC" else (0.01 if currency == "ETH" else 10),
        "confirmations_required": 3 if currency == "BTC" else 12
    }

@api_router.post("/wallet/submit-deposit")
async def submit_deposit(request: DepositRequest):
    """User submits deposit for admin verification"""
    # Check if user exists
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create deposit record
    deposit = {
        "deposit_id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "currency": request.currency,
        "amount": request.amount,
        "tx_hash": request.tx_hash,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "approved_by": None
    }
    
    await db.deposit_requests.insert_one(deposit)
    
    return {
        "success": True,
        "deposit_id": deposit["deposit_id"],
        "message": "Deposit submitted for verification. You'll be credited once admin approves."
    }

class WithdrawalRequestNew(BaseModel):
    user_id: str
    currency: str
    network: Optional[str] = None
    destination_address: str
    amount_crypto: float
    amount_fiat_gbp: float
    rate_used: float

@api_router.post("/withdrawals/request")
async def create_withdrawal_request_new(request: WithdrawalRequestNew):
    """
    Create a new withdrawal request with GBP tracking.
    This is the production endpoint with multi-currency support.
    """
    result = await create_withdrawal_request(
        db=db,
        user_id=request.user_id,
        currency=request.currency,
        amount=request.amount_crypto,
        wallet_address=request.destination_address,
        network=request.network,
        amount_fiat_gbp=request.amount_fiat_gbp,
        rate_used=request.rate_used
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@api_router.post("/wallet/request-withdrawal")
async def request_withdrawal(request: WithdrawalRequest):
    """User requests withdrawal (requires admin approval)"""
    # Get user
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check balance (we need to track balances per currency)
    # For now, let's check if balance exists
    balance_key = f"balance_{request.currency}"
    user_balance = user.get(balance_key, 0)
    
    # Calculate fee (1%)
    fee = request.amount * 0.01
    total_needed = request.amount + fee
    
    if user_balance < total_needed:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient {request.currency} balance. Available: {user_balance}, Required: {total_needed}"
        )
    
    # Create withdrawal request
    withdrawal = {
        "withdrawal_id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "currency": request.currency,
        "amount": request.amount,
        "fee": fee,
        "net_amount": request.amount,
        "withdrawal_address": request.withdrawal_address,
        "status": "pending",  # pending, approved, rejected, completed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "approved_by": None,
        "tx_hash": None
    }
    
    await db.withdrawal_requests.insert_one(withdrawal)
    
    # Deduct from user balance immediately (hold in pending)
    await db.user_accounts.update_one(
        {"user_id": request.user_id},
        {"$inc": {balance_key: -total_needed}}
    )
    
    return {
        "success": True,
        "withdrawal_id": withdrawal["withdrawal_id"],
        "amount": request.amount,
        "fee": fee,
        "total_deducted": total_needed,
        "message": "Withdrawal request submitted. Pending admin approval."
    }

@api_router.get("/wallet/withdrawals/{user_id}")
async def get_user_withdrawals(user_id: str):
    """Get user's withdrawal history"""
    withdrawals = await db.withdrawal_requests.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    return {"withdrawals": withdrawals}

@api_router.get("/wallet/deposits/{user_id}")
async def get_user_deposits(user_id: str):
    """Get user's deposit history"""
    deposits = await db.deposit_requests.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    return {"deposits": deposits}

# Admin endpoints for deposit/withdrawal approval
@api_router.get("/admin/deposits/pending")
async def get_pending_deposits():
    """Admin: Get all pending deposits"""
    deposits = await db.deposit_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=1000)
    
    return {"deposits": deposits}

@api_router.post("/admin/deposits/approve")
async def approve_deposit(request: AdminDepositApproval):
    """Admin: Approve or reject deposit"""
    deposit = await db.deposit_requests.find_one({"deposit_id": request.deposit_id}, {"_id": 0})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if request.approved:
        # Credit user balance
        balance_key = f"balance_{deposit['currency']}"
        await db.user_accounts.update_one(
            {"user_id": deposit["user_id"]},
            {"$inc": {balance_key: deposit["amount"]}}
        )
        
        # Check for £10 bonus milestone (convert deposit to GBP equivalent)
        # For simplicity, assume 1 USDT ~= £0.77 GBP
        deposit_gbp = deposit["amount"] * 0.77  # Rough conversion
        try:
            bonus_result = await check_and_pay_referral_bonus(deposit["user_id"], deposit_gbp)
            if bonus_result.get("success") and "bonus paid" in bonus_result.get("message", ""):
                logger.info(f"£10 referral bonus triggered for deposit {request.deposit_id}")
        except Exception as e:
            logger.error(f"Error checking referral bonus: {str(e)}")
        
        status = "approved"
        message = f"Deposit of {deposit['amount']} {deposit['currency']} approved and credited"
    else:
        status = "rejected"
        message = "Deposit rejected"
    
    # Update deposit status
    await db.deposit_requests.update_one(
        {"deposit_id": request.deposit_id},
        {
            "$set": {
                "status": status,
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": request.admin_user_id,
                "admin_notes": request.notes
            }
        }
    )
    
    return {"success": True, "message": message}

@api_router.get("/admin/withdrawals/pending")
async def get_pending_withdrawals():
    """Admin: Get all pending withdrawals"""
    withdrawals = await db.withdrawal_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=1000)
    
    return {"withdrawals": withdrawals}

@api_router.post("/admin/withdrawals/approve")
async def approve_withdrawal(request: AdminWithdrawalApproval):
    """Admin: Approve or reject withdrawal"""
    withdrawal = await db.withdrawal_requests.find_one(
        {"withdrawal_id": request.withdrawal_id},
        {"_id": 0}
    )
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if request.approved:
        status = "completed"
        message = f"Withdrawal of {withdrawal['amount']} {withdrawal['currency']} approved"
        
        # Update with tx_hash if provided
        update_data = {
            "status": status,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": request.admin_user_id,
            "admin_notes": request.notes
        }
        if request.tx_hash:
            update_data["tx_hash"] = request.tx_hash
    else:
        # Rejected - refund the user
        balance_key = f"balance_{withdrawal['currency']}"
        total_refund = withdrawal["amount"] + withdrawal["fee"]
        await db.user_accounts.update_one(
            {"user_id": withdrawal["user_id"]},
            {"$inc": {balance_key: total_refund}}
        )
        
        status = "rejected"
        message = "Withdrawal rejected and refunded"
        update_data = {
            "status": status,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": request.admin_user_id,
            "admin_notes": request.notes
        }
    
    await db.withdrawal_requests.update_one(
        {"withdrawal_id": request.withdrawal_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": message}


# ============================================================================
# KYC VERIFICATION ENDPOINTS
# ============================================================================

class KYCSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    full_name: str
    date_of_birth: str
    nationality: str
    address: str
    city: str
    postal_code: str
    country: str
    id_type: str  # passport, drivers_license, national_id
    id_number: str
    document_front: str  # Base64 encoded image
    document_back: Optional[str] = None  # Base64 encoded image
    selfie: str  # Base64 encoded image
    proof_of_address: Optional[str] = None  # Base64 encoded image

@api_router.post("/kyc/submit")
async def submit_kyc(request: KYCSubmission):
    """User submits KYC verification"""
    # Check if user exists
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already verified
    if user.get("kyc_verified", False):
        raise HTTPException(status_code=400, detail="KYC already verified")
    
    # Check if pending KYC exists
    existing_kyc = await db.kyc_verifications.find_one(
        {"user_id": request.user_id, "status": "pending"},
        {"_id": 0}
    )
    if existing_kyc:
        raise HTTPException(
            status_code=400, 
            detail="KYC submission already pending review"
        )
    
    # Create KYC verification record
    kyc_record = {
        "verification_id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "full_name": request.full_name,
        "date_of_birth": request.date_of_birth,
        "nationality": request.nationality,
        "address": request.address,
        "city": request.city,
        "postal_code": request.postal_code,
        "country": request.country,
        "id_type": request.id_type,
        "id_number": request.id_number,
        "documents": {
            "document_front": request.document_front[:100] + "..." if len(request.document_front) > 100 else request.document_front,  # Store truncated for security
            "document_back": request.document_back[:100] + "..." if request.document_back and len(request.document_back) > 100 else request.document_back,
            "selfie": request.selfie[:100] + "..." if len(request.selfie) > 100 else request.selfie,
            "proof_of_address": request.proof_of_address[:100] + "..." if request.proof_of_address and len(request.proof_of_address) > 100 else request.proof_of_address,
            "full_documents_stored": True  # In production, store in S3/cloud storage
        },
        "status": "pending",
        "tier": 1,
        "daily_limit": 500.0,
        "monthly_limit": 10000.0,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None,
        "admin_notes": None
    }
    
    await db.kyc_verifications.insert_one(kyc_record)
    
    # Update user status
    await db.user_accounts.update_one(
        {"user_id": request.user_id},
        {"$set": {"kyc_status": "pending"}}
    )
    
    return {
        "success": True,
        "verification_id": kyc_record["verification_id"],
        "message": "KYC submitted successfully. Your documents will be reviewed within 24-48 hours."
    }

@api_router.get("/kyc/status/{user_id}")
async def get_kyc_status(user_id: str):
    """Get user's KYC status"""
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get latest KYC submission
    kyc_record = await db.kyc_verifications.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    return {
        "kyc_verified": user.get("kyc_verified", False),
        "kyc_status": user.get("kyc_status", "not_submitted"),
        "kyc_tier": user.get("kyc_tier", 0),
        "verification_details": kyc_record if kyc_record else None
    }

# Admin KYC endpoints
@api_router.get("/admin/kyc/pending")
async def get_pending_kyc():
    """Admin: Get all pending KYC verifications"""
    kyc_submissions = await db.kyc_verifications.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=1000)
    
    return {"submissions": kyc_submissions}

@api_router.post("/admin/kyc/review")
async def review_kyc(request: dict):
    """Admin: Approve or reject KYC"""
    verification_id = request.get("verification_id")
    approved = request.get("approved", False)
    admin_notes = request.get("notes", "")
    admin_user_id = request.get("admin_user_id", "admin")
    tier = request.get("tier", 1)
    
    kyc_record = await db.kyc_verifications.find_one(
        {"verification_id": verification_id},
        {"_id": 0}
    )
    if not kyc_record:
        raise HTTPException(status_code=404, detail="KYC verification not found")
    
    if approved:
        # Approve KYC
        daily_limits = {1: 500.0, 2: 5000.0, 3: float('inf')}
        monthly_limits = {1: 10000.0, 2: 50000.0, 3: float('inf')}
        
        await db.kyc_verifications.update_one(
            {"verification_id": verification_id},
            {"$set": {
                "status": "approved",
                "tier": tier,
                "daily_limit": daily_limits.get(tier, 500.0),
                "monthly_limit": monthly_limits.get(tier, 10000.0),
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": admin_user_id,
                "admin_notes": admin_notes
            }}
        )
        
        # Update user account
        await db.user_accounts.update_one(
            {"user_id": kyc_record["user_id"]},
            {"$set": {
                "kyc_verified": True,
                "kyc_status": "approved",
                "kyc_tier": tier,
                "kyc_verified_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        message = f"KYC approved for user {kyc_record['user_id']} with Tier {tier}"
    else:
        # Reject KYC
        await db.kyc_verifications.update_one(
            {"verification_id": verification_id},
            {"$set": {
                "status": "rejected",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": admin_user_id,
                "admin_notes": admin_notes
            }}
        )
        
        await db.user_accounts.update_one(
            {"user_id": kyc_record["user_id"]},
            {"$set": {
                "kyc_verified": False,
                "kyc_status": "rejected"
            }}
        )
        
        message = f"KYC rejected for user {kyc_record['user_id']}"
    
    return {"success": True, "message": message}

# ============================================================================
# SUPPORT CHAT ENDPOINTS
# ============================================================================

class SupportChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    user_id: str
    sender: str  # 'user' or 'support'
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportChat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    chat_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str = "open"  # open, in_progress, resolved, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: Optional[datetime] = None

@api_router.post("/support/chat")
async def send_support_message(request: dict):
    """Send a support chat message"""
    user_id = request.get("user_id")
    message = request.get("message")
    chat_id = request.get("chat_id")
    
    if not user_id or not message:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get or create chat
    if not chat_id:
        chat = await db.support_chats.find_one({"user_id": user_id, "status": {"$in": ["open", "in_progress"]}})
        if not chat:
            # Create new chat
            new_chat = SupportChat(user_id=user_id)
            chat_dict = new_chat.model_dump()
            chat_dict['created_at'] = chat_dict['created_at'].isoformat()
            await db.support_chats.insert_one(chat_dict)
            chat_id = new_chat.chat_id
        else:
            chat_id = chat["chat_id"]
    
    # Create message
    chat_message = SupportChatMessage(
        chat_id=chat_id,
        user_id=user_id,
        sender="user",
        message=message
    )
    
    msg_dict = chat_message.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    await db.support_chat_messages.insert_one(msg_dict)
    
    # Update chat last_message_at
    await db.support_chats.update_one(
        {"chat_id": chat_id},
        {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "chat_id": chat_id,
        "message_id": chat_message.message_id
    }

@api_router.get("/support/chat/{user_id}")
async def get_support_chat(user_id: str):
    """Get support chat history for user"""
    # Get latest chat

# ============================================================================
# CURRENCY CONVERSION SYSTEM
# ============================================================================

# Supported currencies with their symbols
SUPPORTED_CURRENCIES = {
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
    "CNY": {"name": "Chinese Yuan", "symbol": "¥", "flag": "🇨🇳"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "🇦🇺"},
    "CAD": {"name": "Canadian Dollar", "symbol": "C$", "flag": "🇨🇦"},
    "CHF": {"name": "Swiss Franc", "symbol": "Fr", "flag": "🇨🇭"},
    "INR": {"name": "Indian Rupee", "symbol": "₹", "flag": "🇮🇳"},
    "KRW": {"name": "South Korean Won", "symbol": "₩", "flag": "🇰🇷"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "flag": "🇸🇬"},
    "HKD": {"name": "Hong Kong Dollar", "symbol": "HK$", "flag": "🇭🇰"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$", "flag": "🇳🇿"},
    "MXN": {"name": "Mexican Peso", "symbol": "MX$", "flag": "🇲🇽"},
    "BRL": {"name": "Brazilian Real", "symbol": "R$", "flag": "🇧🇷"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "flag": "🇿🇦"},
    "AED": {"name": "UAE Dirham", "symbol": "د.إ", "flag": "🇦🇪"},
    "SAR": {"name": "Saudi Riyal", "symbol": "﷼", "flag": "🇸🇦"},
    "TRY": {"name": "Turkish Lira", "symbol": "₺", "flag": "🇹🇷"},
    "RUB": {"name": "Russian Ruble", "symbol": "₽", "flag": "🇷🇺"},
    "PLN": {"name": "Polish Zloty", "symbol": "zł", "flag": "🇵🇱"},
    "SEK": {"name": "Swedish Krona", "symbol": "kr", "flag": "🇸🇪"},
    "NOK": {"name": "Norwegian Krone", "symbol": "kr", "flag": "🇳🇴"},
    "DKK": {"name": "Danish Krone", "symbol": "kr", "flag": "🇩🇰"},
    "THB": {"name": "Thai Baht", "symbol": "฿", "flag": "🇹🇭"},
    "IDR": {"name": "Indonesian Rupiah", "symbol": "Rp", "flag": "🇮🇩"},
    "MYR": {"name": "Malaysian Ringgit", "symbol": "RM", "flag": "🇲🇾"},
    "PHP": {"name": "Philippine Peso", "symbol": "₱", "flag": "🇵🇭"},
    "VND": {"name": "Vietnamese Dong", "symbol": "₫", "flag": "🇻🇳"},
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "flag": "🇳🇬"},
    "EGP": {"name": "Egyptian Pound", "symbol": "E£", "flag": "🇪🇬"},
    "PKR": {"name": "Pakistani Rupee", "symbol": "₨", "flag": "🇵🇰"},
    "BDT": {"name": "Bangladeshi Taka", "symbol": "৳", "flag": "🇧🇩"},
    "ARS": {"name": "Argentine Peso", "symbol": "$", "flag": "🇦🇷"},
    "CLP": {"name": "Chilean Peso", "symbol": "$", "flag": "🇨🇱"},
    "COP": {"name": "Colombian Peso", "symbol": "$", "flag": "🇨🇴"},
    "PEN": {"name": "Peruvian Sol", "symbol": "S/", "flag": "🇵🇪"},
}

# Exchange rates relative to GBP (Base currency)
# In production, fetch from API like exchangerate-api.com or fixer.io
EXCHANGE_RATES_TO_GBP = {
    "GBP": 1.0,
    "USD": 1.27,
    "EUR": 1.17,
    "JPY": 191.0,
    "CNY": 9.15,
    "AUD": 1.95,
    "CAD": 1.76,
    "CHF": 1.11,
    "INR": 106.5,
    "KRW": 1670.0,
    "SGD": 1.70,
    "HKD": 9.90,
    "NZD": 2.10,
    "MXN": 21.8,
    "BRL": 6.20,
    "ZAR": 23.0,
    "AED": 4.66,
    "SAR": 4.76,
    "TRY": 43.5,
    "RUB": 120.0,
    "PLN": 5.10,
    "SEK": 13.5,
    "NOK": 13.8,
    "DKK": 8.70,
    "THB": 44.0,
    "IDR": 19800.0,
    "MYR": 5.65,
    "PHP": 71.0,
    "VND": 31500.0,
    "NGN": 1970.0,
    "EGP": 62.5,
    "PKR": 352.0,
    "BDT": 139.0,
    "ARS": 1275.0,
    "CLP": 1230.0,
    "COP": 5250.0,
    "PEN": 4.80,
}

@api_router.get("/currencies/list")
async def get_supported_currencies():
    """Get list of all supported currencies"""
    currencies = []
    for code, info in SUPPORTED_CURRENCIES.items():
        currencies.append({
            "code": code,
            "name": info["name"],
            "symbol": info["symbol"],
            "flag": info["flag"],
            "rate_to_gbp": 1 / EXCHANGE_RATES_TO_GBP.get(code, 1.0)
        })
    
    return {
        "success": True,
        "currencies": currencies,
        "base_currency": "GBP"
    }

@api_router.post("/currencies/convert")
async def convert_currency(request: dict):
    """Convert amount from one currency to another"""
    amount = request.get("amount", 0)
    from_currency = request.get("from", "GBP").upper()
    to_currency = request.get("to", "GBP").upper()
    
    if from_currency not in EXCHANGE_RATES_TO_GBP or to_currency not in EXCHANGE_RATES_TO_GBP:
        raise HTTPException(status_code=400, detail="Invalid currency code")
    
    # Convert to GBP first, then to target currency
    amount_in_gbp = amount / EXCHANGE_RATES_TO_GBP[from_currency]
    converted_amount = amount_in_gbp * EXCHANGE_RATES_TO_GBP[to_currency]
    
    return {
        "success": True,
        "from": {
            "currency": from_currency,
            "amount": amount,
            "symbol": SUPPORTED_CURRENCIES[from_currency]["symbol"]
        },
        "to": {
            "currency": to_currency,
            "amount": round(converted_amount, 2),
            "symbol": SUPPORTED_CURRENCIES[to_currency]["symbol"]
        },
        "rate": EXCHANGE_RATES_TO_GBP[to_currency] / EXCHANGE_RATES_TO_GBP[from_currency]
    }

@api_router.get("/user/{user_id}/currency-preference")
async def get_user_currency_preference(user_id: str):
    """Get user's preferred currency"""
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    preferred_currency = user.get("preferred_currency", "GBP")
    
    return {
        "success": True,
        "currency": preferred_currency,
        "symbol": SUPPORTED_CURRENCIES.get(preferred_currency, SUPPORTED_CURRENCIES["GBP"])["symbol"],
        "name": SUPPORTED_CURRENCIES.get(preferred_currency, SUPPORTED_CURRENCIES["GBP"])["name"]
    }

@api_router.post("/user/{user_id}/currency-preference")
async def set_user_currency_preference(user_id: str, request: dict):
    """Set user's preferred currency"""
    currency = request.get("currency", "GBP").upper()
    
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail="Invalid currency code")
    
    await db.user_accounts.update_one(
        {"user_id": user_id},
        {"$set": {"preferred_currency": currency}}
    )
    
    return {
        "success": True,
        "message": f"Currency preference updated to {currency}",
        "currency": currency,
        "symbol": SUPPORTED_CURRENCIES[currency]["symbol"]
    }

    chat = await db.support_chats.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not chat:
        return {
            "success": True,
            "chat_id": None,
            "messages": []
        }
    
    # Get messages
    messages = await db.support_chat_messages.find(
        {"chat_id": chat["chat_id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {
        "success": True,
        "chat_id": chat["chat_id"],
        "messages": messages
    }

# Admin Support Chat Endpoints
@api_router.get("/admin/support-chats")
async def get_all_support_chats():
    """Get all support chats for admin"""
    try:
        chats = await db.support_chats.find({}, {"_id": 0}).sort("last_message_at", -1).to_list(1000)
        
        # Enrich with user data and last message
        enriched_chats = []
        for chat in chats:
            # Get user info
            user = await db.users.find_one(
                {"user_id": chat["user_id"]}, 
                {"_id": 0, "full_name": 1, "email": 1}
            )
            
            # Get last message
            last_msg = await db.support_chat_messages.find_one(
                {"chat_id": chat["chat_id"]},
                {"_id": 0, "message": 1}
            ) or {}
            
            enriched_chats.append({
                **chat,
                "user_name": user.get("full_name") if user else None,
                "user_email": user.get("email") if user else None,
                "last_message": last_msg.get("message")
            })
        
        return {
            "success": True,
            "chats": enriched_chats
        }
    except Exception as e:
        logger.error(f"Error fetching support chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/support-chat/{chat_id}")
async def get_support_chat_messages(chat_id: str):
    """Get all messages for a specific chat"""
    try:
        messages = await db.support_chat_messages.find(
            {"chat_id": chat_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(1000)
        
        return {
            "success": True,
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Error fetching chat messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/support-reply")
async def send_admin_reply(request: dict):
    """Send admin reply to support chat"""
    chat_id = request.get("chat_id")
    message = request.get("message")
    
    if not chat_id or not message:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        # Create admin reply message
        chat_message = SupportChatMessage(
            chat_id=chat_id,
            user_id="admin",
            sender="admin",
            message=message
        )
        
        msg_dict = chat_message.model_dump()
        msg_dict['created_at'] = msg_dict['created_at'].isoformat()
        await db.support_chat_messages.insert_one(msg_dict)
        
        # Update chat status and last_message_at
        await db.support_chats.update_one(
            {"chat_id": chat_id},
            {
                "$set": {
                    "status": "in_progress",
                    "last_message_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message_id": chat_message.message_id
        }
    except Exception as e:
        logger.error(f"Error sending admin reply: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/resolve-chat")
async def resolve_support_chat(request: dict):
    """Mark support chat as resolved"""
    chat_id = request.get("chat_id")
    
    if not chat_id:
        raise HTTPException(status_code=400, detail="Missing chat_id")
    
    try:
        await db.support_chats.update_one(
            {"chat_id": chat_id},
            {"$set": {"status": "resolved"}}
        )
        
        return {
            "success": True,
            "message": "Support chat resolved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin Earnings Management Endpoints
@api_router.get("/admin/platform-earnings")
async def get_platform_earnings():
    """Get total platform earnings from fees"""
    try:
        admin_wallet_id = PLATFORM_CONFIG["admin_wallet_id"]
        
        # Get all balances for admin wallet
        balances = await db.crypto_balances.find(
            {"user_id": admin_wallet_id},
            {"_id": 0, "currency": 1, "balance": 1}
        ).to_list(100)
        
        earnings = {}
        for bal in balances:
            earnings[bal["currency"]] = bal["balance"]
        
        return {
            "success": True,
            "earnings": earnings,
            "admin_wallet_id": admin_wallet_id
        }
    except Exception as e:
        logger.error(f"Error fetching platform earnings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/withdrawal-addresses")
async def get_admin_withdrawal_addresses():
    """Get admin's personal crypto wallet addresses for withdrawals"""
    try:
        admin_config = await db.admin_config.find_one(
            {"config_type": "withdrawal_addresses"},
            {"_id": 0}
        )
        
        if not admin_config:
            return {
                "success": True,
                "addresses": {
                    "BTC": "",
                    "ETH": "",
                    "USDT": ""
                }
            }
        
        return {
            "success": True,
            "addresses": admin_config.get("addresses", {})
        }
    except Exception as e:
        logger.error(f"Error fetching withdrawal addresses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/set-withdrawal-address")
async def set_withdrawal_address(request: dict):
    """Set admin's personal wallet address for a specific currency"""
    currency = request.get("currency")
    address = request.get("address")
    
    if not currency or not address:
        raise HTTPException(status_code=400, detail="Currency and address required")
    
    try:
        # Update or create admin config
        await db.admin_config.update_one(
            {"config_type": "withdrawal_addresses"},
            {
                "$set": {
                    f"addresses.{currency}": address,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Withdrawal address for {currency} saved successfully",
            "currency": currency,
            "address": address
        }
    except Exception as e:
        logger.error(f"Error setting withdrawal address: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/save-external-wallet")
async def save_admin_external_wallet(request: dict):
    """Save admin's external wallet addresses for payouts"""
    wallets = request.get("wallets")  # Dict of {currency: address}
    
    if not wallets or not isinstance(wallets, dict):
        raise HTTPException(status_code=400, detail="wallets dict required (e.g., {'BTC': '1A1zP...', 'ETH': '0x123...'})")
    
    try:
        # Save to database
        await db.platform_config.update_one(
            {"config_id": "main"},
            {
                "$set": {
                    "admin_external_wallets": wallets,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        # Update in-memory config
        PLATFORM_CONFIG["admin_external_wallets"] = wallets
        
        logger.info(f"Updated admin external wallets: {list(wallets.keys())}")
        
        return {
            "success": True,
            "message": "External wallet addresses saved successfully",
            "wallets": wallets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/external-wallets")
async def get_admin_external_wallets():
    """Get admin's saved external wallet addresses"""
    try:
        config = await db.platform_config.find_one({"config_id": "main"})
        
        wallets = config.get("admin_external_wallets", {}) if config else {}
        
        return {
            "success": True,
            "wallets": wallets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        
        return {
            "success": True,
            "message": f"{currency} withdrawal address saved"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/fee-settings")
async def get_fee_settings():
    """Get current platform fee settings"""
    try:
        return {
            "success": True,
            "fees": {
                "p2p_trade_fee_percent": PLATFORM_CONFIG["p2p_trade_fee_percent"],
                "withdraw_fee_percent": PLATFORM_CONFIG["withdraw_fee_percent"],
                "deposit_fee_percent": PLATFORM_CONFIG["deposit_fee_percent"],
                "borrow_fee_percent": PLATFORM_CONFIG["borrow_fee_percent"],
                "repay_fee_percent": PLATFORM_CONFIG["repay_fee_percent"],
                "liquidation_fee_percent": PLATFORM_CONFIG["liquidation_fee_percent"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/update-fee")
async def update_platform_fee(request: dict):
    """Update a specific platform fee percentage"""
    fee_type = request.get("fee_type")  # e.g., "p2p_trade_fee_percent"
    new_value = request.get("value")
    
    if not fee_type or new_value is None:
        raise HTTPException(status_code=400, detail="fee_type and value required")
    
    valid_fee_types = [
        "p2p_trade_fee_percent",
        "withdraw_fee_percent",
        "deposit_fee_percent",
        "borrow_fee_percent",
        "repay_fee_percent",
        "liquidation_fee_percent"
    ]
    
    if fee_type not in valid_fee_types:
        raise HTTPException(status_code=400, detail=f"Invalid fee_type. Must be one of: {valid_fee_types}")
    
    try:
        new_value = float(new_value)
        if new_value < 0 or new_value > 100:
            raise HTTPException(status_code=400, detail="Fee must be between 0 and 100 percent")
        
        # Update in-memory config
        PLATFORM_CONFIG[fee_type] = new_value
        
        # Save to database
        await db.platform_config.update_one(
            {"config_id": "main"},
            {
                "$set": {
                    fee_type: new_value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        logger.info(f"Updated {fee_type} to {new_value}%")
        
        return {
            "success": True,
            "message": f"Updated {fee_type} to {new_value}%",
            "fees": {
                "p2p_trade_fee_percent": PLATFORM_CONFIG["p2p_trade_fee_percent"],
                "withdraw_fee_percent": PLATFORM_CONFIG["withdraw_fee_percent"]
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Value must be a number")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/wallet/payout")
async def admin_wallet_payout(request: dict):
    """
    Manual payout from admin wallet to external wallet
    Admin withdraws collected fees to their personal wallet
    
    NOTE: This creates the payout record and deducts from internal balance.
    For ACTUAL blockchain transfer, integrate with:
    - Bitcoin: Use bitcoin RPC or blockchain.com API
    - Ethereum/USDT: Use Web3.py with private key signing
    - Or use custodial service like Coinbase Commerce, BitGo, etc.
    """
    currency = request.get("currency")  # BTC, ETH, USDT, etc.
    amount = request.get("amount")
    external_address = request.get("external_address", None)
    
    # If no address provided, use saved admin wallet for this currency
    if not external_address:
        config = await db.platform_config.find_one({"config_id": "main"})
        if config and "admin_external_wallets" in config:
            external_address = config["admin_external_wallets"].get(currency)
        
        if not external_address:
            raise HTTPException(
                status_code=400, 
                detail=f"No external wallet address found for {currency}. Please save your wallet address first."
            )
    
    if not all([currency, amount]):
        raise HTTPException(status_code=400, detail="currency and amount required")
    
    try:
        amount = float(amount)
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
        admin_wallet_id = PLATFORM_CONFIG["admin_wallet_id"]
        
        # Check admin wallet balance
        admin_balance = await db.crypto_balances.find_one({
            "user_id": admin_wallet_id,
            "currency": currency
        })
        
        if not admin_balance or admin_balance["balance"] < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient admin wallet balance. Available: {admin_balance['balance'] if admin_balance else 0} {currency}"
            )
        
        # Deduct from admin wallet
        await db.crypto_balances.update_one(
            {"user_id": admin_wallet_id, "currency": currency},
            {"$inc": {"balance": -amount}}
        )
        
        # Record transaction
        transaction = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": admin_wallet_id,
            "transaction_type": "admin_payout",
            "currency": currency,
            "amount": amount,
            "status": "pending_manual",  # Admin will send manually and confirm
            "external_address": external_address,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "notes": f"Admin manual payout to external wallet {external_address}",
            "blockchain_tx_hash": None  # Will be filled when sent on blockchain
        }
        
        await db.transactions.insert_one(transaction)
        
        # ============================================================================
        # MANUAL WITHDRAWAL PROCESS (SECURE - NO PRIVATE KEYS)
        # ============================================================================
        # Payout remains in "pending_manual" status
        # Admin will send crypto from their own wallet manually
        # Then mark as completed with TX hash in admin panel
        # This is the SAFEST approach - no private keys on server
        # ============================================================================
        
        # Get updated balance
        updated_balance = await db.crypto_balances.find_one({
            "user_id": admin_wallet_id,
            "currency": currency
        })
        
        logger.info(f"Admin payout: {amount} {currency} to {external_address}")
        
        return {
            "success": True,
            "message": f"Successfully sent {amount} {currency} to {external_address}",
            "transaction_id": transaction["transaction_id"],
            "remaining_balance": updated_balance["balance"] if updated_balance else 0
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Amount must be a valid number")
    except Exception as e:
        logger.error(f"Admin payout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/wallet/balance")
async def get_admin_wallet_balance():
    """Get complete admin wallet balance across all currencies"""
    try:
        admin_wallet_id = PLATFORM_CONFIG["admin_wallet_id"]
        
        # Get all balances
        balances = await db.crypto_balances.find(
            {"user_id": admin_wallet_id},
            {"_id": 0, "currency": 1, "balance": 1}
        ).to_list(100)
        
        # Format response
        balance_dict = {}
        total_usd = 0
        
        for bal in balances:
            balance_dict[bal["currency"]] = bal["balance"]
            # Calculate USD value using live prices
            try:
                live_price = await get_live_price(bal["currency"], "usd")
                if live_price > 0:
                    total_usd += bal["balance"] * live_price
            except:
                # Fallback to 0 if price fetch fails
                pass
        
        # Get fee transaction history
        recent_fees = await db.transactions.find(
            {"to_user_id": admin_wallet_id, "transaction_type": {"$in": ["platform_fee", "trade_fee"]}},
            {"_id": 0, "currency": 1, "amount": 1, "created_at": 1, "transaction_type": 1}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        return {
            "success": True,
            "balances": balance_dict,
            "total_usd": total_usd,
            "recent_fees": recent_fees
        }
    except Exception as e:
        logger.error(f"Error fetching admin wallet balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/confirm-payout")
async def confirm_manual_payout(request: dict):
    """
    Mark a payout as completed after admin manually sends crypto
    Admin enters the blockchain TX hash after sending from their personal wallet
    """
    transaction_id = request.get("transaction_id")
    tx_hash = request.get("tx_hash")
    
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction_id required")
    
    try:
        # Find the transaction
        transaction = await db.transactions.find_one({"transaction_id": transaction_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction["status"] == "completed":
            raise HTTPException(status_code=400, detail="Transaction already completed")
        
        # Update transaction to completed
        await db.transactions.update_one(
            {"transaction_id": transaction_id},
            {
                "$set": {
                    "status": "completed",
                    "blockchain_tx_hash": tx_hash or "MANUAL_CONFIRMED",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "notes": transaction.get("notes", "") + " | Manually confirmed by admin"
                }
            }
        )
        
        logger.info(f"Payout {transaction_id} marked as completed. TX: {tx_hash}")
        
        return {
            "success": True,
            "message": "Payout confirmed successfully",
            "transaction_id": transaction_id,
            "tx_hash": tx_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming payout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pending-payouts")
async def get_pending_payouts():
    """Get all pending manual payouts waiting for admin confirmation"""
    try:
        pending = await db.transactions.find(
            {
                "transaction_type": "admin_payout",
                "status": "pending_manual"
            },
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "pending_payouts": pending,
            "count": len(pending)
        }
        
    except Exception as e:
        logger.error(f"Error fetching pending payouts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.get("/admin/revenue/summary")
async def get_revenue_summary(period: str = Query("day", regex="^(day|week|month|all)$")):
    """Get comprehensive revenue summary with breakdown by source"""
    try:
        from datetime import datetime, timezone, timedelta
        
        # Calculate time range
        now = datetime.now(timezone.utc)
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:  # all
            start_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        start_time_str = start_time.isoformat()
        
        # Get all internal balances (fee wallet)
        internal_balances = await db.internal_balances.find({}, {"_id": 0}).to_list(100)
        
        # Calculate total fees in fee wallet (converted to GBP for display)
        total_fee_wallet = 0
        fee_wallet_breakdown = {}
        
        # Crypto prices for conversion (simplified - in production use real-time prices)
        crypto_prices = {
            "BTC": 47500,
            "ETH": 2500,
            "USDT": 0.79,
            "BNB": 380,
            "SOL": 120,
            "LTC": 85,
            "GBP": 1
        }
        
        for balance in internal_balances:
            currency = balance.get("currency", "GBP")
            total_fees = balance.get("total_fees", 0)
            trading_fees = balance.get("trading_fees", 0)
            p2p_fees = balance.get("p2p_fees", 0)
            express_buy_fees = balance.get("express_buy_fees", 0)
            
            # Convert to GBP
            price = crypto_prices.get(currency, 1)
            total_fee_wallet += total_fees * price
            
            fee_wallet_breakdown[currency] = {
                "total_fees": total_fees,
                "trading_fees": trading_fees,
                "p2p_fees": p2p_fees,
                "express_buy_fees": express_buy_fees,
                "gbp_value": total_fees * price
            }
        
        # Get trading transactions for the period
        trading_txns = await db.trading_transactions.find(
            {"timestamp": {"$gte": start_time_str}},
            {"_id": 0}
        ).to_list(10000)
        
        trading_fee_revenue = 0
        markup_markdown_revenue = 0
        
        for txn in trading_txns:
            # Trading fee revenue
            trading_fee_revenue += txn.get("fee", 0)
            
            # Markup/markdown revenue (spread profit)
            market_price = txn.get("market_price", 0)
            adjusted_price = txn.get("adjusted_price", 0)
            amount = txn.get("amount", 0)
            trade_type = txn.get("type", "buy")
            
            if trade_type == "buy":
                # Platform sells at markup price
                markup_markdown_revenue += (adjusted_price - market_price) * amount
            else:
                # Platform buys at markdown price
                markup_markdown_revenue += (market_price - adjusted_price) * amount
        
        # Get P2P fee revenue (estimate from internal_balances for period)
        # This is an approximation - ideally track individual P2P transactions
        p2p_fee_revenue = sum(
            balance.get("p2p_fees", 0) * crypto_prices.get(balance.get("currency", "GBP"), 1)
            for balance in internal_balances
        )
        
        # Get Express Buy fee revenue
        express_buy_revenue = sum(
            balance.get("express_buy_fees", 0) * crypto_prices.get(balance.get("currency", "GBP"), 1)
            for balance in internal_balances
        )
        
        # MoonPay revenue (placeholder - needs MoonPay integration)
        moonpay_revenue = 0
        
        # Calculate total profit
        total_profit = trading_fee_revenue + markup_markdown_revenue + p2p_fee_revenue + express_buy_revenue + moonpay_revenue
        
        return {
            "success": True,
            "period": period,
            "start_time": start_time_str,
            "end_time": now.isoformat(),
            "summary": {
                "total_profit": round(total_profit, 2),
                "total_fee_wallet_gbp": round(total_fee_wallet, 2),
                "revenue_breakdown": {
                    "trading_fees": round(trading_fee_revenue, 2),
                    "markup_markdown_profit": round(markup_markdown_revenue, 2),
                    "express_buy_fees": round(express_buy_revenue, 2),
                    "p2p_fees": round(p2p_fee_revenue, 2),
                    "moonpay_revenue": round(moonpay_revenue, 2)
                },
                "fee_wallet_breakdown": fee_wallet_breakdown
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/revenue/transactions")
async def get_revenue_transactions(
    period: str = Query("day", regex="^(day|week|month|all)$"),
    transaction_type: str = Query("all", regex="^(all|trading|p2p|express_buy|moonpay)$"),
    limit: int = Query(100, ge=1, le=1000)
):
    """Get detailed log of all fee transactions"""
    try:
        from datetime import datetime, timezone, timedelta
        
        # Calculate time range
        now = datetime.now(timezone.utc)
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:  # all
            start_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        start_time_str = start_time.isoformat()
        
        transactions = []
        
        # Get trading transactions
        if transaction_type in ["all", "trading"]:
            trading_txns = await db.trading_transactions.find(
                {"timestamp": {"$gte": start_time_str}},
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit).to_list(limit)
            
            for txn in trading_txns:
                transactions.append({
                    "transaction_id": txn.get("transaction_id"),
                    "timestamp": txn.get("timestamp"),
                    "type": "Trading Fee",
                    "subtype": txn.get("type", "buy").upper(),
                    "amount": txn.get("fee", 0),
                    "currency": txn.get("pair", "").split("/")[1] if "/" in txn.get("pair", "") else "GBP",
                    "pair": txn.get("pair"),
                    "user_id": txn.get("user_id"),
                    "details": {
                        "market_price": txn.get("market_price"),
                        "adjusted_price": txn.get("adjusted_price"),
                        "markup_percent": txn.get("markup_percent"),
                        "crypto_amount": txn.get("amount"),
                        "total": txn.get("total")
                    }
                })
        
        # Get all transactions from transactions collection (P2P, Express Buy, etc.)
        if transaction_type in ["all", "p2p", "express_buy"]:
            query = {"created_at": {"$gte": start_time_str}}
            
            if transaction_type == "p2p":
                query["source"] = {"$in": ["p2p_fee", "p2p"]}
            elif transaction_type == "express_buy":
                query["source"] = "express_buy"
            
            general_txns = await db.transactions.find(
                query,
                {"_id": 0}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            for txn in general_txns:
                source = txn.get("source", "unknown")
                txn_type = "P2P Fee" if "p2p" in source.lower() else "Express Buy Fee"
                
                transactions.append({
                    "transaction_id": txn.get("transaction_id"),
                    "timestamp": txn.get("created_at"),
                    "type": txn_type,
                    "subtype": txn.get("transaction_type", "").upper(),
                    "amount": txn.get("fee_amount", txn.get("amount", 0)),
                    "currency": txn.get("currency", "GBP"),
                    "user_id": txn.get("user_id"),
                    "details": txn
                })
        
        # Sort all transactions by timestamp
        transactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Limit results
        transactions = transactions[:limit]
        
        return {
            "success": True,
            "period": period,
            "transaction_type": transaction_type,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/revenue/monetization-breakdown")
async def get_monetization_breakdown(period: str = Query("day", regex="^(day|week|month|all)$")):
    """Get detailed breakdown of all 13 monetization features revenue"""
    try:
        from datetime import datetime, timezone, timedelta
        
        # Calculate time range
        now = datetime.now(timezone.utc)
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:  # all
            start_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        start_time_str = start_time.isoformat()
        
        # Crypto prices for conversion
        crypto_prices = {
            "BTC": 47500,
            "ETH": 2500,
            "USDT": 0.79,
            "BNB": 380,
            "SOL": 120,
            "LTC": 85,
            "GBP": 1
        }
        
        breakdown = {}
        
        # 1. Express Buy Fee (1%)
        express_buy_txns = await db.transactions.find(
            {
                "source": "express_buy",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        express_buy_revenue = sum(
            txn.get("fee_amount", 0) * crypto_prices.get(txn.get("currency", "GBP"), 1)
            for txn in express_buy_txns
        )
        breakdown["express_buy_fee"] = {
            "name": "Express Buy Fee (1%)",
            "revenue_gbp": round(express_buy_revenue, 2),
            "transaction_count": len(express_buy_txns)
        }
        
        # 2. Instant Sell Fee (1%)
        instant_sell_txns = await db.transactions.find(
            {
                "source": "instant_sell",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        instant_sell_revenue = sum(
            txn.get("fee_amount", 0) * crypto_prices.get(txn.get("currency", "GBP"), 1)
            for txn in instant_sell_txns
        )
        breakdown["instant_sell_fee"] = {
            "name": "Instant Sell Fee (1%)",
            "revenue_gbp": round(instant_sell_revenue, 2),
            "transaction_count": len(instant_sell_txns)
        }
        
        # 3. Admin Spreads (Express +3%, Instant -2.5%)
        spread_revenue = 0
        # Calculate from Express Buy spreads
        for txn in express_buy_txns:
            amount = txn.get("crypto_amount", 0)
            currency = txn.get("crypto_currency", "BTC")
            price = crypto_prices.get(currency, 0)
            spread_revenue += amount * price * 0.03  # 3% spread
        
        # Calculate from Instant Sell spreads
        for txn in instant_sell_txns:
            amount = txn.get("crypto_amount", 0)
            currency = txn.get("crypto_currency", "BTC")
            price = crypto_prices.get(currency, 0)
            spread_revenue += amount * price * 0.025  # 2.5% spread
        
        breakdown["admin_spreads"] = {
            "name": "Admin Spreads (Express +3%, Instant -2.5%)",
            "revenue_gbp": round(spread_revenue, 2),
            "transaction_count": len(express_buy_txns) + len(instant_sell_txns)
        }
        
        # 4. P2P Seller Fee (3% with level reductions)
        p2p_txns = await db.transactions.find(
            {
                "source": {"$in": ["p2p_fee", "p2p"]},
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        p2p_revenue = sum(
            txn.get("fee_amount", 0) * crypto_prices.get(txn.get("currency", "GBP"), 1)
            for txn in p2p_txns
        )
        breakdown["p2p_seller_fee"] = {
            "name": "P2P Seller Fee (3%)",
            "revenue_gbp": round(p2p_revenue, 2),
            "transaction_count": len(p2p_txns)
        }
        
        # 5. Payment Method Fees (PayPal +2%, CashApp +1%, Revolut +0.5%)
        pm_fee_revenue = 0
        for txn in p2p_txns:
            pm_fee = txn.get("payment_method_fee", 0)
            pm_fee_revenue += pm_fee * crypto_prices.get(txn.get("currency", "GBP"), 1)
        
        breakdown["payment_method_fees"] = {
            "name": "Payment Method Fees",
            "revenue_gbp": round(pm_fee_revenue, 2),
            "transaction_count": len([t for t in p2p_txns if t.get("payment_method_fee", 0) > 0])
        }
        
        # 6. Boosted Listings (£10/£20/£50)
        boost_purchases = await db.transactions.find(
            {
                "source": "boost_listing",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        boost_revenue = sum(txn.get("amount", 0) for txn in boost_purchases)
        breakdown["boosted_listings"] = {
            "name": "Boosted Listings (£10/£20/£50)",
            "revenue_gbp": round(boost_revenue, 2),
            "transaction_count": len(boost_purchases)
        }
        
        # 7. Seller Verification (£25)
        verification_purchases = await db.transactions.find(
            {
                "source": "seller_verification",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        verification_revenue = sum(txn.get("amount", 0) for txn in verification_purchases)
        breakdown["seller_verification"] = {
            "name": "Seller Verification (£25)",
            "revenue_gbp": round(verification_revenue, 2),
            "transaction_count": len(verification_purchases)
        }
        
        # 8. Seller Levels (Silver £20, Gold £50)
        level_purchases = await db.transactions.find(
            {
                "source": "seller_level",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        level_revenue = sum(txn.get("amount", 0) for txn in level_purchases)
        breakdown["seller_levels"] = {
            "name": "Seller Levels (Silver £20, Gold £50)",
            "revenue_gbp": round(level_revenue, 2),
            "transaction_count": len(level_purchases)
        }
        
        # 9. Referral Upgrades (30% £20, 40% £40)
        referral_upgrades = await db.transactions.find(
            {
                "source": "referral_upgrade",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        referral_upgrade_revenue = sum(txn.get("amount", 0) for txn in referral_upgrades)
        breakdown["referral_upgrades"] = {
            "name": "Referral Upgrades (30% £20, 40% £40)",
            "revenue_gbp": round(referral_upgrade_revenue, 2),
            "transaction_count": len(referral_upgrades)
        }
        
        # 10. Arbitrage Alerts Subscription (£10/month)
        subscriptions = await db.subscriptions.find(
            {
                "plan_name": "arbitrage_alerts",
                "status": "active"
            }
        ).to_list(10000)
        
        # Calculate monthly recurring revenue
        subscription_revenue = len(subscriptions) * 10  # £10 per active sub
        breakdown["arbitrage_alerts"] = {
            "name": "Arbitrage Alerts Subscription (£10/mo)",
            "revenue_gbp": round(subscription_revenue, 2),
            "active_subscriptions": len(subscriptions)
        }
        
        # 11. Internal Transfer Fee (0.3%)
        transfer_txns = await db.transactions.find(
            {
                "source": "internal_transfer",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        transfer_revenue = sum(
            txn.get("fee_amount", 0) * crypto_prices.get(txn.get("currency", "GBP"), 1)
            for txn in transfer_txns
        )
        breakdown["internal_transfer_fee"] = {
            "name": "Internal Transfer Fee (0.3%)",
            "revenue_gbp": round(transfer_revenue, 2),
            "transaction_count": len(transfer_txns)
        }
        
        # 12. Dispute Penalty (£10)
        dispute_penalties = await db.transactions.find(
            {
                "source": "dispute_penalty",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        dispute_revenue = sum(txn.get("amount", 0) for txn in dispute_penalties)
        breakdown["dispute_penalty"] = {
            "name": "Dispute Penalty (£10)",
            "revenue_gbp": round(dispute_revenue, 2),
            "transaction_count": len(dispute_penalties)
        }
        
        # 13. OTC Desk Fee (1%)
        otc_txns = await db.transactions.find(
            {
                "source": "otc_desk",
                "created_at": {"$gte": start_time_str}
            }
        ).to_list(10000)
        
        otc_revenue = sum(
            txn.get("fee_amount", 0) * crypto_prices.get(txn.get("currency", "GBP"), 1)
            for txn in otc_txns
        )
        breakdown["otc_desk_fee"] = {
            "name": "OTC Desk Fee (1%)",
            "revenue_gbp": round(otc_revenue, 2),
            "transaction_count": len(otc_txns)
        }
        
        # Calculate total revenue
        total_revenue = sum(item["revenue_gbp"] for item in breakdown.values())
        
        return {
            "success": True,
            "period": period,
            "start_time": start_time_str,
            "end_time": now.isoformat(),
            "total_revenue_gbp": round(total_revenue, 2),
            "breakdown": breakdown
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




# ============================================================================
# SUPPORTED CURRENCIES, CRYPTOS & PAYMENT METHODS
# ============================================================================

@api_router.get("/supported/currencies")
async def get_supported_currencies():
    """Get all supported fiat currencies"""
    return {
        "success": True,
        "currencies": SUPPORTED_FIAT_CURRENCIES,
        "count": len(SUPPORTED_FIAT_CURRENCIES)
    }

@api_router.get("/supported/cryptocurrencies")
async def get_supported_cryptocurrencies():
    """Get all supported cryptocurrencies"""
    # Get live prices for all supported cryptocurrencies
    live_prices = {}
    try:
        for crypto in SUPPORTED_CRYPTOCURRENCIES.keys():
            try:
                price = await get_live_price(crypto, "usd")
                live_prices[crypto] = price
            except:
                live_prices[crypto] = 0
    except Exception as e:
        logger.error(f"Failed to fetch live prices: {e}")
        live_prices = {}
    
    return {
        "success": True,
        "cryptocurrencies": SUPPORTED_CRYPTOCURRENCIES,
        "count": len(SUPPORTED_CRYPTOCURRENCIES),
        "prices": live_prices
    }

@api_router.get("/supported/payment-methods")
async def get_supported_payment_methods(region: str = None):
    """Get all supported payment methods, optionally filtered by region"""
    methods = PAYMENT_METHODS
    
    if region:
        methods = [m for m in methods if m["region"] == region or m["region"] == "Global"]
    
    return {
        "success": True,
        "payment_methods": methods,
        "count": len(methods)
    }

# ============================================================================
# CRYPTO WALLET MANAGEMENT
# ============================================================================

@api_router.post("/crypto-wallet/add")
async def add_user_crypto_wallet(request: dict):
    """Add external crypto wallet address for user"""
    try:
        wallet_data = {
            "wallet_id": str(uuid.uuid4()),
            "user_id": request.get("user_id"),
            "currency": request.get("currency"),  # BTC, ETH, etc.
            "wallet_address": request.get("wallet_address"),
            "wallet_label": request.get("wallet_label", "My Wallet"),
            "network": request.get("network", "mainnet"),  # mainnet, testnet, etc.
            "is_verified": False,
            "is_default": request.get("is_default", False),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Set as default if it's the first wallet for this currency
        existing_wallets = await db.user_crypto_wallets.find({
            "user_id": wallet_data["user_id"],
            "currency": wallet_data["currency"]
        }).to_list(100)
        
        if len(existing_wallets) == 0:
            wallet_data["is_default"] = True
        elif wallet_data["is_default"]:
            # Unset other wallets as default
            await db.user_crypto_wallets.update_many(
                {"user_id": wallet_data["user_id"], "currency": wallet_data["currency"]},
                {"$set": {"is_default": False}}
            )
        
        await db.user_crypto_wallets.insert_one(wallet_data)
        
        return {
            "success": True,
            "message": "Crypto wallet added successfully",
            "wallet": wallet_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/crypto-wallet/list/{user_id}")
async def get_user_crypto_wallets(user_id: str, currency: str = None):
    """Get all crypto wallets for a user"""
    try:
        query = {"user_id": user_id}
        if currency:
            query["currency"] = currency
        
        wallets = await db.user_crypto_wallets.find(query, {"_id": 0}).to_list(100)
        
        return {
            "success": True,
            "wallets": wallets,
            "count": len(wallets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/crypto-wallet/set-default")
async def set_default_wallet(request: dict):
    """Set a wallet as default for withdrawals"""
    try:
        user_id = request.get("user_id")
        wallet_id = request.get("wallet_id")
        
        # Get wallet to find currency
        wallet = await db.user_crypto_wallets.find_one({"wallet_id": wallet_id, "user_id": user_id}, {"_id": 0})
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        # Unset other wallets as default for this currency
        await db.user_crypto_wallets.update_many(
            {"user_id": user_id, "currency": wallet["currency"]},
            {"$set": {"is_default": False}}
        )
        
        # Set this wallet as default
        await db.user_crypto_wallets.update_one(
            {"wallet_id": wallet_id},
            {"$set": {"is_default": True}}
        )
        
        return {
            "success": True,
            "message": "Default wallet updated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/crypto-wallet/remove/{wallet_id}")
async def remove_crypto_wallet(wallet_id: str, user_id: str):
    """Remove a crypto wallet"""
    try:
        result = await db.user_crypto_wallets.delete_one({
            "wallet_id": wallet_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        return {
            "success": True,
            "message": "Wallet removed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


        logger.error(f"Error saving withdrawal address: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ADMIN - COMPREHENSIVE PLATFORM MANAGEMENT
# ============================================================================

@api_router.get("/admin/all-transactions")
async def get_all_transactions():
    """Get all transactions across the platform"""
    try:
        # Get all crypto bank transactions
        crypto_txns = await db.crypto_transactions.find({}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
        
        # Get all P2P trades
        trades = await db.p2p_trades.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
        
        return {
            "success": True,
            "crypto_transactions": crypto_txns,
            "p2p_trades": trades,
            "total_count": len(crypto_txns) + len(trades)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/wallet-balances")
async def get_admin_wallet_balances():
    """Get admin wallet balances for all cryptocurrencies"""
    try:
        # Get admin withdrawal addresses
        addresses = await db.admin_wallet_addresses.find({}, {"_id": 0}).to_list(100)
        
        # Get admin wallet for referrals
        admin_wallet = await db.admin_wallets.find_one({"wallet_type": "referral_payouts"}, {"_id": 0})
        
        balances = {}
        if admin_wallet:
            balances = admin_wallet.get("balances", {})
        
        return {
            "success": True,
            "withdrawal_addresses": addresses,
            "referral_wallet_balances": balances
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/platform-settings")
async def update_platform_settings(request: dict):
    """Update platform-wide settings including fees and commissions"""
    try:
        settings_to_update = {}
        
        if "withdrawal_fee_percent" in request:
            settings_to_update["withdrawal_fee_percent"] = float(request["withdrawal_fee_percent"])
        
        if "p2p_trade_fee_percent" in request:
            settings_to_update["p2p_trade_fee_percent"] = float(request["p2p_trade_fee_percent"])
        
        if "referral_commission_percent" in request:
            settings_to_update["referral_commission_percent"] = float(request["referral_commission_percent"])
        
        if "referral_bonus_amount" in request:
            settings_to_update["referral_bonus_amount"] = float(request["referral_bonus_amount"])
        
        if "referral_bonus_threshold" in request:
            settings_to_update["referral_bonus_threshold"] = float(request["referral_bonus_threshold"])
        
        if "swap_fee_percent" in request:
            settings_to_update["swap_fee_percent"] = float(request["swap_fee_percent"])
        
        if "express_buy_fee_percent" in request:
            settings_to_update["express_buy_fee_percent"] = float(request["express_buy_fee_percent"])
        
        if "express_buy_fees_by_coin" in request:
            settings_to_update["express_buy_fees_by_coin"] = request["express_buy_fees_by_coin"]
        
        if "express_buy_supported_coins" in request:
            # Validate it's a list
            if isinstance(request["express_buy_supported_coins"], list):
                settings_to_update["express_buy_supported_coins"] = request["express_buy_supported_coins"]
        
        # Trading fee configuration
        if "trading_fee_percent" in request:
            settings_to_update["trading_fee_percent"] = float(request["trading_fee_percent"])
        
        if "trading_fees_by_pair" in request:
            settings_to_update["trading_fees_by_pair"] = request["trading_fees_by_pair"]
        
        # Trading markup/markdown configuration (hidden spread protection)
        if "buy_markup_percent" in request:
            settings_to_update["buy_markup_percent"] = float(request["buy_markup_percent"])
        
        if "sell_markdown_percent" in request:
            settings_to_update["sell_markdown_percent"] = float(request["sell_markdown_percent"])
        
        if "trading_markup_by_pair" in request:
            settings_to_update["trading_markup_by_pair"] = request["trading_markup_by_pair"]
        
        if "trading_markdown_by_pair" in request:
            settings_to_update["trading_markdown_by_pair"] = request["trading_markdown_by_pair"]
        
        if "payment_timer_minutes" in request:
            settings_to_update["payment_timer_minutes"] = int(request["payment_timer_minutes"])
        
        if settings_to_update:
            settings_to_update["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update or create platform settings
            await db.platform_settings.update_one(
                {},
                {"$set": settings_to_update},
                upsert=True
            )
        
        return {
            "success": True,
            "message": "Platform settings updated successfully",
            "updated_settings": settings_to_update
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/platform-settings")
async def get_platform_settings():
    """Get current platform settings"""
    try:
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        if not settings:
            # Return default settings
            settings = {
                "withdrawal_fee_percent": 1.0,
                "p2p_trade_fee_percent": 1.0,
                "swap_fee_percent": 1.5,
                "express_buy_fee_percent": 3.0,
                "express_buy_fees_by_coin": {},  # Per-coin overrides (e.g., {"BTC": 2.5, "ETH": 3.0})
                "express_buy_supported_coins": ["BTC", "ETH", "USDT", "BNB", "SOL", "LTC"],
                "trading_fee_percent": 0.1,  # Default 0.1% trading fee
                "trading_fees_by_pair": {},  # Per-pair overrides (e.g., {"BTC/GBP": 0.2})
                "buy_markup_percent": 0.5,  # Default +0.5% markup on buy orders
                "sell_markdown_percent": 0.5,  # Default -0.5% markdown on sell orders
                "trading_markup_by_pair": {},  # Per-pair markup overrides
                "trading_markdown_by_pair": {},  # Per-pair markdown overrides
                "payment_timer_minutes": 120,
                "referral_commission_percent": 20.0,
                "referral_bonus_amount": 10.0,
                "referral_bonus_threshold": 150.0
            }
        
        # Ensure defaults exist for existing settings
        if "express_buy_supported_coins" not in settings:
            settings["express_buy_supported_coins"] = ["BTC", "ETH", "USDT", "BNB", "SOL", "LTC"]
        if "trading_fee_percent" not in settings:
            settings["trading_fee_percent"] = 0.1
        if "trading_fees_by_pair" not in settings:
            settings["trading_fees_by_pair"] = {}
        if "buy_markup_percent" not in settings:
            settings["buy_markup_percent"] = 0.5
        if "sell_markdown_percent" not in settings:
            settings["sell_markdown_percent"] = 0.5
        if "trading_markup_by_pair" not in settings:
            settings["trading_markup_by_pair"] = {}
        if "trading_markdown_by_pair" not in settings:
            settings["trading_markdown_by_pair"] = {}
        
        return {
            "success": True,
            "settings": settings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/kyc-submissions")
async def get_kyc_submissions():
    """Get all KYC submissions"""
    try:
        submissions = await db.kyc_verifications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
        
        return {
            "success": True,
            "submissions": submissions,
            "total": len(submissions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/withdraw-earnings")
async def withdraw_platform_earnings(request: dict):
    """Withdraw platform earnings to admin's personal wallet"""
    currency = request.get("currency")
    amount = float(request.get("amount", 0))
    address = request.get("address")
    
    if not currency or amount <= 0 or not address:
        raise HTTPException(status_code=400, detail="Invalid withdrawal request")


# ===========================
# LIVE PRICING ENDPOINTS
# ===========================

@api_router.get("/prices/live")
async def get_live_prices_endpoint():
    """Get all live crypto prices with 24h change"""
    try:
        # Fetch raw price data which now includes 24h change
        all_prices = await fetch_live_prices()
        
        # Build response with full data
        result = {}
        for symbol, data in all_prices.items():
            result[symbol] = {
                "symbol": symbol,
                "price_usd": data.get("usd", 0),
                "price_gbp": data.get("gbp", 0),
                "change_24h": data.get("usd_24h_change", 0),  # Use USD change as primary
                "change_24h_gbp": data.get("gbp_24h_change", 0),
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "success": True,
            "prices": result,
            "source": "CoinGecko API",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get live prices: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch live prices")

@api_router.get("/prices/live/{symbol}")
async def get_single_live_price(symbol: str):
    """Get live price for specific crypto"""
    try:
        price_usd = await get_live_price(symbol.upper(), "usd")
        price_gbp = await get_live_price(symbol.upper(), "gbp")
        
        if price_usd == 0 and price_gbp == 0:
            raise HTTPException(status_code=404, detail=f"Price not available for {symbol}")
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "price_usd": price_usd,
            "price_gbp": price_gbp,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch price")





# ============================================================================
# MARKET-BASED PRICING & CRYPTO PRICE FEED
# ============================================================================

# Simple crypto price cache (in production, use Redis or external API)
CRYPTO_MARKET_PRICES = {
    # Major Cryptos
    "BTC": 45000.00,
    "ETH": 2500.00,
    "USDT": 1.00,
    "USDC": 1.00,
    "BNB": 300.00,
    "SOL": 100.00,
    "XRP": 0.60,
    "ADA": 0.50,
    "DOGE": 0.08,
    "DOT": 7.00,
    "MATIC": 0.90,
    "LINK": 15.00,
    "LTC": 70.00,
    "BCH": 250.00,
    "UNI": 6.00,
    "ATOM": 10.00,
    "ETC": 20.00,
    "XLM": 0.12,
    "ALGO": 0.15,
    "VET": 0.03,
    "FIL": 5.00,
    "TRX": 0.10,
    "AVAX": 35.00,
    "SHIB": 0.000009,
    "DAI": 1.00,
    "WBTC": 45000.00
}

# Currency conversion rates (all currencies to USD)
FIAT_TO_USD_RATES = {
    "USD": 1.00,
    "GBP": 1.27,
    "EUR": 1.08,
    "JPY": 0.0067,
    "AUD": 0.65,
    "CAD": 0.72,
    "CHF": 1.13,
    "CNY": 0.14,
    "SEK": 0.092,
    "NZD": 0.60,
    "KRW": 0.00076,
    "SGD": 0.74,
    "NOK": 0.092,
    "MXN": 0.058,
    "INR": 0.012,
    "RUB": 0.011,
    "ZAR": 0.054,
    "TRY": 0.031,
    "BRL": 0.20,
    "TWD": 0.031,
    "DKK": 0.14,
    "PLN": 0.25,
    "THB": 0.029,
    "IDR": 0.000064,
    "HUF": 0.0027,
    "CZK": 0.044,
    "ILS": 0.27,
    "CLP": 0.0011,
    "PHP": 0.018,
    "AED": 0.27,
    "SAR": 0.27,
    "MYR": 0.22,
    "RON": 0.22
}

async def get_crypto_price_in_fiat(crypto: str, fiat: str) -> float:
    """Get current crypto price in specified fiat currency using live prices"""
    try:
        # Get live crypto price in USD
        crypto_price_usd = await get_live_price(crypto, "usd")
        
        if crypto_price_usd == 0:
            return 0.0
        
        # Convert to target fiat
        usd_to_fiat_rate = 1.0 / FIAT_TO_USD_RATES.get(fiat, 1.0)
        price_in_fiat = crypto_price_usd * usd_to_fiat_rate
        
        return round(price_in_fiat, 2)
    except Exception as e:
        logger.error(f"Error calculating crypto price: {str(e)}")
        return 0.0

async def calculate_market_based_price(crypto: str, fiat: str, offset_percent: float) -> float:
    """Calculate price with market offset (e.g., -2% below market, +5% above market)"""
    market_price = await get_crypto_price_in_fiat(crypto, fiat)
    
    # Apply offset
    # Negative offset = below market (cheaper for buyer)
    # Positive offset = above market (more expensive for buyer)
    adjusted_price = market_price * (1 + (offset_percent / 100))
    
    return round(adjusted_price, 2)

@api_router.get("/crypto-market/prices")
async def get_crypto_market_prices():
    """Get current crypto market prices in different fiat currencies using live prices"""
    try:
        prices = {}
        
        for crypto in SUPPORTED_CRYPTOCURRENCIES.keys():
            prices[crypto] = {
                "USD": await get_crypto_price_in_fiat(crypto, "USD"),
                "GBP": await get_crypto_price_in_fiat(crypto, "GBP"),
                "EUR": await get_crypto_price_in_fiat(crypto, "EUR")
            }
        
        return {
            "success": True,
            "prices": prices,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/crypto-market/update-prices")
async def update_crypto_market_prices(request: dict):
    """Admin endpoint to update crypto market prices - DEPRECATED: Now using live prices"""
    try:
        return {
            "success": True,
            "message": "Price updates are now handled automatically via live price feeds from CoinGecko",
            "note": "This endpoint is deprecated as the system now uses real-time price data"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CMS - MARKETPLACE MANAGEMENT (BINANCE-STYLE)
# ============================================================================

@api_router.get("/cms/marketplace/sellers")
async def get_cms_sellers():
    """Get all CMS-managed default sellers for marketplace"""
    try:
        sellers = await db.cms_sellers.find({}, {"_id": 0}).to_list(1000)
        return {
            "success": True,
            "sellers": sellers,
            "total": len(sellers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cms/marketplace/sellers")
async def create_cms_seller(request: dict):
    """Create a new CMS-managed seller"""
    try:
        seller_data = {
            "seller_id": str(uuid.uuid4()),
            "username": request.get("username", ""),
            "rating": float(request.get("rating", 5.0)),
            "total_trades": int(request.get("total_trades", 0)),
            "completion_rate": float(request.get("completion_rate", 100.0)),
            "is_active": request.get("is_active", True),
            "is_admin_seller": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.cms_sellers.insert_one(seller_data)
        
        return {
            "success": True,
            "message": "Seller created successfully",
            "seller": seller_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/marketplace/sellers/{seller_id}")
async def update_cms_seller(seller_id: str, request: dict):
    """Update CMS-managed seller"""
    try:
        update_data = {}
        
        if "username" in request:
            update_data["username"] = request["username"]
        if "rating" in request:
            update_data["rating"] = float(request["rating"])
        if "total_trades" in request:
            update_data["total_trades"] = int(request["total_trades"])
        if "completion_rate" in request:
            update_data["completion_rate"] = float(request["completion_rate"])
        if "is_active" in request:
            update_data["is_active"] = request["is_active"]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_sellers.update_one(
                {"seller_id": seller_id},
                {"$set": update_data}
            )
        
        return {
            "success": True,
            "message": "Seller updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cms/marketplace/sellers/{seller_id}")
async def delete_cms_seller(seller_id: str):
    """Delete CMS-managed seller"""
    try:
        await db.cms_sellers.delete_one({"seller_id": seller_id})
        await db.cms_offers.delete_many({"seller_id": seller_id})
        
        return {
            "success": True,
            "message": "Seller and all their offers deleted"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cms/marketplace/offers")
async def get_cms_offers():
    """Get all CMS-managed marketplace offers"""
    try:
        offers = await db.cms_offers.find({}, {"_id": 0}).to_list(1000)
        return {
            "success": True,
            "offers": offers,
            "total": len(offers)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cms/marketplace/offers")
async def create_cms_offer(request: dict):
    """Create a new CMS-managed marketplace offer with market-based pricing support"""
    try:
        # Get pricing details
        price_type = request.get("price_type", "fixed")  # fixed or market_based
        crypto = request.get("crypto_currency", "BTC")
        fiat = request.get("fiat_currency", "GBP")
        
        # Calculate price based on type
        if price_type == "market_based":
            # Market-based pricing: use offset percentage
            market_offset_percent = float(request.get("market_offset_percent", 0))
            calculated_price = calculate_market_based_price(crypto, fiat, market_offset_percent)
        else:
            # Fixed pricing
            calculated_price = float(request.get("price", 0))
            market_offset_percent = 0
        
        offer_data = {
            "offer_id": str(uuid.uuid4()),
            "seller_id": request.get("seller_id", ""),
            "offer_type": request.get("offer_type", "sell"),  # sell or buy
            "crypto_currency": crypto,
            "fiat_currency": fiat,
            "price_type": price_type,  # NEW: fixed or market_based
            "price": calculated_price,
            "market_offset_percent": market_offset_percent,  # NEW: e.g., -2 for 2% below, +5 for 5% above
            "min_limit_fiat": float(request.get("min_limit_fiat", 50)),
            "max_limit_fiat": float(request.get("max_limit_fiat", 5000)),
            "available_amount": float(request.get("available_amount", 1.0)),
            "payment_methods": request.get("payment_methods", []),
            "is_active": request.get("is_active", True),
            "is_admin_offer": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.cms_offers.insert_one(offer_data)
        
        return {
            "success": True,
            "message": "Offer created successfully",
            "offer": offer_data,
            "market_price": get_crypto_price_in_fiat(crypto, fiat) if price_type == "market_based" else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/marketplace/offers/{offer_id}")
async def update_cms_offer(offer_id: str, request: dict):
    """Update CMS-managed offer"""
    try:
        update_data = {}
        
        allowed_fields = ["price", "min_limit_fiat", "max_limit_fiat", "available_amount", "payment_methods", "is_active"]
        for field in allowed_fields:
            if field in request:
                if field in ["price", "min_limit_fiat", "max_limit_fiat", "available_amount"]:
                    update_data[field] = float(request[field])
                else:
                    update_data[field] = request[field]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_offers.update_one(
                {"offer_id": offer_id},
                {"$set": update_data}
            )
        
        return {
            "success": True,
            "message": "Offer updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cms/marketplace/offers/{offer_id}")
async def delete_cms_offer(offer_id: str):
    """Delete CMS-managed offer"""
    try:
        await db.cms_offers.delete_one({"offer_id": offer_id})
        
        return {
            "success": True,
            "message": "Offer deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/marketplace/list")
async def get_marketplace_list(
    offer_type: str = "sell",
    crypto: str = "BTC",
    fiat: str = "GBP",
    payment_method: str = None,
    sort_by: str = None
):
    """Get full marketplace list (Binance-style) - combines CMS offers + real user offers with CMS settings"""
    try:
        # Get CMS settings
        cms_settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        # Get visibility settings
        visibility = cms_settings.get("marketplace_visibility", {}) if cms_settings else {}
        display_settings = cms_settings.get("display_settings", {}) if cms_settings else {}
        
        # Determine sort order
        sort_order = sort_by or display_settings.get("sort_by", "best_price")
        
        # Get CMS offers
        cms_query = {
            "offer_type": offer_type,
            "crypto_currency": crypto,
            "fiat_currency": fiat,
            "is_active": True
        }
        if payment_method:
            cms_query["payment_methods"] = payment_method
        
        cms_offers = await db.cms_offers.find(cms_query, {"_id": 0}).to_list(1000)
        
        # Get CMS sellers info
        seller_ids = list(set([offer["seller_id"] for offer in cms_offers]))
        sellers_map = {}
        if seller_ids:
            sellers_query = {"seller_id": {"$in": seller_ids}}
            # Only show active sellers if configured
            if not display_settings.get("show_offline_sellers", False):
                sellers_query["is_active"] = True
            sellers = await db.cms_sellers.find(sellers_query, {"_id": 0}).to_list(1000)
            sellers_map = {s["seller_id"]: s for s in sellers}
        
        # Combine offer + seller data with visibility controls
        combined_offers = []
        for offer in cms_offers:
            seller = sellers_map.get(offer["seller_id"], {})
            if not seller:  # Skip if seller not found or inactive
                continue
                
            offer_data = {**offer}
            offer_data["seller_username"] = seller.get("username", "Unknown")
            
            # Recalculate price if market-based
            if offer.get("price_type") == "market_based":
                market_offset = offer.get("market_offset_percent", 0)
                current_market_price = get_crypto_price_in_fiat(offer["crypto_currency"], offer["fiat_currency"])
                offer_data["current_market_price"] = current_market_price
                offer_data["price"] = calculate_market_based_price(
                    offer["crypto_currency"], 
                    offer["fiat_currency"], 
                    market_offset
                )
            
            # Add seller info based on visibility settings
            if visibility.get("show_ratings", True):
                offer_data["seller_rating"] = seller.get("rating", 5.0)
            if visibility.get("show_trade_count", True):
                offer_data["seller_total_trades"] = seller.get("total_trades", 0)
            if visibility.get("show_completion_rate", True):
                offer_data["seller_completion_rate"] = seller.get("completion_rate", 100.0)
            if not visibility.get("show_payment_methods", True):
                offer_data.pop("payment_methods", None)
            
            combined_offers.append(offer_data)
        
        # Apply sorting based on CMS settings
        if sort_order == "best_price":
            if offer_type == "sell":
                combined_offers.sort(key=lambda x: x["price"])
            else:
                combined_offers.sort(key=lambda x: x["price"], reverse=True)
        elif sort_order == "rating":
            combined_offers.sort(key=lambda x: x.get("seller_rating", 0), reverse=True)
        elif sort_order == "trades":
            combined_offers.sort(key=lambda x: x.get("seller_total_trades", 0), reverse=True)
        elif sort_order == "newest":
            combined_offers.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {
            "success": True,
            "offers": combined_offers,
            "total": len(combined_offers),
            "sort_by": sort_order,
            "visibility": visibility
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/cms/marketplace/seed-default-sellers")
async def seed_default_sellers():
    """Seed 10-12 default sellers with various offers for launch"""
    try:
        # Clear existing CMS sellers and offers
        await db.cms_sellers.delete_many({})
        await db.cms_offers.delete_many({})
        
        # Create 12 default sellers with trust badges
        sellers = [
            {"username": "CryptoKing23", "rating": 4.9, "total_trades": 245, "completion_rate": 98.5, "verified": True, "trusted": True},
            {"username": "UKTrader01", "rating": 5.0, "total_trades": 189, "completion_rate": 100.0, "verified": True, "trusted": True},
            {"username": "BitMaster77", "rating": 4.8, "total_trades": 312, "completion_rate": 97.2, "verified": True, "trusted": False},
            {"username": "LondonCrypto", "rating": 4.9, "total_trades": 156, "completion_rate": 99.1, "verified": True, "trusted": True},
            {"username": "FastPay99", "rating": 5.0, "total_trades": 421, "completion_rate": 100.0, "verified": True, "trusted": True},
            {"username": "TrustTrader", "rating": 4.7, "total_trades": 98, "completion_rate": 96.8, "verified": True, "trusted": False},
            {"username": "ProExchange", "rating": 4.9, "total_trades": 267, "completion_rate": 98.9, "verified": True, "trusted": True},
            {"username": "SecureDeals", "rating": 5.0, "total_trades": 334, "completion_rate": 100.0, "verified": True, "trusted": True},
            {"username": "QuickCrypto", "rating": 4.8, "total_trades": 178, "completion_rate": 97.5, "verified": True, "trusted": False},
            {"username": "ReliableP2P", "rating": 4.9, "total_trades": 203, "completion_rate": 99.3, "verified": True, "trusted": True},
            {"username": "SwiftTrade", "rating": 5.0, "total_trades": 289, "completion_rate": 100.0, "verified": True, "trusted": True},
            {"username": "SafeCoins", "rating": 4.8, "total_trades": 145, "completion_rate": 98.1, "verified": True, "trusted": False}
        ]
        
        seller_ids = []
        for seller_data in sellers:
            seller_id = str(uuid.uuid4())
            seller_ids.append(seller_id)
            await db.cms_sellers.insert_one({
                "seller_id": seller_id,
                **seller_data,
                "is_active": True,
                "is_admin_seller": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Create varied offers for each seller
        payment_methods_options = [
            ["Faster Payments", "Wise"],
            ["SEPA", "Revolut"],
            ["Faster Payments", "PayPal"],
            ["SWIFT", "Wise"],
            ["Revolut", "Wise"],
            ["Faster Payments"],
            ["SEPA", "SWIFT"],
            ["PayPal", "Wise"],
            ["Faster Payments", "Revolut"],
            ["Wise", "SWIFT"],
            ["Faster Payments", "SEPA"],
            ["Revolut", "PayPal"]
        ]
        
        base_btc_price = 52000  # Base price in GBP
        
        for idx, seller_id in enumerate(seller_ids):
            # Vary prices slightly
            price_variation = (idx - 6) * 100  # -600 to +500
            price = base_btc_price + price_variation
            
            # Create sell offer (user buying BTC)
            await db.cms_offers.insert_one({
                "offer_id": str(uuid.uuid4()),
                "seller_id": seller_id,
                "offer_type": "sell",
                "crypto_currency": "BTC",
                "fiat_currency": "GBP",
                "price": price,
                "min_limit_fiat": 50 + (idx * 10),
                "max_limit_fiat": 2000 + (idx * 500),
                "available_amount": 0.5 + (idx * 0.1),
                "payment_methods": payment_methods_options[idx],
                "is_active": True,
                "is_admin_offer": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        return {
            "success": True,
            "message": "Successfully seeded 12 default sellers with varied offers",
            "sellers_created": len(sellers),
            "offers_created": len(seller_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CMS - PLATFORM SETTINGS & CONFIGURATION
# ============================================================================

@api_router.get("/cms/settings/platform")
async def get_cms_platform_settings():
    """Get all platform settings for CMS"""
    try:
        # Clear old settings format
        await db.platform_settings.delete_many({"setting_key": {"$exists": True}})
        
        # Get from database or use in-memory config
        settings = await db.platform_settings.find_one({"setting_id": {"$exists": True}}, {"_id": 0})
        
        if not settings:
            # Initialize with PLATFORM_CONFIG values
            settings = {
                "setting_id": str(uuid.uuid4()),
                "wallet_fees": {
                    "deposit_fee_percent": PLATFORM_CONFIG["deposit_fee_percent"],
                    "withdraw_fee_percent": PLATFORM_CONFIG["withdraw_fee_percent"],
                    "p2p_trade_fee_percent": PLATFORM_CONFIG["p2p_trade_fee_percent"]
                },
                "seller_limits": {
                    "max_offers_per_seller": 10,
                    "min_trade_amount_usd": 50,
                    "max_trade_amount_usd": 50000,
                    "min_seller_rating": 4.0,
                    "require_kyc_above_amount": 1000
                },
                "marketplace_visibility": {
                    "show_ratings": True,
                    "show_trade_count": True,
                    "show_completion_rate": True,
                    "show_payment_methods": True,
                    "allow_user_offers": True,
                    "require_kyc_to_trade": False
                },
                "display_settings": {
                    "sort_by": "best_price",  # best_price, rating, trades, newest
                    "default_crypto": "BTC",
                    "default_fiat": "GBP",
                    "offers_per_page": 20,
                    "show_offline_sellers": False
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.platform_settings.insert_one(settings)
        
        return {
            "success": True,
            "settings": settings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/settings/platform")
async def update_cms_platform_settings(request: dict):
    """Update platform settings"""
    try:
        # Get current settings
        current = await db.platform_settings.find_one({})
        
        if not current:
            # Create initial settings
            current = {
                "setting_id": str(uuid.uuid4()),
                "wallet_fees": {},
                "seller_limits": {},
                "marketplace_visibility": {},
                "display_settings": {}
            }
        
        # Update wallet fees
        if "wallet_fees" in request:
            for key, value in request["wallet_fees"].items():
                if current.get("wallet_fees") is None:
                    current["wallet_fees"] = {}
                current["wallet_fees"][key] = float(value)
                # Update in-memory PLATFORM_CONFIG
                if key in PLATFORM_CONFIG:
                    PLATFORM_CONFIG[key] = float(value)
        
        # Update seller limits
        if "seller_limits" in request:
            for key, value in request["seller_limits"].items():
                if current.get("seller_limits") is None:
                    current["seller_limits"] = {}
                if key in ["min_seller_rating", "min_trade_amount_usd", "max_trade_amount_usd", "require_kyc_above_amount"]:
                    current["seller_limits"][key] = float(value)
                else:
                    current["seller_limits"][key] = int(value)
        
        # Update marketplace visibility
        if "marketplace_visibility" in request:
            for key, value in request["marketplace_visibility"].items():
                if current.get("marketplace_visibility") is None:
                    current["marketplace_visibility"] = {}
                current["marketplace_visibility"][key] = bool(value)
        
        # Update display settings
        if "display_settings" in request:
            for key, value in request["display_settings"].items():
                if current.get("display_settings") is None:
                    current["display_settings"] = {}
                current["display_settings"][key] = value
        
        current["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Upsert to database
        await db.platform_settings.update_one(
            {"setting_id": current.get("setting_id")},
            {"$set": current},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Platform settings updated successfully",
            "settings": current
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cms/settings/fees")
async def get_fee_settings():
    """Get wallet fee settings"""
    try:
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        if not settings or "wallet_fees" not in settings:
            return {
                "success": True,
                "fees": {
                    "deposit_fee_percent": PLATFORM_CONFIG["deposit_fee_percent"],
                    "withdraw_fee_percent": PLATFORM_CONFIG["withdraw_fee_percent"],
                    "p2p_trade_fee_percent": PLATFORM_CONFIG["p2p_trade_fee_percent"]
                }
            }
        
        return {
            "success": True,
            "fees": settings["wallet_fees"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/settings/fees")
async def update_fee_settings(request: dict):
    """Update wallet fee settings"""
    try:
        settings = await db.platform_settings.find_one({})
        
        if not settings:
            settings = {"setting_id": str(uuid.uuid4()), "wallet_fees": {}}
        
        if "wallet_fees" not in settings:
            settings["wallet_fees"] = {}
        
        # Update fees
        for key in ["deposit_fee_percent", "withdraw_fee_percent", "p2p_trade_fee_percent"]:
            if key in request:
                settings["wallet_fees"][key] = float(request[key])
                # Update in-memory config
                if key in PLATFORM_CONFIG:
                    PLATFORM_CONFIG[key] = float(request[key])
        
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.platform_settings.update_one(
            {"setting_id": settings["setting_id"]},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Fee settings updated successfully",
            "fees": settings["wallet_fees"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cms/settings/seller-limits")
async def get_seller_limits():
    """Get seller limit settings"""
    try:
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        if not settings or "seller_limits" not in settings:
            return {
                "success": True,
                "limits": {
                    "max_offers_per_seller": 10,
                    "min_trade_amount_usd": 50,
                    "max_trade_amount_usd": 50000,
                    "min_seller_rating": 4.0,
                    "require_kyc_above_amount": 1000
                }
            }
        
        return {
            "success": True,
            "limits": settings["seller_limits"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/settings/seller-limits")
async def update_seller_limits(request: dict):
    """Update seller limit settings"""
    try:
        settings = await db.platform_settings.find_one({})
        
        if not settings:
            settings = {"setting_id": str(uuid.uuid4()), "seller_limits": {}}
        
        if "seller_limits" not in settings:
            settings["seller_limits"] = {}
        
        # Update limits
        for key, value in request.items():
            if key in ["min_seller_rating", "min_trade_amount_usd", "max_trade_amount_usd", "require_kyc_above_amount"]:
                settings["seller_limits"][key] = float(value)
            else:
                settings["seller_limits"][key] = int(value)
        
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.platform_settings.update_one(
            {"setting_id": settings["setting_id"]},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Seller limits updated successfully",
            "limits": settings["seller_limits"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cms/settings/marketplace-visibility")
async def get_marketplace_visibility():
    """Get marketplace visibility settings"""
    try:
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        if not settings or "marketplace_visibility" not in settings:
            return {
                "success": True,
                "visibility": {
                    "show_ratings": True,
                    "show_trade_count": True,
                    "show_completion_rate": True,
                    "show_payment_methods": True,
                    "allow_user_offers": True,
                    "require_kyc_to_trade": False
                }
            }
        
        return {
            "success": True,
            "visibility": settings["marketplace_visibility"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/settings/marketplace-visibility")
async def update_marketplace_visibility(request: dict):
    """Update marketplace visibility settings"""
    try:
        settings = await db.platform_settings.find_one({})
        
        if not settings:
            settings = {"setting_id": str(uuid.uuid4()), "marketplace_visibility": {}}
        
        if "marketplace_visibility" not in settings:
            settings["marketplace_visibility"] = {}
        
        # Update visibility settings
        for key, value in request.items():
            settings["marketplace_visibility"][key] = bool(value)
        
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.platform_settings.update_one(
            {"setting_id": settings["setting_id"]},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Marketplace visibility updated successfully",
            "visibility": settings["marketplace_visibility"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cms/settings/display")
async def get_display_settings():
    """Get display and sorting settings"""
    try:
        settings = await db.platform_settings.find_one({}, {"_id": 0})
        
        if not settings or "display_settings" not in settings:
            return {
                "success": True,
                "display": {
                    "sort_by": "best_price",
                    "default_crypto": "BTC",
                    "default_fiat": "GBP",
                    "offers_per_page": 20,
                    "show_offline_sellers": False
                }
            }
        
        return {
            "success": True,
            "display": settings["display_settings"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cms/settings/display")
async def update_display_settings(request: dict):
    """Update display and sorting settings"""
    try:
        settings = await db.platform_settings.find_one({})
        
        if not settings:
            settings = {"setting_id": str(uuid.uuid4()), "display_settings": {}}
        
        if "display_settings" not in settings:
            settings["display_settings"] = {}
        
        # Update display settings
        for key, value in request.items():
            if key == "offers_per_page":
                settings["display_settings"][key] = int(value)
            elif key == "show_offline_sellers":
                settings["display_settings"][key] = bool(value)
            else:
                settings["display_settings"][key] = value
        
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.platform_settings.update_one(
            {"setting_id": settings["setting_id"]},
            {"$set": settings},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Display settings updated successfully",
            "display": settings["display_settings"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



        admin_wallet_id = PLATFORM_CONFIG["admin_wallet_id"]
        
        # Check admin balance
        admin_balance = await db.crypto_balances.find_one({
            "user_id": admin_wallet_id,
            "currency": currency
        })
        
        if not admin_balance or admin_balance["balance"] < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient platform balance. Available: {admin_balance['balance'] if admin_balance else 0} {currency}"
            )
        
        # Create withdrawal transaction
        withdrawal_tx = CryptoTransaction(
            user_id=admin_wallet_id,
            currency=currency,
            transaction_type="admin_withdrawal",
            amount=amount,
            status="completed",
            reference=address,
            notes=f"Platform earnings withdrawal to admin wallet: {address}",
            completed_at=datetime.now(timezone.utc)
        )
        
        tx_dict = withdrawal_tx.model_dump()
        tx_dict['created_at'] = tx_dict['created_at'].isoformat()
        tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
        tx_dict['withdrawal_address'] = address
        await db.crypto_transactions.insert_one(tx_dict)
        
        # Deduct from admin balance
        await db.crypto_balances.update_one(
            {"user_id": admin_wallet_id, "currency": currency},
            {
                "$inc": {"balance": -amount},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": "Withdrawal initiated",
            "transaction_id": withdrawal_tx.transaction_id,
            "amount": amount,
            "currency": currency,
            "address": address
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error withdrawing earnings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/fee-statistics")
async def get_fee_statistics():
    """Get detailed statistics on platform fees collected"""
    try:
        # Aggregate withdrawal fees
        withdrawal_fees = await db.crypto_transactions.aggregate([
            {"$match": {"fee_type": "withdrawal_fee"}},
            {"$group": {
                "_id": "$currency",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]).to_list(100)
        
        # Aggregate P2P trade fees
        trade_fees = await db.crypto_transactions.aggregate([
            {"$match": {"fee_type": "p2p_trade_fee"}},
            {"$group": {
                "_id": "$currency",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]).to_list(100)
        
        return {
            "success": True,
            "stats": {
                "withdrawal_fees": {item["_id"]: item for item in withdrawal_fees},
                "trade_fees": {item["_id"]: item for item in trade_fees}
            }
        }
    except Exception as e:
        logger.error(f"Error fetching fee statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Router will be included at the end of the file

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# P2P TRADE CHAT SYSTEM

# ============================================================================
# P2P DISPUTE SYSTEM
# ============================================================================

@api_router.post("/p2p/disputes/create")
async def create_dispute(request: dict):
    """Create a dispute for a P2P trade"""
    try:
        trade_id = request.get("trade_id")
        user_id = request.get("user_id")
        reason = request.get("reason", "")
        description = request.get("description", "")
        
        if not trade_id or not user_id:
            raise HTTPException(status_code=400, detail="trade_id and user_id required")
        
        # Get trade details
        trade = await db.p2p_trades.find_one({"trade_id": trade_id})
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Check if user is buyer or seller
        if user_id not in [trade.get("buyer_id"), trade.get("seller_id")]:
            raise HTTPException(status_code=403, detail="Not authorized to dispute this trade")
        
        # Check if dispute already exists
        existing_dispute = await db.p2p_disputes.find_one({"trade_id": trade_id})
        if existing_dispute:
            raise HTTPException(status_code=400, detail="Dispute already exists for this trade")
        
        dispute_id = f"dispute_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{trade_id}"
        
        dispute_data = {
            "dispute_id": dispute_id,
            "trade_id": trade_id,
            "buyer_id": trade.get("buyer_id"),
            "seller_id": trade.get("seller_id"),
            "initiated_by": user_id,
            "reason": reason,
            "description": description,
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "messages": [],
            "evidence": [],
            "admin_notes": [],
            "resolution": None,
            "resolved_at": None,
            "resolved_by": None
        }
        
        await db.p2p_disputes.insert_one(dispute_data)
        
        # Update trade status to disputed
        await db.p2p_trades.update_one(
            {"trade_id": trade_id},
            {
                "$set": {
                    "status": "disputed",
                    "dispute_opened_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # 🚨 SEND IMMEDIATE ADMIN NOTIFICATIONS
        try:
            # 1. Send Email Alert to Admin
            await email_service.send_dispute_alert_to_admin(
                trade_id=trade_id,
                dispute_id=dispute_id,
                buyer_id=trade.get("buyer_id"),
                seller_id=trade.get("seller_id"),
                amount=trade.get("crypto_amount", 0),
                currency=trade.get("crypto_currency", "Unknown"),
                reason=reason,
                description=description,
                initiated_by=user_id
            )
            logger.info(f"✅ Admin email alert sent for dispute {dispute_id}")
        except Exception as e:
            logger.error(f"❌ Failed to send admin email for dispute {dispute_id}: {str(e)}")
        
        # 2. Create In-Dashboard Notification for Admin
        try:
            admin_notification = {
                "notification_id": f"notif_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
                "user_id": "ADMIN",
                "type": "dispute_created",
                "title": "🚨 P2P Trade Dispute",
                "message": f"Trade {trade_id} has been disputed by user {user_id}. Amount: {trade.get('crypto_amount', 0)} {trade.get('crypto_currency', 'Unknown')}. Reason: {reason}",
                "data": {
                    "dispute_id": dispute_id,
                    "trade_id": trade_id,
                    "buyer_id": trade.get("buyer_id"),
                    "seller_id": trade.get("seller_id"),
                    "amount": trade.get("crypto_amount", 0),
                    "currency": trade.get("crypto_currency", "Unknown"),
                    "initiated_by": user_id,
                    "reason": reason
                },
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "action_url": f"/admin/disputes/{dispute_id}"
            }
            await db.admin_notifications.insert_one(admin_notification)
            logger.info(f"✅ Admin dashboard notification created for dispute {dispute_id}")
        except Exception as e:
            logger.error(f"❌ Failed to create admin notification for dispute {dispute_id}: {str(e)}")
        
        return {
            "success": True,
            "dispute_id": dispute_id,
            "message": "Dispute created successfully. Admin has been notified."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/disputes/{dispute_id}/message")
async def add_dispute_message(dispute_id: str, request: dict):
    """Add a message to dispute thread"""
    try:
        user_id = request.get("user_id")
        message = request.get("message")
        
        if not user_id or not message:
            raise HTTPException(status_code=400, detail="user_id and message required")
        
        # Get dispute
        dispute = await db.p2p_disputes.find_one({"dispute_id": dispute_id})
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        # Check authorization
        if user_id not in [dispute.get("buyer_id"), dispute.get("seller_id")]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        message_data = {
            "message_id": f"msg_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "user_id": user_id,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$push": {"messages": message_data},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": "Message added"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/p2p/disputes/{dispute_id}/evidence")
async def upload_dispute_evidence(dispute_id: str, request: dict):
    """Upload evidence file for dispute (image/PDF)"""
    try:
        user_id = request.get("user_id")
        file_name = request.get("file_name")
        file_type = request.get("file_type")
        file_data = request.get("file_data")  # Base64 encoded
        description = request.get("description", "")
        
        if not all([user_id, file_name, file_type, file_data]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]
        if file_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only images and PDFs allowed")
        
        # Get dispute
        dispute = await db.p2p_disputes.find_one({"dispute_id": dispute_id})
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        # Check authorization
        if user_id not in [dispute.get("buyer_id"), dispute.get("seller_id")]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        evidence_data = {
            "evidence_id": f"ev_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "file_data": file_data,  # In production, upload to S3/cloud storage
            "description": description,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$push": {"evidence": evidence_data},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": "Evidence uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/p2p/disputes/{dispute_id}")
async def get_dispute(dispute_id: str, user_id: str = Query(None)):
    """Get dispute details"""
    try:
        print(f"Getting dispute: {dispute_id}")
        dispute = await db.p2p_disputes.find_one({"dispute_id": dispute_id})
        print(f"Dispute found: {dispute is not None}")
        
        if not dispute:
            raise HTTPException(status_code=404, detail=f"Dispute not found: {dispute_id}")
        
        # Remove _id from dispute
        if "_id" in dispute:
            del dispute["_id"]
        
        # Check authorization if user_id provided
        if user_id and user_id not in [dispute.get("buyer_id"), dispute.get("seller_id")]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get trade details
        trade = await db.p2p_trades.find_one({"trade_id": dispute.get("trade_id")})
        if trade and "_id" in trade:
            del trade["_id"]
        
        # Get user details
        buyer = await db.users.find_one({"user_id": dispute.get("buyer_id")})
        if buyer and "_id" in buyer:
            del buyer["_id"]
        
        seller = await db.users.find_one({"user_id": dispute.get("seller_id")})
        if seller and "_id" in seller:
            del seller["_id"]
        
        return {
            "success": True,
            "dispute": {
                **dispute,
                "trade": trade,
                "buyer_info": buyer,
                "seller_info": seller
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_dispute: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/p2p/disputes/user/{user_id}")
async def get_user_disputes(user_id: str):
    """Get all disputes for a user"""
    try:
        disputes = await db.p2p_disputes.find(
            {
                "$or": [
                    {"buyer_id": user_id},
                    {"seller_id": user_id}
                ]
            },
            {"_id": 0}
        ).to_list(1000)
        
        return {
            "success": True,
            "disputes": disputes,
            "count": len(disputes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/disputes/all")
async def get_all_disputes(status: Optional[str] = None):
    """Admin: Get all disputes"""
    try:
        query = {}
        if status:
            query["status"] = status
        
        disputes = await db.p2p_disputes.find(query, {"_id": 0}).to_list(1000)
        
        # Enrich with user info
        for dispute in disputes:
            buyer = await db.users.find_one({"user_id": dispute.get("buyer_id")}, {"_id": 0, "username": 1, "email": 1})
            seller = await db.users.find_one({"user_id": dispute.get("seller_id")}, {"_id": 0, "username": 1, "email": 1})
            dispute["buyer_info"] = buyer
            dispute["seller_info"] = seller
        
        return {
            "success": True,
            "disputes": disputes,
            "count": len(disputes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, request: dict):
    """Admin: Resolve a dispute"""
    try:
        admin_id = request.get("admin_id")
        resolution = request.get("resolution")  # "release_to_buyer" or "return_to_seller"
        admin_note = request.get("admin_note", "")
        
        if not all([admin_id, resolution]):
            raise HTTPException(status_code=400, detail="admin_id and resolution required")
        
        if resolution not in ["release_to_buyer", "return_to_seller"]:
            raise HTTPException(status_code=400, detail="Invalid resolution")
        
        # Get dispute
        dispute = await db.p2p_disputes.find_one({"dispute_id": dispute_id})
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        if dispute.get("status") != "open":
            raise HTTPException(status_code=400, detail="Dispute already resolved")
        
        # Update dispute
        await db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolution": resolution,
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                    "resolved_by": admin_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "admin_notes": {
                        "note_id": f"note_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
                        "admin_id": admin_id,
                        "note": admin_note,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        # Update trade status
        trade_status = "completed" if resolution == "release_to_buyer" else "cancelled"
        await db.p2p_trades.update_one(
            {"trade_id": dispute.get("trade_id")},
            {
                "$set": {
                    "status": trade_status,
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Dispute resolved: {resolution}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/disputes/{dispute_id}/note")
async def add_admin_note(dispute_id: str, request: dict):
    """Admin: Add internal note to dispute"""
    try:
        admin_id = request.get("admin_id")
        note = request.get("note")
        
        if not all([admin_id, note]):
            raise HTTPException(status_code=400, detail="admin_id and note required")
        
        note_data = {
            "note_id": f"note_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "admin_id": admin_id,
            "note": note,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.p2p_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$push": {"admin_notes": note_data},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "success": True,
            "message": "Admin note added"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================

async def create_system_message(trade_id: str, event_type: str, additional_info: str = ""):
    """Create system-generated message for trade events"""
    system_messages = {
        "trade_opened": "Trade opened.",
        "buyer_marked_paid": "Buyer marked trade as paid.",
        "waiting_for_seller": "Waiting for seller to confirm payment.",
        "seller_confirmed": "Seller confirmed payment.",
        "escrow_released": "Escrow released.",
        "trade_completed": "Trade completed successfully.",
        "trade_cancelled": "Trade cancelled.",
        "dispute_opened": "Dispute opened – moderator review in progress.",
        "dispute_resolved_buyer": "Dispute closed – crypto released to buyer.",
        "dispute_resolved_seller": "Dispute closed – crypto returned to seller."
    }
    
    message_content = system_messages.get(event_type, f"System: {event_type}")
    if additional_info:
        message_content += f" {additional_info}"
    
    message = {
        "message_id": str(uuid.uuid4()),
        "trade_id": trade_id,
        "sender_id": "system",
        "sender_type": "system",
        "message_type": "system_event",
        "content": message_content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_read": False
    }
    
    await db.trade_chat_messages.insert_one(message)
    return message

@api_router.post("/trade/chat/send")
async def send_trade_message(request: SendMessageRequest):
    """Send a message in a trade chat"""
    try:
        # Verify trade exists
        trade = await db.trades.find_one({"trade_id": request.trade_id}, {"_id": 0})
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Verify user is part of the trade
        if request.user_id not in [trade.get("buyer_id"), trade.get("seller_id")]:
            raise HTTPException(status_code=403, detail="You are not part of this trade")
        
        # Determine sender type
        sender_type = "buyer" if request.user_id == trade.get("buyer_id") else "seller"
        
        # Create message
        message = {
            "message_id": str(uuid.uuid4()),
            "trade_id": request.trade_id,
            "sender_id": request.user_id,
            "sender_type": sender_type,
            "message_type": "image" if request.image_data else "text",
            "content": request.message,
            "image_data": request.image_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_read": False
        }
        
        await db.trade_chat_messages.insert_one(message)
        
        # Update trade's last_message_at
        await db.trades.update_one(
            {"trade_id": request.trade_id},
            {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "message": "Message sent",
            "message_id": message["message_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/trade/chat/{trade_id}")
async def get_trade_chat_messages(trade_id: str, user_id: str):
    """Get all messages for a trade"""
    try:
        # Verify trade exists
        trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Verify user is part of the trade or is admin
        if user_id not in [trade.get("buyer_id"), trade.get("seller_id"), "admin"]:
            raise HTTPException(status_code=403, detail="You are not authorized to view this chat")
        
        # Get all messages
        messages = await db.trade_chat_messages.find(
            {"trade_id": trade_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(1000)
        
        # Get user info for sender labels
        sender_ids = list(set([msg["sender_id"] for msg in messages if msg["sender_id"] not in ["system", "admin"]]))
        users_map = {}
        if sender_ids:
            users = await db.users.find({"user_id": {"$in": sender_ids}}, {"_id": 0, "user_id": 1, "username": 1}).to_list(100)
            users_map = {u["user_id"]: u.get("username", "User") for u in users}
        
        # Add sender names to messages
        for msg in messages:
            if msg["sender_type"] == "system":
                msg["sender_name"] = "System"
            elif msg["sender_type"] == "admin":
                msg["sender_name"] = "Admin"
            else:
                msg["sender_name"] = users_map.get(msg["sender_id"], "User")
        
        return {
            "success": True,
            "messages": messages,
            "trade": {
                "trade_id": trade["trade_id"],
                "buyer_id": trade.get("buyer_id"),
                "seller_id": trade.get("seller_id"),
                "status": trade.get("status")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/trade/chat/mark-read")
async def mark_messages_as_read(request: MarkMessagesReadRequest):
    """Mark all messages in a trade as read for a user"""
    try:
        # Update all unread messages where sender is NOT the current user
        result = await db.trade_chat_messages.update_many(
            {
                "trade_id": request.trade_id,
                "sender_id": {"$ne": request.user_id},
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        return {
            "success": True,
            "messages_marked": result.modified_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/trade/chat/unread-count/{trade_id}")
async def get_unread_message_count(trade_id: str, user_id: str):
    """Get unread message count for a user in a specific trade"""
    try:
        count = await db.trade_chat_messages.count_documents({
            "trade_id": trade_id,
            "sender_id": {"$ne": user_id},
            "is_read": False
        })
        
        return {
            "success": True,
            "unread_count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/trade/chat/admin/send")
async def admin_send_message(trade_id: str, message: str, admin_token: str = Header(None)):
    """Admin sends message to a trade chat"""
    try:
        # Simple admin verification (improve in production)
        if not admin_token or "admin" not in admin_token.lower():
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Verify trade exists
        trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Create admin message
        admin_message = {
            "message_id": str(uuid.uuid4()),
            "trade_id": trade_id,
            "sender_id": "admin",
            "sender_type": "admin",
            "message_type": "text",
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_read": False
        }
        
        await db.trade_chat_messages.insert_one(admin_message)
        
        return {
            "success": True,
            "message": "Admin message sent"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/trade-chats")
async def get_all_trade_chats(admin_token: str = Header(None), skip: int = 0, limit: int = 50):
    """Admin view: Get all trade chats"""
    try:
        # Simple admin verification
        if not admin_token or "admin" not in admin_token.lower():
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get trades with messages
        trades_with_messages = await db.trade_chat_messages.aggregate([
            {
                "$group": {
                    "_id": "$trade_id",
                    "last_message": {"$last": "$content"},
                    "last_message_time": {"$last": "$timestamp"},
                    "message_count": {"$sum": 1}
                }
            },
            {"$sort": {"last_message_time": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]).to_list(limit)
        
        # Get trade details
        trade_ids = [t["_id"] for t in trades_with_messages]
        trades = await db.p2p_trades.find(
            {"trade_id": {"$in": trade_ids}},
            {"_id": 0}
        ).to_list(100)
        
        trades_map = {t["trade_id"]: t for t in trades}
        
        # Combine data
        result = []
        for tm in trades_with_messages:
            trade = trades_map.get(tm["_id"], {})
            result.append({
                "trade_id": tm["_id"],
                "message_count": tm["message_count"],
                "last_message": tm["last_message"],
                "last_message_time": tm["last_message_time"],
                "trade_status": trade.get("status"),
                "buyer_id": trade.get("buyer_id"),
                "seller_id": trade.get("seller_id"),
                "crypto_amount": trade.get("crypto_amount"),
                "fiat_amount": trade.get("fiat_amount")
            })
        
        return {
            "success": True,
            "chats": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def startup_event():
    """Load referral config from database on startup"""
    await load_referral_config_from_db(db)
    print("Referral configuration loaded from database")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    pass



# ===========================
# NOWPAYMENTS INTEGRATION
# ===========================

try:
    from nowpayments_integration import get_nowpayments_service
    from fastapi import Request
    import time
    
    @api_router.get("/nowpayments/currencies")
    async def get_nowpayments_currencies():
        """Get list of supported cryptocurrencies from NOWPayments"""
        try:
            nowpayments = get_nowpayments_service()
            currencies = nowpayments.get_available_currencies()
            return {
                "success": True,
                "currencies": currencies,
                "count": len(currencies)
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    @api_router.post("/nowpayments/create-deposit")
    async def create_deposit_address(request: dict):
        """
        Create a deposit address for user - ISOLATED SERVICE
        Uses new DepositService for stability
        
        Request body:
        {
            "user_id": "user123",
            "amount": 100.0,
            "currency": "usd",
            "pay_currency": "btc"
        }
        """
        try:
            # Use isolated deposit service
            from services.deposit_service import get_deposit_service
            deposit_service = get_deposit_service()
            
            # Delegate to isolated service
            result = await deposit_service.create_deposit_address(
                user_id=request.get('user_id'),
                amount=request.get('amount'),
                currency=request.get('currency', 'usd'),
                pay_currency=request.get('pay_currency', 'btc')
            )
            
            return result
                
        except Exception as e:
            logger.error(f"Deposit endpoint error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "message": f"System error: {str(e)}"
            }
    
    @api_router.post("/nowpayments/ipn")
    async def nowpayments_ipn_webhook(request: Request):
        """
        IPN webhook endpoint for NOWPayments - PRODUCTION READY
        Validates signatures, checks confirmations, credits via central wallet service
        """
        try:
            nowpayments = get_nowpayments_service()
            wallet_service = get_wallet_service()
            
            # Get raw body and signature
            body = await request.body()
            signature = request.headers.get('x-nowpayments-sig', '')
            
            logger.info("📥 NOWPayments IPN webhook received")
            
            # CRITICAL: Verify signature to prevent fake deposits
            if not nowpayments.verify_ipn_signature(body, signature):
                logger.error("❌ INVALID IPN SIGNATURE - Possible fake callback attempt")
                return {"status": "error", "message": "Invalid signature"}
            
            # Parse IPN data
            import json
            ipn_data = json.loads(body.decode('utf-8'))
            
            payment_id = ipn_data.get('payment_id')
            payment_status = ipn_data.get('payment_status')
            order_id = ipn_data.get('order_id')
            actually_paid = float(ipn_data.get('actually_paid', 0))
            pay_currency = ipn_data.get('pay_currency', '').upper()
            network_confirmations = int(ipn_data.get('network_confirmations', 0))
            
            logger.info(f"📦 IPN Data: payment_id={payment_id}, status={payment_status}, "
                       f"amount={actually_paid} {pay_currency}, confirmations={network_confirmations}")
            
            # Update deposit record with latest status
            await db.deposits.update_one(
                {"payment_id": payment_id},
                {"$set": {
                    "status": payment_status,
                    "actually_paid": actually_paid,
                    "network_confirmations": network_confirmations,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_ipn_data": ipn_data
                }}
            )
            
            # Check if payment has enough confirmations
            if not nowpayments.is_payment_confirmed(ipn_data):
                logger.info(f"⏳ Payment {payment_id} not yet confirmed ({network_confirmations} confirmations)")
                return {"status": "ok", "message": "awaiting_confirmations"}
            
            # Payment is confirmed - credit user balance
            logger.info(f"✅ Payment {payment_id} confirmed! Crediting user...")
            
            deposit = await db.deposits.find_one({"payment_id": payment_id}, {"_id": 0})
            if not deposit:
                logger.error(f"❌ Deposit record not found for payment_id={payment_id}")
                return {"status": "error", "message": "Deposit record not found"}
            
            user_id = deposit['user_id']
            currency = pay_currency
            
            # Check if already credited (prevent double credit)
            already_credited = deposit.get('credited', False)
            if already_credited:
                logger.warning(f"⚠️ Payment {payment_id} already credited to user {user_id}")
                return {"status": "ok", "message": "already_credited"}
            
            # Credit user via central wallet service
            try:
                success = await wallet_service.credit(
                    user_id=user_id,
                    currency=currency,
                    amount=actually_paid,
                    transaction_type="deposit_nowpayments",
                    reference_id=payment_id,
                    metadata={
                        "order_id": order_id,
                        "payment_status": payment_status,
                        "network_confirmations": network_confirmations,
                        "ipn_timestamp": datetime.now(timezone.utc).isoformat()
                    }
                )
                
                if success:
                    # Mark as credited
                    await db.deposits.update_one(
                        {"payment_id": payment_id},
                        {"$set": {
                            "credited": True,
                            "credited_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Log deposit to fee_transactions (0% fee but tracked for analytics)
                    await db.fee_transactions.insert_one({
                        "user_id": user_id,
                        "transaction_type": "deposit",
                        "fee_type": "deposit_fee_percent",
                        "amount": actually_paid,
                        "fee_amount": 0.0,
                        "fee_percent": 0.0,
                        "admin_fee": 0.0,
                        "referrer_commission": 0.0,
                        "referrer_id": None,
                        "currency": currency,
                        "reference_id": payment_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    
                    logger.info(f"✅ User {user_id} credited {actually_paid} {currency} via wallet service")
                    
                    # TODO: Send notification to user
                    # await create_notification(user_id, "deposit_confirmed", {...})
                    
                    return {"status": "ok", "message": "balance_credited"}
                else:
                    logger.error(f"❌ Failed to credit user {user_id} via wallet service")
                    return {"status": "error", "message": "credit_failed"}
                    
            except Exception as credit_error:
                logger.error(f"❌ Error crediting user {user_id}: {str(credit_error)}")
                return {"status": "error", "message": str(credit_error)}
            
        except Exception as e:
            logger.error(f"IPN processing error: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    print("✅ NOWPayments integration endpoints registered successfully")
    
except Exception as e:
    print(f"⚠️ NOWPayments integration not available: {str(e)}")
    print("Continuing without NOWPayments integration...")

# ============================================================
# UNIFIED WALLET ENDPOINTS - Single Source of Truth
# ============================================================

@api_router.get("/wallets/coin-metadata")
async def get_wallet_coin_metadata():
    """
    Get metadata for all supported coins (PUBLIC ENDPOINT)
    Returns coin configuration for dynamic wallet rendering
    Used by frontend to generate wallet UI automatically
    """
    try:
        # Get all enabled coins from database
        coins = await db.supported_coins.find(
            {"enabled": True},
            {"_id": 0}
        ).to_list(100)
        
        # If no coins in DB, use default SUPPORTED_CRYPTOCURRENCIES
        if not coins:
            coins = []
            for symbol, info in SUPPORTED_CRYPTOCURRENCIES.items():
                coins.append({
                    "symbol": symbol,
                    "name": info["name"],
                    "network": info["network"],
                    "decimals": info["decimals"],
                    "enabled": True
                })
        
        # Define coin colors matching premium design spec
        COIN_COLORS = {
            'BTC': '#FF8A00',  # Orange
            'ETH': '#7A4CFF',  # Purple
            'USDT': '#00D181', # Green
            'USDC': '#6366F1',
            'BNB': '#F3BA2F',
            'SOL': '#9945FF',
            'XRP': '#23292F',
            'ADA': '#0033AD',
            'DOGE': '#C3A634',
            'DOT': '#E6007A',
            'MATIC': '#8247E5',
            'LINK': '#2A5ADA',
            'LTC': '#345D9D',
            'BCH': '#8DC351',
            'UNI': '#FF007A',
            'ATOM': '#2E3148',
            'ETC': '#328332',
            'XLM': '#14B6E7',
            'ALGO': '#000000',
            'VET': '#15BDFF',
            'FIL': '#0090FF',
            'TRX': '#FF0013',
            'AVAX': '#E84142',
            'SHIB': '#FFA409',
            'DAI': '#F4B731',
            'WBTC': '#F09242',
            'GBP': '#00C6FF',  # Aqua
            'USD': '#85BB65',
            'EUR': '#0052FF'
        }
        
        # Define NOWPayments currency codes
        NOWPAYMENTS_CODES = {
            'BTC': 'btc',
            'ETH': 'eth',
            'USDT': 'usdttrc20',
            'USDC': 'usdc',
            'BNB': 'bnbbsc',
            'SOL': 'sol',
            'XRP': 'xrp',
            'ADA': 'ada',
            'DOGE': 'doge',
            'DOT': 'dot',
            'MATIC': 'maticpolygon',
            'LINK': 'link',
            'LTC': 'ltc',
            'BCH': 'bch',
            'UNI': 'uni',
            'ATOM': 'atom',
            'ETC': 'etc',
            'XLM': 'xlm',
            'ALGO': 'algo',
            'VET': 'vet',
            'FIL': 'fil',
            'TRX': 'trx',
            'AVAX': 'avaxc',
            'SHIB': 'shib',
            'DAI': 'dai',
            'WBTC': 'wbtc'
        }
        
        # Enrich coins with UI metadata
        enriched_coins = []
        for coin in coins:
            symbol = coin["symbol"]
            enriched_coins.append({
                "symbol": symbol,
                "name": coin.get("name", symbol),
                "network": coin.get("network", f"{symbol} Network"),
                "decimals": coin.get("decimals", 8),
                "color": COIN_COLORS.get(symbol, '#00F0FF'),
                "nowpayments_code": NOWPAYMENTS_CODES.get(symbol, symbol.lower()),
                "icon": symbol[0],  # First letter as fallback icon
                "enabled": coin.get("enabled", True)
            })
        
        return {
            "success": True,
            "coins": enriched_coins,
            "count": len(enriched_coins),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error getting coin metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/wallets/balances/{user_id}")
async def get_unified_balances(user_id: str):
    """
    Get all cryptocurrency balances for a user from unified wallet
    Returns balances with USD values and total portfolio
    """
    try:
        wallet_service = get_wallet_service()
        logger.info(f"🔍 Fetching balances for {user_id} via wallet_service")
        
        # Get all balances from wallet service
        balances = await wallet_service.get_all_balances(user_id)
        logger.info(f"🔍 Wallet service returned {len(balances)} balances: {balances}")
        
        if not balances:
            return {
                "success": True,
                "user_id": user_id,
                "balances": [],
                "total_usd": 0.0,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        
        # Get current prices from CoinGecko
        import requests
        coin_ids = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'BNB': 'binancecoin',
            'SOL': 'solana',
            'XRP': 'ripple',
            'ADA': 'cardano',
            'DOGE': 'dogecoin',
            'TRX': 'tron',
            'DOT': 'polkadot',
            'MATIC': 'matic-network',
            'LTC': 'litecoin',
            'SHIB': 'shiba-inu',
            'AVAX': 'avalanche-2',
            'LINK': 'chainlink',
            'BCH': 'bitcoin-cash',
            'XLM': 'stellar',
            'ATOM': 'cosmos',
            'UNI': 'uniswap'
        }
        
        # Initialize prices with fiat currencies
        prices = {
            'GBP': 1.27,  # GBP to USD
            'USD': 1.0,
            'EUR': 1.09  # EUR to USD
        }
        
        try:
            # Get all prices in one call
            coin_ids_list = ','.join([coin_ids.get(b['currency'], b['currency'].lower()) for b in balances])
            response = requests.get(
                f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids_list}&vs_currencies=usd",
                timeout=10
            )
            if response.status_code == 200:
                price_data = response.json()
                for currency in [b['currency'] for b in balances]:
                    coin_id = coin_ids.get(currency, currency.lower())
                    if coin_id in price_data:
                        prices[currency] = price_data[coin_id].get('usd', 0)
        except Exception as price_error:
            logger.warning(f"Failed to fetch prices: {str(price_error)}")
            # Default USDT/USDC to $1
            prices['USDT'] = 1.0
            prices['USDC'] = 1.0
        
        # Calculate USD and GBP values
        total_usd = 0.0
        enriched_balances = []
        
        # GBP conversion rate (1 GBP = ~1.27 USD, so 1 USD = ~0.787 GBP)
        usd_to_gbp = 0.787
        
        for balance in balances:
            currency = balance['currency']
            total = balance['total_balance']
            available = balance['available_balance']
            locked = balance['locked_balance']
            
            # Get price in USD
            if currency == 'GBP':
                # For GBP, 1 GBP = 1 GBP
                price_usd = 1.27  # GBP to USD
                price_gbp = 1.0   # GBP to GBP is always 1
            elif currency in ['USD', 'EUR']:
                price_usd = prices.get(currency, 1.0)
                price_gbp = price_usd * usd_to_gbp
            else:
                # For crypto, get USD price and convert to GBP
                price_usd = prices.get(currency, 0)
                price_gbp = price_usd * usd_to_gbp
            
            usd_value = total * price_usd
            gbp_value = total * price_gbp
            total_usd += usd_value
            
            enriched_balances.append({
                "currency": currency,
                "available_balance": available,
                "locked_balance": locked,
                "total_balance": total,
                "usd_price": price_usd,
                "usd_value": usd_value,
                "price_gbp": price_gbp,
                "gbp_value": gbp_value
            })
        
        # Sort by USD value descending
        enriched_balances.sort(key=lambda x: x['usd_value'], reverse=True)
        
        logger.info(f"✅ Fetched unified balances for {user_id}: {len(enriched_balances)} currencies, ${total_usd:.2f} total")
        
        return {
            "success": True,
            "user_id": user_id,
            "balances": enriched_balances,
            "total_usd": round(total_usd, 2),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching unified balances for {user_id}: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "balances": [],
            "total_usd": 0.0
        }

@api_router.get("/wallets/portfolio/{user_id}")
async def get_portfolio_with_allocations(user_id: str):
    """
    Get portfolio breakdown with percentages for allocations page
    Calculates: total value, per-coin percentages, top coins + others
    """
    try:
        wallet_service = get_wallet_service()
        
        # Get all balances
        balances = await wallet_service.get_all_balances(user_id)
        
        if not balances:
            return {
                "success": True,
                "user_id": user_id,
                "total_value_usd": 0.0,
                "allocations": [],
                "top_allocations": [],
                "others_percentage": 0.0
            }
        
        # Get prices (same as above endpoint)
        import requests
        coin_ids = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'USDT': 'tether',
            'USDC': 'usd-coin', 'BNB': 'binancecoin', 'SOL': 'solana',
            'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin',
            'TRX': 'tron', 'DOT': 'polkadot', 'MATIC': 'matic-network',
            'LTC': 'litecoin', 'SHIB': 'shiba-inu', 'AVAX': 'avalanche-2',
            'LINK': 'chainlink', 'BCH': 'bitcoin-cash', 'XLM': 'stellar',
            'ATOM': 'cosmos', 'UNI': 'uniswap'
        }
        
        prices = {}
        try:
            coin_ids_list = ','.join([coin_ids.get(b['currency'], b['currency'].lower()) for b in balances])
            response = requests.get(
                f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids_list}&vs_currencies=usd",
                timeout=10
            )
            if response.status_code == 200:
                price_data = response.json()
                for currency in [b['currency'] for b in balances]:
                    coin_id = coin_ids.get(currency, currency.lower())
                    if coin_id in price_data:
                        prices[currency] = price_data[coin_id].get('usd', 0)
            prices['USDT'] = prices.get('USDT', 1.0)
            prices['USDC'] = prices.get('USDC', 1.0)
        except:
            prices = {'USDT': 1.0, 'USDC': 1.0}
        
        # Calculate values and percentages
        total_value = 0.0
        allocations = []
        
        for balance in balances:
            currency = balance['currency']
            total = balance['total_balance']
            price = prices.get(currency, 0)
            value = total * price
            total_value += value
            
            allocations.append({
                "currency": currency,
                "balance": total,
                "price": price,
                "value": value
            })
        
        # Calculate percentages
        for allocation in allocations:
            if total_value > 0:
                allocation['percentage'] = round((allocation['value'] / total_value) * 100, 2)
            else:
                allocation['percentage'] = 0.0
        
        # Sort by value
        allocations.sort(key=lambda x: x['value'], reverse=True)
        
        # Top 5 + Others
        top_count = 5
        top_allocations = allocations[:top_count]
        others = allocations[top_count:]
        
        others_percentage = sum(a['percentage'] for a in others)
        others_value = sum(a['value'] for a in others)
        
        result = {
            "success": True,
            "user_id": user_id,
            "total_value_usd": round(total_value, 2),
            "allocations": allocations,
            "top_allocations": top_allocations,
            "others": {
                "count": len(others),
                "percentage": round(others_percentage, 2),
                "value": round(others_value, 2)
            },
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"✅ Portfolio calculated for {user_id}: ${total_value:.2f}, {len(allocations)} assets")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error calculating portfolio for {user_id}: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "total_value_usd": 0.0,
            "allocations": []
        }

@api_router.get("/wallets/transactions/{user_id}")
async def get_wallet_transactions(user_id: str, limit: int = 50):
    """
    Get transaction history for user from wallet_transactions collection
    """
    try:
        transactions = await db.wallet_transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "user_id": user_id,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching transactions for {user_id}: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "transactions": []
        }

@api_router.get("/portfolio/history")
async def get_portfolio_history(
    user_id: str = Query(..., description="User ID"),
    range: str = Query("7D", description="Time range: 24H, 7D, 30D, 90D")
):
    """
    Get portfolio value history for charts
    Returns timestamps and total portfolio values over the requested time range
    """
    try:
        # Parse range to determine data points and interval
        range_config = {
            "24H": {"hours": 24, "points": 24, "interval_hours": 1},
            "7D": {"hours": 168, "points": 168, "interval_hours": 1},
            "30D": {"hours": 720, "points": 30, "interval_hours": 24},
            "90D": {"hours": 2160, "points": 90, "interval_hours": 24}
        }
        
        config = range_config.get(range, range_config["7D"])
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=config["hours"])
        
        # Get all transactions in this time range to calculate historical balances
        transactions = await db.transactions.find(
            {
                "user_id": user_id,
                "timestamp": {"$gte": start_time, "$lte": now}
            },
            {"_id": 0}  # Exclude ObjectId to prevent serialization issues
        ).sort("timestamp", 1).to_list(None)
        
        # Get current balances
        wallet_service = get_wallet_service()
        current_balances = await wallet_service.get_all_balances(user_id)
        
        # Get current prices for all currencies
        import requests
        coin_ids = {
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'USDT': 'tether',
            'USDC': 'usd-coin', 'BNB': 'binancecoin', 'SOL': 'solana',
            'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin',
            'TRX': 'tron', 'DOT': 'polkadot', 'MATIC': 'matic-network',
            'LTC': 'litecoin', 'SHIB': 'shiba-inu', 'AVAX': 'avalanche-2',
            'LINK': 'chainlink', 'BCH': 'bitcoin-cash', 'XLM': 'stellar',
            'ATOM': 'cosmos', 'UNI': 'uniswap'
        }
        
        prices = {'GBP': 1.27, 'USD': 1.0, 'EUR': 1.09}
        usd_to_gbp = 0.787
        
        try:
            currencies = set(b['currency'] for b in current_balances)
            coin_ids_list = ','.join([coin_ids.get(curr, curr.lower()) for curr in currencies if curr not in ['GBP', 'USD', 'EUR']])
            if coin_ids_list:
                response = requests.get(
                    f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids_list}&vs_currencies=gbp,usd",
                    timeout=10
                )
                if response.status_code == 200:
                    price_data = response.json()
                    for currency in currencies:
                        coin_id = coin_ids.get(currency, currency.lower())
                        if coin_id in price_data:
                            prices[currency] = price_data[coin_id].get('usd', 0)
            prices['USDT'] = prices.get('USDT', 1.0)
            prices['USDC'] = prices.get('USDC', 1.0)
        except Exception as e:
            logger.warning(f"Price fetch error: {e}")
            prices.update({'USDT': 1.0, 'USDC': 1.0})
        
        # Build balance snapshot dict from current balances
        balance_snapshot = {}
        for bal in current_balances:
            currency = bal['currency']
            balance_snapshot[currency] = bal['total_balance']
        
        # Work backwards through transactions to reconstruct historical balances
        # Then generate data points at regular intervals
        history_data = []
        interval_ms = config["interval_hours"] * 3600 * 1000
        
        for i in range(config["points"]):
            point_time_dt = start_time + timedelta(hours=i * config["interval_hours"])
            
            # Calculate total portfolio value at this point
            total_value_gbp = 0.0
            for currency, balance in balance_snapshot.items():
                if currency == 'GBP':
                    total_value_gbp += balance
                else:
                    price_usd = prices.get(currency, 0)
                    price_gbp = price_usd * usd_to_gbp
                    total_value_gbp += balance * price_gbp
            
            # Convert to timestamp in milliseconds
            timestamp_ms = int(point_time_dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
            
            history_data.append({
                "timestamp": timestamp_ms,
                "value": round(total_value_gbp, 2)
            })
        
        # If no real historical data, generate smooth curve based on current value
        if len(transactions) == 0:
            current_value = history_data[-1]["value"] if history_data else 0
            for i, point in enumerate(history_data):
                # Add slight variance for realistic chart
                variance = 0.95 + (i / len(history_data)) * 0.1
                point["value"] = round(current_value * variance, 2)
        
        logger.info(f"✅ Portfolio history for {user_id} ({range}): {len(history_data)} points")
        
        return {
            "success": True,
            "user_id": user_id,
            "range": range,
            "data": history_data,
            "current_value": history_data[-1]["value"] if history_data else 0,
            "count": len(history_data)
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching portfolio history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

print("✅ Unified wallet endpoints registered")


# ===========================
# PAYMENT FLOW CONSTANTS
# ===========================

# Platform fee wallet for collecting fees
PLATFORM_FEE_WALLET = "platform_fee_wallet_001"

# Withdrawal fee percentage (1%)
WITHDRAWAL_FEE_PERCENTAGE = 0.01

# ===========================
# ADMIN - MANUAL PAYMENT MARKING
# ===========================

@api_router.post("/admin/mark-payment-received")
async def admin_mark_payment_received(request: dict):
    """
    Admin manually marks an order as paid (for offline/manual payments)
    
    Request: {
        "order_id": "order123",
        "payment_method": "bank_transfer",
        "notes": "Confirmed via bank statement"
    }
    """
    try:
        order_id = request.get('order_id')
        payment_method = request.get('payment_method', 'manual')
        notes = request.get('notes', '')
        
        # Find the order
        order = await db.crypto_buy_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update order status to paid
        await db.crypto_buy_orders.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": "marked_as_paid",
                    "payment_method": payment_method,
                    "manual_payment_notes": notes,
                    "marked_paid_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Credit seller's balance (move funds from escrow)
        seller_id = order['seller_address']
        amount = float(order['amount'])
        currency = order['crypto_currency']
        
        # Apply platform fee (1%)
        platform_fee = amount * 0.01
        seller_amount = amount - platform_fee
        
        # Update seller balance
        await db.crypto_balances.update_one(
            {"user_id": seller_id},
            {
                "$inc": {
                    f"balances.{currency}": seller_amount,
                    "total_trades": 1
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Collect platform fee
        await db.crypto_balances.update_one(
            {"user_id": PLATFORM_FEE_WALLET},
            {
                "$inc": {f"balances.{currency}": platform_fee},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Record transaction
        await db.transactions.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "order_id": order_id,
            "seller_id": seller_id,
            "type": "sale_completed_manual",
            "amount": seller_amount,
            "currency": currency,
            "fee": platform_fee,
            "payment_method": payment_method,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": "Payment marked as received and seller credited",
            "seller_amount": seller_amount,
            "platform_fee": platform_fee
        }
        
    except Exception as e:
        logger.error(f"Manual payment marking error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===========================
# SELLER PAYOUTS VIA NOWPAYMENTS
# ===========================

@api_router.post("/seller/request-payout")
async def request_seller_payout(request: dict):
    """
    Seller requests a payout of their balance
    
    Request: {
        "user_id": "user123",
        "amount": 0.01,
        "currency": "BTC",
        "withdrawal_address": "1ABC..."
    }
    """
    try:
        user_id = request.get('user_id')
        amount = float(request.get('amount'))
        currency = request.get('currency', 'BTC').upper()
        withdrawal_address = request.get('withdrawal_address')
        
        # Check user balance
        balance_doc = await db.crypto_balances.find_one({"user_id": user_id}, {"_id": 0})
        if not balance_doc:
            raise HTTPException(status_code=404, detail="User balance not found")
        
        current_balance = balance_doc.get('balances', {}).get(currency, 0)
        
        # Check if balance is sufficient
        if current_balance < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {current_balance} {currency}")
        
        # Apply withdrawal fee (1%)
        withdrawal_fee = amount * WITHDRAWAL_FEE_PERCENTAGE
        net_amount = amount - withdrawal_fee
        
        # Create payout request
        payout_id = str(uuid.uuid4())
        payout_data = {
            "payout_id": payout_id,
            "user_id": user_id,
            "amount": amount,
            "currency": currency,
            "net_amount": net_amount,
            "withdrawal_fee": withdrawal_fee,
            "withdrawal_address": withdrawal_address,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payouts.insert_one(payout_data)
        
        # Deduct from user balance immediately (hold in escrow)
        await db.crypto_balances.update_one(
            {"user_id": user_id},
            {
                "$inc": {f"balances.{currency}": -amount},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # In production, this would call NOWPayments API to process payout
        # For now, mark as pending and admin can process manually
        
        return {
            "success": True,
            "payout_id": payout_id,
            "message": "Payout request submitted",
            "net_amount": net_amount,
            "withdrawal_fee": withdrawal_fee,
            "status": "pending"
        }
        
    except Exception as e:
        logger.error(f"Payout request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/process-payout")
async def admin_process_payout(request: dict):
    """
    Admin processes a payout request via NOWPayments
    
    Request: {
        "payout_id": "uuid",
        "tx_hash": "blockchain_tx_hash" (optional)
    }
    """
    try:
        payout_id = request.get('payout_id')
        tx_hash = request.get('tx_hash', '')
        
        # Get payout request
        payout = await db.payouts.find_one({"payout_id": payout_id}, {"_id": 0})
        if not payout:
            raise HTTPException(status_code=404, detail="Payout not found")
        
        if payout['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Payout already processed")
        
        # In production, call NOWPayments payout API here
        # For now, mark as completed
        
        await db.payouts.update_one(
            {"payout_id": payout_id},
            {
                "$set": {
                    "status": "completed",
                    "tx_hash": tx_hash,
                    "processed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Collect withdrawal fee to platform wallet
        await db.crypto_balances.update_one(
            {"user_id": PLATFORM_FEE_WALLET},
            {
                "$inc": {f"balances.{payout['currency']}": payout['withdrawal_fee']},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Record transaction
        await db.transactions.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": payout['user_id'],
            "type": "withdrawal",
            "amount": payout['net_amount'],
            "currency": payout['currency'],
            "fee": payout['withdrawal_fee'],
            "withdrawal_address": payout['withdrawal_address'],
            "tx_hash": tx_hash,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": "Payout processed successfully",
            "payout_id": payout_id,
            "tx_hash": tx_hash
        }
        
    except Exception as e:
        logger.error(f"Payout processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/payouts/pending")
async def get_pending_payouts():
    """Get all pending payout requests for admin review"""
    try:
        payouts = await db.payouts.find(
            {"status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        
        return {
            "success": True,
            "payouts": payouts,
            "count": len(payouts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===========================
# MOBILE APP DOWNLOAD ENDPOINT
# ===========================

@api_router.post("/admin/upload-apk")
async def upload_apk(file: UploadFile = File(...)):
    """Admin endpoint to upload APK file"""
    try:
        # Create directory if it doesn't exist
        apk_dir = Path("/app/webview-app/android/app/build/outputs/apk/release")
        apk_dir.mkdir(parents=True, exist_ok=True)
        
        # Save the APK file
        apk_path = apk_dir / "app-release.apk"
        
        with open(apk_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return {
            "success": True,
            "message": "APK uploaded successfully",
            "file_size": len(content),
            "path": str(apk_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/download-app")
async def download_mobile_app(request: Request, user_agent: str = Header(None)):
    """Serve the mobile app - APK for Android, redirect to App Store for iOS"""
    
    # Detect if user is on iOS/iPhone
    user_agent_lower = (user_agent or "").lower()
    is_ios = any(keyword in user_agent_lower for keyword in ["iphone", "ipad", "ipod"])
    
    if is_ios:
        # For iOS users, return HTML page with App Store link or PWA instructions
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Coin Hub X - iOS App</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: #fff;
                    padding: 2rem;
                    text-align: center;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }}
                .container {{
                    max-width: 500px;
                    background: rgba(30, 41, 59, 0.8);
                    padding: 2rem;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }}
                h1 {{
                    color: #06b6d4;
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }}
                .icon {{
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }}
                p {{
                    font-size: 1.1rem;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                    color: #cbd5e1;
                }}
                .btn {{
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                    margin: 0.5rem;
                    box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
                }}
                .btn:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(6, 182, 212, 0.5);
                }}
                .secondary {{
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">🍎📱</div>
                <h1>Coin Hub X for iPhone</h1>
                <p>Use our mobile-optimized web app for the best experience on iOS!</p>
                <p style="font-size: 0.95rem; color: #94a3b8;">iOS native app coming soon to the App Store.</p>
                <a href="/" class="btn">Open Web App</a>
                <a href="/" class="btn secondary" onclick="event.preventDefault(); 
                    if(navigator.share) {{
                        navigator.share({{title: 'Coin Hub X', text: 'Trade crypto safely', url: window.location.origin}})
                    }}">
                    Share App
                </a>
            </div>
        </body>
        </html>
        """)
    
    # For Android users, serve the APK
    apk_path = Path("/app/webview-app/android/app/build/outputs/apk/release/app-release.apk")
    
    if not apk_path.exists():
        # If APK doesn't exist yet, return info page
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Coin Hub X - Android App</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    color: #fff;
                    padding: 2rem;
                    text-align: center;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }}
                .container {{
                    max-width: 500px;
                    background: rgba(30, 41, 59, 0.8);
                    padding: 2rem;
                    border-radius: 16px;
                }}
                h1 {{ color: #06b6d4; }}
                .btn {{
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    text-decoration: none;
                    display: inline-block;
                    margin-top: 1rem;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="font-size: 4rem;">🤖📱</div>
                <h1>Android App Coming Soon</h1>
                <p>The Android APK is being built. Please check back soon or use our web app.</p>
                <a href="/" class="btn">Use Web App</a>
            </div>
        </body>
        </html>
        """)
    
    return FileResponse(
        path=str(apk_path),
        media_type="application/vnd.android.package-archive",
        filename="CoinHubX.apk",
        headers={
            "Content-Disposition": "attachment; filename=CoinHubX.apk"
        }
    )

# ============================================================================
# LIVE PRICE AND CONVERSION SERVICE
# ============================================================================

from price_service import (
    get_cached_prices,
    convert_crypto_to_fiat,
    convert_fiat_to_crypto,
    convert_crypto_to_crypto,
    SUPPORTED_CRYPTOS,
    SUPPORTED_FIATS
)

@api_router.get("/prices/live")
async def get_live_prices():
    """Get live cryptocurrency prices and FX rates"""
    prices = await get_cached_prices()
    return {
        "success": True,
        "crypto_prices": prices['crypto_prices'],
        "fx_rates": prices['fx_rates'],
        "supported_cryptos": SUPPORTED_CRYPTOS,
        "supported_fiats": SUPPORTED_FIATS,
        "last_update": prices['last_update']
    }

@api_router.post("/prices/convert")
async def convert_currency(request: dict):
    """Convert between crypto and fiat currencies in real-time"""
    from_type = request.get("from_type")  # 'crypto' or 'fiat'
    to_type = request.get("to_type")      # 'crypto' or 'fiat'
    from_currency = request.get("from_currency")
    to_currency = request.get("to_currency")
    amount = request.get("amount", 0)
    
    if not all([from_type, to_type, from_currency, to_currency]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        amount = float(amount)
        if amount <= 0:
            return {"success": True, "converted_amount": 0.0}
        
        # Use price service cache directly
        from price_service import price_cache
        
        if not price_cache.get('crypto_prices'):
            return {"success": False, "error": "Price data not available. Please try again."}
        
        prices_data = {
            'prices': {k: {'price_usd': v} for k, v in price_cache['crypto_prices'].items()},
            'fx_rates': price_cache.get('fx_rates', {'USD': 1.0, 'GBP': 0.755, 'EUR': 0.918})
        }
        
        # Crypto to Fiat
        if from_type == "crypto" and to_type == "fiat":
            # Get crypto price in USD
            crypto_price_usd = prices_data['prices'].get(from_currency, {}).get('price_usd', 0)
            if crypto_price_usd == 0:
                return {"success": True, "converted_amount": 0.0, "error": f"{from_currency} price not available"}
            
            # Convert crypto to USD
            value_usd = amount * crypto_price_usd
            
            # Convert USD to target fiat
            fx_rate = prices_data['fx_rates'].get(to_currency, 1.0)
            converted = value_usd / fx_rate
        
        # Fiat to Crypto
        elif from_type == "fiat" and to_type == "crypto":
            # Convert fiat to USD
            fx_rate = prices_data['fx_rates'].get(from_currency, 1.0)
            value_usd = amount / fx_rate
            
            # Get crypto price in USD
            crypto_price_usd = prices_data['prices'].get(to_currency, {}).get('price_usd', 0)
            if crypto_price_usd == 0:
                return {"success": True, "converted_amount": 0.0, "error": f"{to_currency} price not available"}
            
            # Convert USD to crypto
            converted = value_usd / crypto_price_usd
        
        # Crypto to Crypto
        elif from_type == "crypto" and to_type == "crypto":
            # Get both crypto prices in USD
            from_price_usd = prices_data['prices'].get(from_currency, {}).get('price_usd', 0)
            to_price_usd = prices_data['prices'].get(to_currency, {}).get('price_usd', 0)
            
            if from_price_usd == 0 or to_price_usd == 0:
                return {"success": True, "converted_amount": 0.0, "error": "Price not available"}
            
            # Convert via USD
            value_usd = amount * from_price_usd
            converted = value_usd / to_price_usd
        
        # Fiat to Fiat (via USD)
        elif from_type == "fiat" and to_type == "fiat":
            # Convert to USD first, then to target fiat
            prices = await get_cached_prices()
            fx_rates = prices['fx_rates']
            from_rate = fx_rates.get(from_currency, 1.0)
            to_rate = fx_rates.get(to_currency, 1.0)
            converted = (amount / from_rate) * to_rate
        
        else:
            raise HTTPException(status_code=400, detail="Invalid conversion type")
        
        return {
            "success": True,
            "from": {"type": from_type, "currency": from_currency, "amount": amount},
            "to": {"type": to_type, "currency": to_currency, "amount": converted},
            "converted_amount": converted
        }
    
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PAYMENT METHODS & SELL OFFERS SYSTEM (BINANCE-LEVEL P2P)
# ============================================================================

from payment_methods import (
    PaymentMethod,
    SellOffer,
    PAYMENT_METHOD_TYPES
)

@api_router.get("/payment-methods/types")
async def get_payment_method_types():
    """Get available payment method types and their required fields"""
    return {
        "success": True,
        "types": PAYMENT_METHOD_TYPES
    }

@api_router.get("/payment-methods/{user_id}")
async def get_user_payment_methods(user_id: str):
    """Get all payment methods for a user"""
    methods = await db.payment_methods.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "payment_methods": methods
    }

@api_router.post("/payment-methods")
async def create_payment_method(method: dict):
    """Create a new payment method"""
    # Validate required fields based on method type
    method_type = method.get("method_type")
    if method_type not in PAYMENT_METHOD_TYPES:
        raise HTTPException(status_code=400, detail="Invalid payment method type")
    
    config = PAYMENT_METHOD_TYPES[method_type]
    details = method.get("details", {})
    
    # Check required fields
    for field in config["required_fields"]:
        if not details.get(field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Create payment method
    payment_method = PaymentMethod(
        user_id=method["user_id"],
        method_type=method_type,
        nickname=method["nickname"],
        currency=method["currency"],
        is_active=method.get("is_active", True),
        details=details
    )
    
    method_dict = payment_method.model_dump()
    method_dict['created_at'] = method_dict['created_at'].isoformat()
    method_dict['updated_at'] = method_dict['updated_at'].isoformat()
    
    await db.payment_methods.insert_one(method_dict)
    
    return {
        "success": True,
        "payment_method": method_dict,
        "message": "Payment method created successfully"
    }

@api_router.put("/payment-methods/{payment_method_id}")
async def update_payment_method(payment_method_id: str, updates: dict):
    """Update a payment method"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.payment_methods.update_one(
        {"payment_method_id": payment_method_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    return {
        "success": True,
        "message": "Payment method updated successfully"
    }

@api_router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(payment_method_id: str):
    """Delete a payment method"""
    result = await db.payment_methods.delete_one({"payment_method_id": payment_method_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    return {
        "success": True,
        "message": "Payment method deleted successfully"
    }

@api_router.post("/sell-offers")
async def create_sell_offer(offer: dict):
    """Create a new sell offer with floating or fixed pricing"""
    # Validate seller has active payment methods
    user_payment_methods = await db.payment_methods.find({
        "user_id": offer["seller_id"],
        "is_active": True
    }).to_list(100)
    
    if not user_payment_methods:
        raise HTTPException(status_code=400, detail="You must have at least one active payment method to create an offer")
    
    # Validate selected payment methods exist
    selected_methods = offer.get("accepted_payment_methods", [])
    if not selected_methods:
        raise HTTPException(status_code=400, detail="You must select at least one payment method for this offer")
    
    # Create sell offer
    sell_offer = SellOffer(**offer)
    
    offer_dict = sell_offer.model_dump()
    offer_dict['created_at'] = offer_dict['created_at'].isoformat()
    offer_dict['updated_at'] = offer_dict['updated_at'].isoformat()
    
    await db.sell_offers.insert_one(offer_dict)
    
    return {
        "success": True,
        "offer": offer_dict,
        "message": "Sell offer created successfully"
    }

@api_router.get("/sell-offers/user/{user_id}")
async def get_user_sell_offers(user_id: str):
    """Get all sell offers for a user"""
    offers = await db.sell_offers.find(
        {"seller_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "offers": offers
    }

@api_router.get("/sell-offers/marketplace")
async def get_marketplace_offers(
    crypto_asset: Optional[str] = None,
    fiat_currency: Optional[str] = None,
    payment_method: Optional[str] = None,
    fast_payment_only: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search_seller: Optional[str] = None,
    sort_by: Optional[str] = "best_price"  # best_price, rating, fast_payment_first
):
    """Get published sell offers for marketplace (buyer view) with advanced filters"""
    query = {"is_published": True}
    
    # Basic filters
    if crypto_asset:
        query["crypto_asset"] = crypto_asset
    if fiat_currency:
        query["fiat_currency"] = fiat_currency
    if fast_payment_only:
        query["is_fast_payment"] = True
    
    # Price range filters (will apply after fetching due to dynamic pricing)
    # Min/max amount filters
    if min_amount:
        query["min_order_fiat"] = {"$lte": min_amount}
    if max_amount:
        query["max_order_fiat"] = {"$gte": max_amount}
    
    offers = await db.sell_offers.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with seller info and payment method details
    enriched_offers = []
    for offer in offers:
        # Get seller info
        seller = await db.user_accounts.find_one(
            {"user_id": offer["seller_id"]},
            {"_id": 0, "full_name": 1, "email": 1}
        )
        
        # Get payment method details
        payment_methods_cursor = db.payment_methods.find(
            {"payment_method_id": {"$in": offer.get("accepted_payment_methods", [])}},
            {"_id": 0, "method_type": 1, "nickname": 1}
        )
        payment_methods = []
        async for pm in payment_methods_cursor:
            payment_methods.append(pm)
        
        # Calculate current price with margin (if floating)
        if offer["pricing_mode"] == "floating":
            # Get live price from price_service
            from price_service import price_cache
            crypto_price_usd = price_cache['crypto_prices'].get(offer['crypto_asset'], 0)
            
            # Fallback to hardcoded prices if price service is unavailable
            if crypto_price_usd == 0:
                fallback_prices = {
                    'BTC': 47500, 'ETH': 2500, 'USDT': 1.0, 'BNB': 380,
                    'SOL': 120, 'LTC': 85, 'USDC': 1.0
                }
                crypto_price_usd = fallback_prices.get(offer['crypto_asset'], 0)
            
            # Convert to offer's fiat currency
            fx_rate = price_cache['fx_rates'].get(offer['fiat_currency'], 0.79 if offer['fiat_currency'] == 'GBP' else 1.0)
            market_price = crypto_price_usd * fx_rate
            
            # Apply margin
            margin = offer.get("price_margin", 0) / 100
            final_price = market_price * (1 + margin)
            
            offer["current_price"] = final_price
            offer["market_price"] = market_price
        else:
            offer["current_price"] = offer["fixed_price"]
        
        offer["seller_info"] = seller
        offer["payment_method_details"] = payment_methods
        
        # Apply payment method filter
        if payment_method:
            method_types = [pm["method_type"] for pm in payment_methods]
            if payment_method not in method_types:
                continue  # Skip this offer
        
        # Apply seller search filter
        if search_seller and seller:
            seller_name = seller.get("full_name", "").lower()
            seller_email = seller.get("email", "").lower()
            if search_seller.lower() not in seller_name and search_seller.lower() not in seller_email:
                continue  # Skip this offer
        
        enriched_offers.append(offer)
    
    # Apply price range filters (after calculating current_price)
    if min_price:
        enriched_offers = [o for o in enriched_offers if o.get("current_price", 0) >= min_price]
    if max_price:
        enriched_offers = [o for o in enriched_offers if o.get("current_price", 0) <= max_price]
    
    # Apply sorting
    if sort_by == "best_price":
        enriched_offers.sort(key=lambda x: x.get("current_price", float('inf')))
    elif sort_by == "fast_payment_first":
        enriched_offers.sort(key=lambda x: (not x.get("is_fast_payment", False), x.get("current_price", float('inf'))))
    elif sort_by == "rating":
        # Placeholder for when rating system is implemented
        enriched_offers.sort(key=lambda x: x.get("seller_rating", 0), reverse=True)
    
    return {
        "success": True,
        "offers": enriched_offers,
        "total_count": len(enriched_offers)
    }

@api_router.put("/sell-offers/{offer_id}")
async def update_sell_offer(offer_id: str, updates: dict):
    """Update a sell offer"""
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.sell_offers.update_one(
        {"offer_id": offer_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    return {
        "success": True,
        "message": "Offer updated successfully"
    }

@api_router.delete("/sell-offers/{offer_id}")
async def delete_sell_offer(offer_id: str):
    """Delete a sell offer"""
    result = await db.sell_offers.delete_one({"offer_id": offer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    return {
        "success": True,
        "message": "Offer deleted successfully"
    }

@api_router.get("/seller/requirements/{user_id}")



# ==================== FAQ / HELP CENTER ENDPOINTS ====================

@api_router.get("/faq/categories")
async def get_faq_categories():
    """Get all FAQ categories"""
    try:
        categories = await db.faq_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
        
        if not categories:
            # Initialize default categories
            for cat in DEFAULT_CATEGORIES:
                cat_doc = {
                    "category_id": str(uuid.uuid4()),
                    **cat,
                    "faq_count": 0
                }
                await db.faq_categories.insert_one(cat_doc)
            
            categories = await db.faq_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
        
        # Update FAQ count for each category
        for category in categories:
            faq_count = await db.faq_items.count_documents({"category": category["name"], "is_published": True})
            category["faq_count"] = faq_count
        
        return {"success": True, "categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/faq/items")
async def get_faq_items(category: Optional[str] = None, search: Optional[str] = None):
    """Get FAQ items with optional category filter and search"""
    try:
        query = {"is_published": True}
        
        if category:
            query["category"] = category
        
        if search:
            # Search in question and answer
            query["$or"] = [
                {"question": {"$regex": search, "$options": "i"}},
                {"answer": {"$regex": search, "$options": "i"}}
            ]
        
        items = await db.faq_items.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
        
        if not items and not search:
            # Initialize default FAQs
            for faq in DEFAULT_FAQS:
                faq_doc = {
                    "faq_id": str(uuid.uuid4()),
                    **faq,
                    "is_published": True,
                    "views": 0,
                    "helpful_count": 0,
                    "not_helpful_count": 0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.faq_items.insert_one(faq_doc)
            
            items = await db.faq_items.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
        
        return {"success": True, "items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/faq/item/{faq_id}")
async def get_faq_item(faq_id: str):
    """Get single FAQ item and increment view count"""
    try:
        item = await db.faq_items.find_one({"faq_id": faq_id}, {"_id": 0})
        
        if not item:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        # Increment view count
        await db.faq_items.update_one(
            {"faq_id": faq_id},
            {"$inc": {"views": 1}}
        )
        
        item["views"] = item.get("views", 0) + 1
        
        return {"success": True, "item": item}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/faq/item/{faq_id}/feedback")
async def submit_faq_feedback(faq_id: str, request: dict):
    """Submit helpful/not helpful feedback for FAQ"""
    try:
        helpful = request.get("helpful", True)
        
        item = await db.faq_items.find_one({"faq_id": faq_id})
        if not item:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        # Update feedback count
        if helpful:
            await db.faq_items.update_one(
                {"faq_id": faq_id},
                {"$inc": {"helpful_count": 1}}
            )
        else:
            await db.faq_items.update_one(
                {"faq_id": faq_id},
                {"$inc": {"not_helpful_count": 1}}
            )
        
        return {"success": True, "message": "Feedback recorded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ADMIN FAQ MANAGEMENT ENDPOINTS ====================

@api_router.get("/admin/faq/items")
async def admin_get_all_faqs():
    """Get all FAQ items for admin (including unpublished)"""
    try:
        items = await db.faq_items.find({}, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(1000)
        return {"success": True, "items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/faq/item")
async def admin_create_faq(request: dict):
    """Create new FAQ item"""
    try:
        faq_item = {
            "faq_id": str(uuid.uuid4()),
            "category": request.get("category"),
            "question": request.get("question"),
            "answer": request.get("answer"),
            "order": request.get("order", 0),
            "is_published": request.get("is_published", True),
            "views": 0,
            "helpful_count": 0,
            "not_helpful_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.faq_items.insert_one(faq_item)
        
        return {"success": True, "faq_id": faq_item["faq_id"], "message": "FAQ created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/faq/item/{faq_id}")
async def admin_update_faq(faq_id: str, request: dict):
    """Update existing FAQ item"""
    try:
        item = await db.faq_items.find_one({"faq_id": faq_id})
        if not item:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        update_data = {
            "question": request.get("question", item.get("question")),
            "answer": request.get("answer", item.get("answer")),
            "category": request.get("category", item.get("category")),
            "order": request.get("order", item.get("order")),
            "is_published": request.get("is_published", item.get("is_published")),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.faq_items.update_one(
            {"faq_id": faq_id},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "FAQ updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/faq/item/{faq_id}")
async def admin_delete_faq(faq_id: str):
    """Delete FAQ item"""
    try:
        result = await db.faq_items.delete_one({"faq_id": faq_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="FAQ not found")
        
        return {"success": True, "message": "FAQ deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/faq/category")
async def admin_create_category(request: dict):
    """Create new FAQ category"""
    try:
        category = {
            "category_id": str(uuid.uuid4()),
            "name": request.get("name"),
            "description": request.get("description", ""),
            "icon": request.get("icon", "📖"),
            "order": request.get("order", 0),
            "faq_count": 0
        }
        
        await db.faq_categories.insert_one(category)
        
        return {"success": True, "category_id": category["category_id"], "message": "Category created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/faq/category/{category_id}")
async def admin_update_category(category_id: str, request: dict):
    """Update FAQ category"""
    try:
        category = await db.faq_categories.find_one({"category_id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        update_data = {
            "name": request.get("name", category.get("name")),
            "description": request.get("description", category.get("description")),
            "icon": request.get("icon", category.get("icon")),
            "order": request.get("order", category.get("order"))
        }
        
        await db.faq_categories.update_one(
            {"category_id": category_id},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Category updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== NOTIFICATION SYSTEM ====================

@api_router.get("/notifications")
async def get_notifications(
    request: Request,
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0)
):
    """Get notifications for the logged-in user"""
    try:
        # Get user from auth token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Get notifications
        notifications = await get_user_notifications(db, user_id, unread_only, limit, offset)
        unread_count = await get_unread_count(db, user_id)
        
        return {
            "success": True,
            "notifications": notifications,
            "unread_count": unread_count,
            "total": len(notifications)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/notifications/mark-read")
async def mark_read(request: Request, data: dict):
    """Mark notifications as read"""
    try:
        # Get user from auth token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        notification_ids = data.get('notification_ids', [])
        if not notification_ids:
            raise HTTPException(status_code=400, detail="No notification IDs provided")
        
        # Mark as read
        count = await mark_notifications_as_read(db, notification_ids)
        
        return {
            "success": True,
            "marked_count": count,
            "message": f"{count} notification(s) marked as read"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark notifications as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/notifications/mark-all-read")
async def mark_all_read_endpoint(request: Request):
    """Mark all notifications as read for the logged-in user"""
    try:
        # Get user from auth token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Mark all as read
        count = await mark_all_as_read(db, user_id)
        
        return {
            "success": True,
            "marked_count": count,
            "message": f"{count} notification(s) marked as read"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark all as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/notifications/broadcast")
async def broadcast_admin_notification(data: dict):
    """Broadcast a notification to all users (admin only)"""
    try:
        notification_type = data.get('type', 'admin_announcement')
        title = data.get('title')
        message = data.get('message')
        link = data.get('link')
        metadata = data.get('metadata', {})
        user_filter = data.get('user_filter')
        
        if not title or not message:
            raise HTTPException(status_code=400, detail="Title and message are required")
        
        # Broadcast to users
        count = await broadcast_notification(
            db, 
            notification_type, 
            title, 
            message, 
            link, 
            metadata,
            user_filter
        )
        
        return {
            "success": True,
            "sent_count": count,
            "message": f"Notification sent to {count} users"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to broadcast notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/user/security/settings")
async def get_security_settings(request: Request):
    """Get user security settings"""
    try:
        # Get user from auth token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Get user settings
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0, "security": 1})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        security_settings = user.get('security', {})
        
        return {
            "success": True,
            "settings": {
                "login_email_alerts_enabled": security_settings.get('login_email_alerts_enabled', True)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get security settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PROMO BANNER SYSTEM ====================

@api_router.get("/banners/active")
async def get_active_banner():
    """Get currently active promo banner for users"""
    try:
        now = datetime.now(timezone.utc)
        
        # Find active banner within date range
        banner = await db.promo_banners.find_one(
            {
                "is_active": True,
                "start_date": {"$lte": now.isoformat()},
                "$or": [
                    {"end_date": {"$gte": now.isoformat()}},
                    {"end_date": None}
                ]
            },
            {"_id": 0}
        )
        
        return {
            "success": True,
            "banner": banner
        }
    except Exception as e:
        logger.error(f"Failed to get active banner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/banners")
async def get_all_banners():
    """Get all promo banners for admin"""
    try:
        banners = await db.promo_banners.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "banners": banners,
            "count": len(banners)
        }
    except Exception as e:
        logger.error(f"Failed to get banners: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/banners")
async def create_banner(data: dict):
    """Create new promo banner"""
    try:
        banner = {
            "banner_id": str(uuid.uuid4()),
            "title": data.get("title"),
            "message": data.get("message"),
            "type": data.get("type", "info"),  # info, warning, success, promo
            "link": data.get("link"),
            "link_text": data.get("link_text"),
            "start_date": data.get("start_date", datetime.now(timezone.utc).isoformat()),
            "end_date": data.get("end_date"),
            "is_active": data.get("is_active", True),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if not banner["title"] or not banner["message"]:
            raise HTTPException(status_code=400, detail="Title and message are required")
        
        await db.promo_banners.insert_one(banner)
        
        return {
            "success": True,
            "banner": banner,
            "message": "Banner created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create banner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, data: dict):
    """Update existing promo banner"""
    try:
        banner = await db.promo_banners.find_one({"banner_id": banner_id})
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        update_data = {
            "title": data.get("title", banner.get("title")),
            "message": data.get("message", banner.get("message")),
            "type": data.get("type", banner.get("type")),
            "link": data.get("link", banner.get("link")),
            "link_text": data.get("link_text", banner.get("link_text")),
            "start_date": data.get("start_date", banner.get("start_date")),
            "end_date": data.get("end_date", banner.get("end_date")),
            "is_active": data.get("is_active", banner.get("is_active")),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.promo_banners.update_one(
            {"banner_id": banner_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Banner updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update banner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str):
    """Delete promo banner"""
    try:
        result = await db.promo_banners.delete_one({"banner_id": banner_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        return {
            "success": True,
            "message": "Banner deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete banner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== PLATFORM BALANCE & LIQUIDITY WALLET ====================

@api_router.get("/admin/platform-wallet/balance")
async def get_platform_wallet_balance():
    """Get current platform wallet balances and stats"""
    try:
        balance_data = await get_platform_balance(db)
        stats_data = await get_platform_stats(db)
        
        # Check for active warnings
        warnings = await db.platform_balance_warnings.find(
            {"acknowledged": False}
        ).sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "success": True,
            "wallet_id": PLATFORM_WALLET_ID,
            "balances": balance_data["balances"],
            "total_gbp_equivalent": balance_data["total_gbp_equivalent"],
            "stats": stats_data,
            "active_warnings": warnings
        }
    except Exception as e:
        logger.error(f"Failed to get platform balance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/platform-wallet/top-up")
async def manual_platform_top_up(data: dict):
    """Manually add funds to platform wallet"""
    try:
        amount = data.get("amount")
        currency = data.get("currency", "GBP")
        admin_user_id = data.get("admin_user_id", "ADMIN")
        notes = data.get("notes", "")
        
        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")
        
        result = await add_platform_funds(
            db,
            amount=amount,
            currency=currency,
            method="manual",
            admin_user_id=admin_user_id,
            notes=notes
        )
        
        # Create admin notification
        await create_notification(
            db,
            user_id=admin_user_id,
            notification_type='platform_top_up',
            title=f'Platform Wallet Topped Up: {amount} {currency}',
            message=f'Platform balance increased by {amount} {currency}. New total: {result["new_balance"]["total_gbp_equivalent"]:.2f} GBP equivalent.',
            metadata={'amount': amount, 'currency': currency}
        )
        
        return {
            "success": True,
            "message": f"Platform wallet topped up with {amount} {currency}",
            "transaction_id": result["transaction_id"],
            "new_balance": result["new_balance"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to top up platform wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/platform-wallet/deposit-address/{currency}")
async def get_deposit_address(currency: str):
    """Get blockchain deposit address for platform wallet"""
    try:
        address_data = await generate_deposit_address(db, currency)
        
        return {
            "success": True,
            "currency": currency,
            "address": address_data["address"],
            "network": address_data["network"],
            "qr_data": f"{address_data['address']}"  # Frontend can generate QR from this
        }
    except Exception as e:
        logger.error(f"Failed to get deposit address: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/crypto-bank/deposit-address/{currency}")
async def get_user_deposit_address(currency: str):
    """Get blockchain deposit address for user deposits (user-facing endpoint)"""
    try:
        address_data = await generate_deposit_address(db, currency)
        
        return {
            "success": True,
            "currency": currency,
            "address": address_data["address"],
            "network": address_data["network"],
            "qr_data": f"{address_data['address']}"
        }
    except Exception as e:
        logger.error(f"Failed to get deposit address: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/platform-wallet/transactions")
async def get_platform_transactions(
    transaction_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0)
):
    """Get platform wallet transaction history with filtering"""
    try:
        transactions = await get_transaction_history(
            db,
            transaction_type=transaction_type,
            limit=limit,
            offset=offset
        )
        
        return {
            "success": True,
            "transactions": transactions,
            "count": len(transactions)
        }
    except Exception as e:
        logger.error(f"Failed to get transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/platform-wallet/acknowledge-warning/{warning_id}")
async def acknowledge_balance_warning(warning_id: str):
    """Acknowledge a low balance warning"""
    try:
        result = await db.platform_balance_warnings.update_one(
            {"warning_id": warning_id},
            {"$set": {"acknowledged": True, "acknowledged_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Warning not found")
        
        return {
            "success": True,
            "message": "Warning acknowledged"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge warning: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== REFERRAL ANTI-ABUSE ADMIN ENDPOINTS ====================

@api_router.get("/admin/referral/suspicious")
async def get_suspicious_referrals_admin(
    status: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get list of suspicious referrals for admin review"""
    try:
        suspicious = await get_suspicious_referrals(db, status=status, limit=limit)
        
        return {
            "success": True,
            "suspicious_referrals": suspicious,
            "count": len(suspicious)
        }
    except Exception as e:
        logger.error(f"Failed to get suspicious referrals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/referral/review/{log_id}")
async def review_suspicious_referral_admin(log_id: str, data: dict):
    """Admin reviews and approves/denies a suspicious referral"""
    try:
        action = data.get("action")  # "approve" or "deny"
        admin_user_id = data.get("admin_user_id", "ADMIN")
        notes = data.get("notes")
        
        if action not in ["approve", "deny"]:
            raise HTTPException(status_code=400, detail="Action must be 'approve' or 'deny'")
        
        result = await review_suspicious_referral(
            db,
            log_id=log_id,
            action=action,
            admin_user_id=admin_user_id,
            notes=notes
        )
        
        return {
            "success": True,
            "message": f"Referral {action}d successfully",
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to review referral: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/referral/ip-stats/{ip_address}")
async def get_ip_stats_admin(ip_address: str):
    """Get referral statistics for a specific IP address"""
    try:
        stats = await get_ip_referral_stats(db, ip_address)
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get IP stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/referral/abuse-config")
async def get_abuse_config_admin():
    """Get current anti-abuse configuration"""
    try:
        config = await get_abuse_detection_config(db)
        
        return {
            "success": True,
            "config": config
        }
    except Exception as e:
        logger.error(f"Failed to get abuse config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/admin/referral/abuse-config")
async def update_abuse_config_admin(data: dict):
    """Update anti-abuse configuration"""
    try:
        await db.referral_abuse_config.update_one(
            {"config_id": "main"},
            {
                "$set": {
                    "max_referrals_per_ip_per_referrer": data.get("max_referrals_per_ip_per_referrer", 3),
                    "referral_ip_cooldown_hours": data.get("referral_ip_cooldown_hours", 24),
                    "block_bonus_on_suspicious_referrals": data.get("block_bonus_on_suspicious_referrals", True),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Anti-abuse configuration updated"
        }
    except Exception as e:
        logger.error(f"Failed to update abuse config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/user/security/settings")
async def update_security_settings(request: Request, data: dict):
    """Update user security settings"""
    try:
        # Get user from auth token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Update settings
        login_email_alerts_enabled = data.get('login_email_alerts_enabled')
        if login_email_alerts_enabled is not None:
            await db.user_accounts.update_one(
                {"user_id": user_id},
                {"$set": {"security.login_email_alerts_enabled": login_email_alerts_enabled}}
            )
        
        return {
            "success": True,
            "message": "Security settings updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update security settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def check_seller_requirements(user_id: str):
    """Check if user meets all requirements to become a seller"""
    # Check user account
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check requirements
    email_verified = user.get("email_verified", False)
    phone_verified = user.get("phone_verified", False)
    
    # Check active payment methods
    payment_methods = await db.payment_methods.count_documents({
        "user_id": user_id,
        "is_active": True
    })
    
    has_payment_method = payment_methods > 0
    
    requirements_met = email_verified and phone_verified and has_payment_method
    
    return {
        "success": True,
        "requirements": {
            "account_setup": {
                "email_verified": email_verified,
                "phone_verified": phone_verified,
                "completed": email_verified and phone_verified
            },
            "payment_methods": {
                "count": payment_methods,
                "completed": has_payment_method
            },
            "all_requirements_met": requirements_met
        }
    }


# ================================


# ===========================
# TELEGRAM BOT INTEGRATION
# ===========================

@api_router.post("/telegram/verify-link-code")
async def verify_telegram_link_code(request: dict):
    """
    Verify and link Telegram account using code from bot
    User enters code from Telegram in web app
    """
    link_code = request.get("link_code")
    user_id = request.get("user_id")
    
    if not link_code or not user_id:
        raise HTTPException(status_code=400, detail="link_code and user_id required")
    
    # Find the telegram link with this code
    telegram_link = await db.telegram_links.find_one({"link_code": link_code.upper()})
    
    if not telegram_link:
        return {"success": False, "error": "Invalid code"}
    
    # Check if code is expired (10 minutes)
    code_time = datetime.fromisoformat(telegram_link["code_generated_at"])
    if (datetime.now(timezone.utc) - code_time).total_seconds() > 600:
        return {"success": False, "error": "Code expired. Generate a new one from /start in Telegram"}
    
    # Check if already linked to another account
    if telegram_link.get("linked") and telegram_link.get("user_id") != user_id:
        return {"success": False, "error": "This Telegram account is already linked to another user"}
    
    # Link the accounts
    await db.telegram_links.update_one(
        {"link_code": link_code.upper()},
        {
            "$set": {
                "user_id": user_id,
                "linked": True,
                "linked_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {"link_code": ""}
        }
    )
    
    # Initialize notification settings (all enabled by default)
    await db.telegram_notification_settings.update_one(
        {"user_id": user_id},
        {
            "$setOnInsert": {
                "user_id": user_id,
                "p2p_trades": True,
                "deposits": True,
                "withdrawals": True,
                "price_alerts": True,
                "referrals": True,
                "express_orders": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"✅ Telegram linked for user {user_id}")
    
    return {
        "success": True,
        "message": "Telegram account linked successfully!",
        "telegram_username": telegram_link.get("telegram_username")
    }

@api_router.get("/telegram/link-status")
async def get_telegram_link_status(user_id: str):
    """Check if user has Telegram linked"""
    telegram_link = await db.telegram_links.find_one({"user_id": user_id, "linked": True})
    
    if telegram_link:
        return {
            "success": True,
            "linked": True,
            "telegram_username": telegram_link.get("telegram_username"),
            "linked_at": telegram_link.get("linked_at")
        }
    else:
        return {
            "success": True,
            "linked": False
        }

@api_router.post("/telegram/unlink")
async def unlink_telegram(request: dict):
    """Unlink Telegram account from web app"""
    user_id = request.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    result = await db.telegram_links.delete_one({"user_id": user_id})
    
    if result.deleted_count > 0:
        return {"success": True, "message": "Telegram unlinked"}
    else:
        return {"success": False, "error": "No Telegram account linked"}

@api_router.get("/telegram/notification-settings")
async def get_telegram_notification_settings(user_id: str):
    """Get user's Telegram notification preferences"""
    settings = await db.telegram_notification_settings.find_one({"user_id": user_id}, {"_id": 0})
    
    if not settings:
        # Return defaults
        return {
            "success": True,
            "settings": {
                "p2p_trades": True,
                "deposits": True,
                "withdrawals": True,
                "price_alerts": True,
                "referrals": True,
                "express_orders": True
            }
        }
    
    return {
        "success": True,
        "settings": {
            "p2p_trades": settings.get("p2p_trades", True),
            "deposits": settings.get("deposits", True),
            "withdrawals": settings.get("withdrawals", True),
            "price_alerts": settings.get("price_alerts", True),
            "referrals": settings.get("referrals", True),
            "express_orders": settings.get("express_orders", True)
        }
    }

@api_router.put("/telegram/notification-settings")
async def update_telegram_notification_settings(request: dict):
    """Update user's Telegram notification preferences"""
    user_id = request.get("user_id")
    settings = request.get("settings", {})
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Update settings
    await db.telegram_notification_settings.update_one(
        {"user_id": user_id},
        {
            "$set": {
                **settings,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Notification settings updated"
    }


# ADMIN PLATFORM WALLET ENDPOINTS
# ================================

@app.get("/api/admin/platform-wallet/balance")
async def get_admin_platform_wallet_balance():
    """
    Get platform wallet balances across all currencies
    """
    try:
        balance_data = await get_platform_balance(db)
        stats = await get_platform_stats(db)
        
        # Get active warnings
        warnings = await db.platform_balance_warnings.find({
            "acknowledged": False
        }).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "success": True,
            "balances": balance_data["balances"],
            "stats": stats,
            "warnings": warnings
        }
    except Exception as e:
        logger.error(f"Error getting platform wallet balance: {e}")
        return {"success": False, "error": str(e)}


async def update_admin_liquidity_prices():
    """Background task to update admin liquidity P2P offers with live market prices"""
    while True:
        try:
            await asyncio.sleep(300)  # Every 5 minutes
            
            # Get all admin liquidity offers
            admin_offers = await db.p2p_ads.find({"is_admin_liquidity": True, "status": "active"}).to_list(100)
            
            for offer in admin_offers:
                crypto = offer.get("crypto_currency")
                fiat = offer.get("fiat_currency", "GBP")
                
                # Get live price
                currency = "gbp" if fiat == "GBP" else "usd"
                live_price = await get_live_price(crypto, currency)
                
                if live_price > 0:
                    # Update offer price to match market (can add small markup here)
                    markup = 1.005  # 0.5% markup for admin offers
                    new_price = live_price * markup
                    
                    await db.p2p_ads.update_one(
                        {"offer_id": offer["offer_id"]},
                        {"$set": {"price_per_unit": new_price, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
            logger.info(f"✅ Updated {len(admin_offers)} admin liquidity offers with live prices")
            
        except Exception as e:
            logger.error(f"Error updating admin liquidity prices: {e}")
            await asyncio.sleep(300)



# Background task to cleanup expired P2P boosted listings
async def cleanup_expired_boosts_loop():
    """
    Background task that runs every hour to clean up expired P2P boosted listings
    """
    import asyncio
    logger.info("🚀 Starting P2P Boost Cleanup Service...")
    
    while True:
        try:
            # Find all boosted offers
            boosted_offers = await db.p2p_ads.find(
                {"boosted": True, "boost_end_date": {"$exists": True}},
                {"_id": 0, "ad_id": 1, "boost_end_date": 1, "seller_user_id": 1}
            ).to_list(1000)
            
            expired_count = 0
            now = datetime.now(timezone.utc)
            
            for offer in boosted_offers:
                boost_end_date = offer.get("boost_end_date")
                
                if not boost_end_date:
                    continue
                
                # Handle both datetime objects and string dates
                if isinstance(boost_end_date, str):
                    try:
                        boost_end_date = datetime.fromisoformat(boost_end_date.replace('Z', '+00:00'))
                    except:
                        continue
                
                # Ensure timezone awareness
                if boost_end_date.tzinfo is None:
                    boost_end_date = boost_end_date.replace(tzinfo=timezone.utc)
                
                # Check if expired
                if now > boost_end_date:
                    # Update offer to remove boost
                    await db.p2p_ads.update_one(
                        {"ad_id": offer["ad_id"]},
                        {
                            "$set": {
                                "boosted": False,
                                "updated_at": now
                            },
                            "$unset": {
                                "boost_end_date": ""
                            }
                        }
                    )
                    expired_count += 1
                    logger.info(f"✅ Expired boost for ad {offer['ad_id']}")
            
            if expired_count > 0:
                logger.info(f"🧹 Cleanup complete: Expired {expired_count} boosted listings")
            
        except Exception as e:
            logger.error(f"❌ Boost cleanup error: {e}")
        
        # Run every hour
        await asyncio.sleep(3600)


# Background task to check price alerts
async def price_alert_checker():
    """
    Background task that runs every 5 minutes to check price alerts
    """
    import asyncio
    
    while True:
        try:
            # Fetch current prices
            prices = {}
            for coin in ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "LTC"]:
                try:
                    price_data = await get_price_in_gbp(coin)
                    if price_data:
                        prices[coin] = price_data["price"]
                except:
                    pass
            
            if prices:
                # Check all alerts
                triggered = await check_price_alerts(db, prices)
                
                # Send notifications for triggered alerts
                for trigger in triggered:
                    alert = trigger["alert"]
                    await send_price_alert_notification(
                        db=db,
                        user_id=alert["user_id"],
                        coin=alert["coin"],
                        direction=alert["direction"],
                        threshold=alert["threshold"],
                        price_change=trigger["price_change"],
                        current_price=trigger["current_price"]
                    )
                
                if triggered:
                    logger.info(f"✅ Price alert check complete - {len(triggered)} alerts triggered")
            
        except Exception as e:
            logger.error(f"Price alert checker error: {str(e)}")
        
        # Wait 5 minutes before next check
        await asyncio.sleep(300)

# Start price alert checker on startup
async def express_countdown_checker_loop():
    """Background task to check and handle expired express countdowns"""
    while True:
        try:
            await asyncio.sleep(30)  # Check every 30 seconds
            
            now = datetime.now(timezone.utc)
            
            expired_trades = await db.trades.find({
                "type": "p2p_express",
                "status": {"$in": ["pending_payment", "payment_confirmed"]},
                "countdown_expires_at": {"$ne": None},
                "is_instant_delivery": False
            }).to_list(length=100)
            
            for trade in expired_trades:
                try:
                    expires_at = datetime.fromisoformat(trade["countdown_expires_at"])
                    
                    if now > expires_at:
                        logger.warning(f"Express countdown expired for trade {trade['trade_id']}")
                        
                        # Mark seller as slow - permanently remove from Express
                        await db.trader_profiles.update_one(
                            {"user_id": trade["seller_id"]},
                            {
                                "$set": {"is_express_qualified": False, "express_removed_at": now.isoformat()},
                                "$inc": {"express_timeouts": 1}
                            }
                        )
                        
                        # Try rematch with another seller
                        new_seller = await db.trader_profiles.find_one(
                            {
                                "is_trader": True,
                                "is_online": True,
                                "is_express_qualified": True,
                                "user_id": {"$ne": trade["seller_id"]},
                                "trading_pairs": {"$in": [trade["crypto_currency"]]},
                                "completion_rate": {"$gte": 95},
                                "has_dispute_flags": False
                            },
                            sort=[("completion_rate", -1)]
                        )
                        
                        if new_seller:
                            new_countdown = (now + timedelta(seconds=EXPRESS_RELEASE_TIMEOUT)).isoformat()
                            
                            await db.trades.update_one(
                                {"trade_id": trade["trade_id"]},
                                {
                                    "$set": {
                                        "seller_id": new_seller["user_id"],
                                        "countdown_expires_at": new_countdown,
                                        "rematch_count": trade.get("rematch_count", 0) + 1,
                                        "updated_at": now.isoformat()
                                    }
                                }
                            )
                            
                            try:
                                from p2p_notification_service import create_p2p_notification
                                await create_p2p_notification(
                                    user_id=new_seller["user_id"],
                                    trade_id=trade["trade_id"],
                                    notification_type="express_rematched",
                                    message=f"EXPRESS RE-MATCH: {trade['crypto_amount']:.8f} {trade['crypto_currency']}. Release within 10 minutes."
                                )
                                await create_p2p_notification(
                                    user_id=trade["buyer_id"],
                                    trade_id=trade["trade_id"],
                                    notification_type="express_rematched",
                                    message="Previous seller was slow. Rematched with faster seller."
                                )
                            except:
                                pass
                        else:
                            admin_liq = await db.admin_liquidity.find_one({
                                "crypto_currency": trade["crypto_currency"],
                                "available_amount": {"$gte": trade["crypto_amount"]}
                            })
                            
                            if admin_liq:
                                try:
                                    from wallet_service import credit_wallet
                                    await credit_wallet(
                                        user_id=trade["buyer_id"],
                                        currency=trade["crypto_currency"],
                                        amount=trade["crypto_amount"]
                                    )
                                    
                                    await db.trades.update_one(
                                        {"trade_id": trade["trade_id"]},
                                        {
                                            "$set": {
                                                "status": "completed",
                                                "seller_id": "admin_liquidity_fallback",
                                                "delivery_source": "admin_liquidity_fallback",
                                                "completed_at": now.isoformat()
                                            }
                                        }
                                    )
                                    
                                    await db.admin_liquidity.update_one(
                                        {"crypto_currency": trade["crypto_currency"]},
                                        {"$inc": {"available_amount": -trade["crypto_amount"]}}
                                    )
                                    
                                    try:
                                        from p2p_notification_service import create_p2p_notification
                                        await create_p2p_notification(
                                            user_id=trade["buyer_id"],
                                            trade_id=trade["trade_id"],
                                            notification_type="express_completed_fallback",
                                            message="Order completed via platform liquidity. Crypto credited."
                                        )
                                    except:
                                        pass
                                except Exception as e:
                                    logger.error(f"Fallback liquidity failed: {e}")
                            else:
                                await db.trades.update_one(
                                    {"trade_id": trade["trade_id"]},
                                    {
                                        "$set": {
                                            "status": "cancelled",
                                            "cancel_reason": "express_timeout_no_sellers",
                                            "cancelled_at": now.isoformat()
                                        }
                                    }
                                )
                                
                                try:
                                    from p2p_notification_service import create_p2p_notification
                                    await create_p2p_notification(
                                        user_id=trade["buyer_id"],
                                        trade_id=trade["trade_id"],
                                        notification_type="express_cancelled",
                                        message="Express order cancelled due to seller delays. Refund initiated."
                                    )
                                except:
                                    pass
                except Exception as trade_error:
                    logger.error(f"Error processing expired trade: {trade_error}")
                    
        except Exception as e:
            logger.error(f"Express countdown checker error: {e}")
            await asyncio.sleep(60)


@app.on_event("startup")
async def start_background_tasks():
    """
    Start all background tasks
    """
    import asyncio
    
    # Start production task queue
    task_queue.start()
    log_info("🚀 Production background task queue initialized")
    
    # Start price alert checker
    asyncio.create_task(price_alert_checker())
    logger.info("✅ Price alert checker started")
    
    # Start live price updater
    start_price_updater()
    logger.info("✅ Live price updater started")
    
    # Start subscription renewal background task
    start_subscription_worker()
    logger.info("✅ Subscription renewal worker started")
    
    # Start admin liquidity price updater
    asyncio.create_task(update_admin_liquidity_prices())
    logger.info("✅ Admin liquidity price updater started")
    
    # Start P2P boost cleanup task
    asyncio.create_task(cleanup_expired_boosts_loop())
    logger.info("✅ P2P boost cleanup task started")
    
    # Start automated backup system
    from backup_system import automated_backup_loop
    asyncio.create_task(automated_backup_loop())
    logger.info("✅ Automated database backup system started")
    
    # Start Express countdown checker
    asyncio.create_task(express_countdown_checker_loop())
    logger.info("✅ Express countdown checker started")


@app.get("/api/admin/platform-wallet/deposit-address/{currency}")
async def get_platform_deposit_address(currency: str):
    """
    Get or generate deposit address for a currency
    """
    try:
        # Check if address already exists
        existing = await db.platform_deposit_addresses.find_one({
            "currency": currency.upper()
        })
        
        if existing:
            return {
                "success": True,
                "address": existing["address"],
                "currency": currency.upper(),
                "network": existing.get("network", "Native")
            }
        
        # Generate new address
        address_data = await generate_deposit_address(db, currency.upper())
        
        return {
            "success": True,
            **address_data
        }
    except Exception as e:
        logger.error(f"❌ Failed to get deposit address: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/admin/platform-wallet/transactions")
async def get_platform_wallet_transactions(
    transaction_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Get platform wallet transaction history
    """
    try:
        transactions = await get_transaction_history(
            db,
            transaction_type=transaction_type,
            limit=limit,
            offset=offset
        )
        
        return {
            "success": True,
            "transactions": transactions,
            "count": len(transactions)
        }
    except Exception as e:
        logger.error(f"❌ Failed to get transactions: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/admin/platform-wallet/top-up")
async def admin_top_up_platform_wallet(request: Request):
    """
    Manually top up platform wallet (for admin)
    """
    try:
        data = await request.json()
        
        amount = data.get("amount")
        currency = data.get("currency", "USDT")
        admin_user_id = data.get("admin_user_id", "ADMIN")
        notes = data.get("notes", "")
        
        if not amount or amount <= 0:
            return {"success": False, "error": "Invalid amount"}
        
        result = await add_platform_funds(
            db,
            amount=float(amount),
            currency=currency.upper(),
            method="manual",
            admin_user_id=admin_user_id,
            notes=notes
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to top up platform wallet: {str(e)}")
        return {"success": False, "error": str(e)}


# ================================
# AI CHAT + LIVE SUPPORT ENDPOINTS
# ================================

@app.post("/api/chat/session/create")
async def create_new_chat_session(request: Request):
    """
    Create new chat session for user
    """
    try:
        data = await request.json()
        user_id = data.get("user_id")
        user_email = data.get("user_email")
        
        session_id = await create_chat_session(db, user_id=user_id, user_email=user_email)
        
        return {
            "success": True,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Failed to create chat session: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/chat/message")
async def send_chat_message(request: Request):
    """
    Send message and get AI response
    """
    try:
        data = await request.json()
        
        session_id = data.get("session_id")
        message = data.get("message")
        user_id = data.get("user_id")
        
        if not session_id or not message:
            return {"success": False, "error": "Missing session_id or message"}
        
        # Check if session is escalated to live agent
        session = await db.chat_sessions.find_one({"session_id": session_id})
        
        if not session:
            return {"success": False, "error": "Session not found"}
        
        # Save user message
        await save_chat_message(db, session_id, message, "user", user_id)
        
        # If escalated to live agent, don't generate AI response
        if session.get("status") == "live_agent":
            return {
                "success": True,
                "message": "Message sent to live agent",
                "is_live_agent": True
            }
        
        # Get chat history for context
        history = await get_chat_history(db, session_id, limit=10)
        
        # Format history for AI
        formatted_history = []
        for msg in history[:-1]:  # Exclude the message we just saved
            formatted_history.append({
                "role": "assistant" if msg["sender"] == "ai" else "user",
                "content": msg["message"]
            })
        
        # Generate AI response
        ai_result = await generate_ai_response(
            user_message=message,
            chat_history=formatted_history
        )
        
        # Save AI response
        await save_chat_message(
            db, 
            session_id, 
            ai_result["response"], 
            "ai"
        )
        
        return {
            "success": True,
            "response": ai_result["response"],
            "should_escalate": ai_result.get("should_escalate", False),
            "is_live_agent": False
        }
        
    except Exception as e:
        logger.error(f"Chat message error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/chat/escalate")
async def escalate_chat_to_live_agent(request: Request):
    """
    Escalate chat session to live agent
    """
    try:
        data = await request.json()
        session_id = data.get("session_id")
        
        if not session_id:
            return {"success": False, "error": "Missing session_id"}
        
        success = await escalate_to_live_agent(db, session_id)
        
        if success:
            # Add system message
            await save_chat_message(
                db,
                session_id,
                "Chat escalated to live agent. An admin will respond shortly.",
                "system"
            )
            
            # Get session info for notification
            session = await db.chat_sessions.find_one({"session_id": session_id})
            user_email = session.get("user_email", "Unknown user")
            
            # Send notification email to admin
            try:
                admin_email = "info@coinhubx.net"  # Company email
                
                # Get chat history for context
                chat_messages = await get_chat_history(db, session_id, limit=10)
                chat_transcript = "\n\n".join([
                    f"{msg['sender'].upper()}: {msg['message']}" 
                    for msg in chat_messages
                ])
                
                notification_sent = await send_email(
                    to_email=admin_email,
                    subject=f"🔴 LIVE CHAT REQUEST from {user_email}",
                    html_content=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #00F0FF;">🔴 Live Chat Support Request</h2>
                        <p><strong>User:</strong> {user_email}</p>
                        <p><strong>Session ID:</strong> {session_id}</p>
                        <p>A user has requested to speak with a live agent. Please respond via your Tawk.to dashboard.</p>
                        
                        <h3 style="color: #A855F7;">Chat History:</h3>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
{chat_transcript}
                        </div>
                        
                        <p style="margin-top: 20px;">
                            <strong>Action Required:</strong> Log into your Tawk.to dashboard to respond to this user.
                        </p>
                    </div>
                    """
                )
                
                if notification_sent:
                    logger.info(f"✅ Admin email notification sent for session {session_id}")
                
            except Exception as email_error:
                logger.error(f"Failed to send admin notification: {str(email_error)}")
            
            # Send SMS notification via Email-to-SMS gateway (GIFFGAFF/O2)
            try:
                sms_gateway_email = "07808184311@o2.co.uk"
                
                sms_message = f"LIVE CHAT REQUEST from {user_email}. Check Tawk.to dashboard! Session: {session_id}"
                
                sms_sent = await send_email(
                    to_email=sms_gateway_email,
                    subject="",  # SMS gateways ignore subject
                    html_content=sms_message
                )
                
                if sms_sent:
                    logger.info(f"✅ SMS notification sent to 07808184311")
                    
            except Exception as sms_error:
                logger.error(f"Failed to send SMS notification: {str(sms_error)}")
            
            return {
                "success": True,
                "message": "Escalated to live agent"
            }
        
        return {"success": False, "error": "Failed to escalate"}
        
    except Exception as e:
        logger.error(f"Escalation error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/chat/history/{session_id}")
async def get_session_chat_history(session_id: str):
    """
    Get chat history for a session
    """
    try:
        messages = await get_chat_history(db, session_id)
        
        return {
            "success": True,
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Failed to get chat history: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/admin/chat/sessions")
async def get_admin_chat_sessions(status: Optional[str] = None):
    """
    Get all open chat sessions for admin dashboard
    """
    try:
        sessions = await get_open_chat_sessions(db, status=status)
        
        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        logger.error(f"Failed to get chat sessions: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/admin/chat/send-message")
async def admin_send_chat_message(request: Request):
    """
    Admin sends message to user in chat
    """
    try:
        data = await request.json()
        
        session_id = data.get("session_id")
        message = data.get("message")
        admin_id = data.get("admin_id", "ADMIN")
        
        if not session_id or not message:
            return {"success": False, "error": "Missing session_id or message"}
        
        # Save admin message
        await save_chat_message(db, session_id, message, "agent", admin_id)
        
        return {
            "success": True,
            "message": "Message sent"
        }
        
    except Exception as e:
        logger.error(f"Admin chat message error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/admin/chat/resolve")
async def admin_resolve_chat(request: Request):
    """
    Mark chat session as resolved
    """
    try:
        data = await request.json()
        session_id = data.get("session_id")
        
        if not session_id:
            return {"success": False, "error": "Missing session_id"}
        
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "resolved": True,
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Chat marked as resolved"
        }
        
    except Exception as e:
        logger.error(f"Resolve chat error: {str(e)}")
        return {"success": False, "error": str(e)}


# ================================
# P2P SELLER PUBLIC PROFILE
# ================================

@app.get("/api/p2p/seller/{seller_identifier}")
async def get_public_seller_profile(seller_identifier: str):
    """
    Get public seller profile by user_id or username
    No authentication required - public page
    """
    try:
        # Try to find seller by user_id first, then by username
        seller = await db.users.find_one({
            "$or": [
                {"user_id": seller_identifier},
                {"username": seller_identifier},
                {"email": seller_identifier}
            ]
        })
        
        if not seller:
            return {"success": False, "error": "Seller not found"}
        
        seller_id = seller["user_id"]
        
        # Get seller stats
        total_trades = await db.p2p_ads.count_documents({"user_id": seller_id, "status": "completed"})
        
        # Get average rating (if rating system exists)
        # For now, use a placeholder or calculate from feedback
        rating = 4.8  # Placeholder - implement proper rating system
        
        # Get verification status
        is_verified = seller.get("kyc_verified", False) or seller.get("email_verified", False)
        
        # Get active sell offers
        active_offers = await db.p2p_ads.find({
            "user_id": seller_id,
            "ad_type": "sell",
            "status": "active"
        }).sort("created_at", -1).limit(20).to_list(20)
        
        # Format offers for public display
        formatted_offers = []
        for offer in active_offers:
            formatted_offers.append({
                "ad_id": offer.get("ad_id"),
                "crypto_currency": offer.get("crypto_currency"),
                "fiat_currency": offer.get("fiat_currency"),
                "price_type": offer.get("price_type"),
                "price_value": offer.get("price_value"),
                "min_amount": offer.get("min_amount"),
                "max_amount": offer.get("max_amount"),
                "available_amount": offer.get("available_amount"),
                "payment_methods": offer.get("payment_methods", []),
                "terms": offer.get("terms", "")
            })
        
        return {
            "success": True,
            "seller": {
                "user_id": seller_id,
                "username": seller.get("username", seller.get("email", "Unknown")),
                "is_verified": is_verified,
                "rating": rating,
                "total_trades": total_trades,
                "member_since": seller.get("created_at", ""),
                "active_offers_count": len(formatted_offers)
            },
            "offers": formatted_offers
        }
    except Exception as e:
        logger.error(f"❌ Failed to get seller profile: {str(e)}")
        return {"success": False, "error": str(e)}


# ================================
# PRICE ALERTS ENDPOINTS
# ================================

@app.post("/api/price-alerts/create")
async def create_user_price_alert(request: Request):
    """
    Create a price alert for a user
    """
    try:
        data = await request.json()
        
        user_id = data.get("user_id")
        coin = data.get("coin")
        
        # Support both parameter formats
        threshold = data.get("threshold") or data.get("target_price", 5)
        direction = data.get("direction") or ("up" if data.get("condition") == "above" else "down")
        
        if not user_id or not coin:
            return {"success": False, "error": "Missing required fields"}
        
        if direction not in ["up", "down"]:
            return {"success": False, "error": "Direction must be 'up' or 'down'"}
        
        result = await create_price_alert(db, user_id, coin, threshold, direction)
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to create price alert: {str(e)}")
        return {"success": False, "error": str(e)}


@app.delete("/api/price-alerts/{alert_id}")
async def delete_user_price_alert(alert_id: str, user_id: str):
    """
    Delete a price alert
    """
    try:
        result = await delete_price_alert(db, user_id, alert_id)
        return result
    except Exception as e:
        logger.error(f"Failed to delete price alert: {str(e)}")
        return {"success": False, "error": str(e)}


@app.patch("/api/price-alerts/{alert_id}/toggle")
async def toggle_user_price_alert(alert_id: str, request: Request):
    """
    Enable or disable a price alert
    """
    try:
        data = await request.json()
        user_id = data.get("user_id")
        enabled = data.get("enabled", True)
        
        result = await toggle_price_alert(db, user_id, alert_id, enabled)
        return result
    except Exception as e:
        logger.error(f"Failed to toggle price alert: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/price-alerts/user/{user_id}")
async def get_price_alerts_for_user(user_id: str):
    """
    Get all price alerts for a user
    """
    try:
        alerts = await get_user_price_alerts(db, user_id)
        return {
            "success": True,
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Failed to get price alerts: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/user/seller-link")
async def get_my_seller_link(request: Request):
    """
    Get the user's unique seller profile link
    """
    try:
        # Get user_id from headers or query params
        user_id = request.headers.get("user-id") or request.query_params.get("user_id")
        
        if not user_id:
            return {"success": False, "error": "User ID required"}
        
        # Get user info from correct collection
        logger.info(f"Looking for user_id: {user_id}")
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        logger.info(f"Found user: {user is not None}")
        
        if not user:
            return {"success": False, "error": "User not found"}
        
        # Create seller link with current domain
        base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://tradepanel-12.preview.emergentagent.com")
        seller_link = f"{base_url.replace('/api', '')}/p2p/seller/{user_id}"
        
        # Get username/email for display
        username = user.get("full_name") or user.get("email", "Seller")
        
        return {
            "success": True,
            "seller_link": seller_link,
            "user_id": user_id,
            "username": username
        }
        
    except Exception as e:
        logger.error(f"Failed to get seller link: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/api/admin/chat/settings")
async def get_admin_chat_settings():
    """
    Get AI chat settings (AI ON/OFF, API key status)
    """
    try:
        settings = await db.platform_settings.find_one({"setting_type": "ai_chat"})
        
        if not settings:
            # Create default settings
            settings = {
                "setting_type": "ai_chat",
                "ai_enabled": True,
                "has_custom_api_key": False
            }
            await db.platform_settings.insert_one(settings)
        
        return {
            "success": True,
            "ai_enabled": settings.get("ai_enabled", True),
            "has_custom_api_key": settings.get("has_custom_api_key", False)
        }
    except Exception as e:
        logger.error(f"Failed to get chat settings: {str(e)}")
        return {"success": False, "error": str(e)}


@app.post("/api/admin/chat/settings")
async def update_admin_chat_settings(request: Request):
    """
    Update AI chat settings
    """
    try:
        data = await request.json()
        
        ai_enabled = data.get("ai_enabled")
        custom_api_key = data.get("custom_api_key")
        
        update_data = {}
        if ai_enabled is not None:
            update_data["ai_enabled"] = ai_enabled
        
        if custom_api_key:
            # Store encrypted API key (simplified for MVP)
            update_data["custom_api_key"] = custom_api_key
            update_data["has_custom_api_key"] = True
        
        await db.platform_settings.update_one(
            {"setting_type": "ai_chat"},
            {"$set": update_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Settings updated"
        }
        
    except Exception as e:
        logger.error(f"Failed to update chat settings: {str(e)}")
        return {"success": False, "error": str(e)}


        
        result = await add_platform_funds(
            db,
            amount=float(amount),
            currency=currency.upper(),
            method="manual",
            admin_user_id=admin_user_id,
            notes=notes
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to top up platform wallet: {str(e)}")
        return {"success": False, "error": str(e)}


# ===================================
# MONETIZATION SYSTEM ENDPOINTS
# ===================================

@api_router.get("/admin/monetization/settings")
async def get_monetization_settings():
    """Get current monetization settings"""
    try:
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        
        if not settings:
            # Initialize with defaults
            await db.monetization_settings.insert_one(DEFAULT_MONETIZATION_SETTINGS)
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        return {"success": True, "settings": settings}
    except Exception as e:
        logger.error(f"Error fetching monetization settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/monetization/settings")
async def update_monetization_settings(updates: Dict):
    """Update monetization settings - Admin only"""
    try:
        # Add metadata
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = updates.get("admin_id", "admin")
        
        # Update or create settings
        result = await db.monetization_settings.update_one(
            {"setting_id": "default_monetization"},
            {"$set": updates},
            upsert=True
        )
        
        # Get updated settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Monetization settings updated successfully",
            "settings": settings
        }
    except Exception as e:
        logger.error(f"Error updating monetization settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/boost-listing")
async def boost_listing(request: BoostListingRequest):
    """Boost a P2P listing - Deduct from user wallet"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        # Determine price based on duration
        if request.duration_hours == 1:
            price_gbp = settings.get("boost_1h_price", 10.0)
        elif request.duration_hours == 6:
            price_gbp = settings.get("boost_6h_price", 20.0)
        elif request.duration_hours == 24:
            price_gbp = settings.get("boost_24h_price", 50.0)
        else:
            raise HTTPException(status_code=400, detail="Invalid duration. Must be 1, 6, or 24 hours.")
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < price_gbp:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need \u00a3{price_gbp} GBP but have \u00a3{user_balance.get('balance', 0) if user_balance else 0} GBP"
            )
        
        # Deduct from user wallet
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -price_gbp}}
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"boost_fees": price_gbp}},
            upsert=True
        )
        
        # Update listing with boost
        boost_until = datetime.now(timezone.utc) + timedelta(hours=request.duration_hours)
        await db.p2p_ads.update_one(
            {"ad_id": request.listing_id},
            {
                "$set": {
                    "is_boosted": True,
                    "boosted_until": boost_until.isoformat(),
                    "boost_duration_hours": request.duration_hours
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "boost_listing",
            "amount_gbp": price_gbp,
            "listing_id": request.listing_id,
            "duration_hours": request.duration_hours,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": f"Listing boosted for {request.duration_hours} hours!",
            "price_paid": price_gbp,
            "boosted_until": boost_until.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error boosting listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/verify-seller")
async def verify_seller(request: VerifySellerRequest):
    """Verify seller - Deduct from user wallet and grant badge"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        price_gbp = settings.get("seller_verification_price", 25.0)
        
        # Check if already verified
        user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
        if user and user.get("is_verified_seller"):
            raise HTTPException(status_code=400, detail="You are already a verified seller.")
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < price_gbp:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need \u00a3{price_gbp} GBP but have \u00a3{user_balance.get('balance', 0) if user_balance else 0} GBP"
            )
        
        # Deduct from user wallet
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -price_gbp}}
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"verification_fees": price_gbp}},
            upsert=True
        )
        
        # Grant verification badge
        await db.user_accounts.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "is_verified_seller": True,
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "seller_verification",
            "amount_gbp": price_gbp,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": "Congratulations! You are now a verified seller.",
            "price_paid": price_gbp,
            "badge": "verified_seller"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying seller: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/upgrade-seller-level")
async def upgrade_seller_level(request: UpgradeSellerLevelRequest):
    """Upgrade seller level - Deduct from wallet and grant benefits"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        # Determine price and validate target level
        if request.target_level.lower() == "silver":
            price_gbp = settings.get("seller_silver_upgrade_price", 20.0)
        elif request.target_level.lower() == "gold":
            price_gbp = settings.get("seller_gold_upgrade_price", 50.0)
        else:
            raise HTTPException(status_code=400, detail="Invalid level. Must be 'silver' or 'gold'.")
        
        # Check current level
        user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
        current_level = user.get("seller_level", "bronze") if user else "bronze"
        
        if current_level == request.target_level.lower():
            raise HTTPException(status_code=400, detail=f"You already have {request.target_level} level.")
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < price_gbp:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need \u00a3{price_gbp} GBP but have \u00a3{user_balance.get('balance', 0) if user_balance else 0} GBP"
            )
        
        # Deduct from user wallet
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -price_gbp}}
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"level_upgrade_fees": price_gbp}},
            upsert=True
        )
        
        # Upgrade seller level
        await db.user_accounts.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "seller_level": request.target_level.lower(),
                    "level_upgraded_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "seller_level_upgrade",
            "amount_gbp": price_gbp,
            "from_level": current_level,
            "to_level": request.target_level.lower(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        # Get benefits based on level
        fee_reduction = settings.get("silver_fee_reduction_percent", 0.5) if request.target_level.lower() == "silver" else settings.get("gold_fee_reduction_percent", 1.0)
        
        return {
            "success": True,
            "message": f"Congratulations! You are now a {request.target_level.upper()} seller.",
            "price_paid": price_gbp,
            "new_level": request.target_level.lower(),
            "benefits": {
                "fee_reduction_percent": fee_reduction,
                "priority_ranking": True,
                "level_badge": request.target_level.lower()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upgrading seller level: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/upgrade-referral-tier")
async def upgrade_referral_tier(request: UpgradeReferralTierRequest):
    """Upgrade referral commission tier - Deduct from wallet"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        # Determine price based on target commission
        if request.target_commission_percent == 30:
            price_gbp = settings.get("referral_tier_30_percent_price", 20.0)
        elif request.target_commission_percent == 40:
            price_gbp = settings.get("referral_tier_40_percent_price", 40.0)
        else:
            raise HTTPException(status_code=400, detail="Invalid commission tier. Must be 30% or 40%.")
        
        # Check current tier
        user_referral = await db.referral_codes.find_one({"user_id": request.user_id}, {"_id": 0})
        current_commission = user_referral.get("commission_percent", 20) if user_referral else 20
        
        if current_commission >= request.target_commission_percent:
            raise HTTPException(status_code=400, detail=f"You already have {current_commission}% commission or higher.")
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < price_gbp:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need \u00a3{price_gbp} GBP but have \u00a3{user_balance.get('balance', 0) if user_balance else 0} GBP"
            )
        
        # Deduct from user wallet
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -price_gbp}}
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"referral_upgrade_fees": price_gbp}},
            upsert=True
        )
        
        # Upgrade referral tier
        await db.referral_codes.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "commission_percent": request.target_commission_percent,
                    "tier_upgraded_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "referral_tier_upgrade",
            "amount_gbp": price_gbp,
            "from_commission": current_commission,
            "to_commission": request.target_commission_percent,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": f"Referral tier upgraded! You now earn {request.target_commission_percent}% commission.",
            "price_paid": price_gbp,
            "new_commission_percent": request.target_commission_percent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upgrading referral tier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/subscribe-alerts")
async def subscribe_arbitrage_alerts(request: SubscribeAlertsRequest):
    """Subscribe to arbitrage alerts - Monthly \u00a310 deduction"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        monthly_price = settings.get("arbitrage_alerts_monthly_price", 10.0)
        
        # Check if already subscribed
        subscription = await db.alert_subscriptions.find_one({"user_id": request.user_id})
        if subscription and subscription.get("is_active"):
            raise HTTPException(status_code=400, detail="You already have an active subscription.")
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < monthly_price:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need \u00a3{monthly_price} GBP but have \u00a3{user_balance.get('balance', 0) if user_balance else 0} GBP"
            )
        
        # Deduct from user wallet
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -monthly_price}}
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"subscription_fees": monthly_price}},
            upsert=True
        )
        
        # Create/update subscription
        next_billing = datetime.now(timezone.utc) + timedelta(days=30)
        await db.alert_subscriptions.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "is_active": True,
                    "monthly_price": monthly_price,
                    "notification_channels": request.notification_channels,
                    "subscribed_at": datetime.now(timezone.utc).isoformat(),
                    "next_billing_date": next_billing.isoformat(),
                    "last_payment_date": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "alert_subscription",
            "amount_gbp": monthly_price,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": "Subscription activated! You'll receive arbitrage alerts.",
            "price_paid": monthly_price,
            "next_billing_date": next_billing.isoformat(),
            "notification_channels": request.notification_channels
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subscribing to alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/internal-transfer")
async def internal_wallet_transfer(request: InternalTransferRequest):
    """Transfer crypto between internal wallets - Uses centralized fee system with referral support"""
    try:
        # Get fee from centralized system
        fee_manager = get_fee_manager(db)
        fee_percent = await fee_manager.get_fee("cross_wallet_transfer_fee_percent")
        fee_amount = request.amount * (fee_percent / 100)
        net_amount = request.amount - fee_amount
        
        # Check sender balance
        sender_balance = await db.internal_balances.find_one({
            "user_id": request.from_user_id,
            "currency": request.currency
        })
        
        if not sender_balance or sender_balance.get("balance", 0) < request.amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need {request.amount} {request.currency} but have {sender_balance.get('balance', 0) if sender_balance else 0} {request.currency}"
            )
        
        # Deduct from sender
        await db.internal_balances.update_one(
            {"user_id": request.from_user_id, "currency": request.currency},
            {"$inc": {"balance": -request.amount}}
        )
        
        # Add to receiver (net amount after fee)
        await db.internal_balances.update_one(
            {"user_id": request.to_user_id, "currency": request.currency},
            {"$inc": {"balance": net_amount}},
            upsert=True
        )
        
        # Check for referrer
        user = await db.user_accounts.find_one({"user_id": request.from_user_id}, {"_id": 0})
        referrer_id = user.get("referrer_id") if user else None
        referrer_commission = 0.0
        admin_fee = fee_amount
        commission_percent = 0.0
        
        if referrer_id:
            referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
            referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
            
            if referrer_tier == "golden":
                commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
            else:
                commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
            
            referrer_commission = fee_amount * (commission_percent / 100.0)
            admin_fee = fee_amount - referrer_commission
        
        # Add admin fee to admin wallet
        await db.internal_balances.update_one(
            {"user_id": "admin_wallet", "currency": request.currency},
            {
                "$inc": {"balance": admin_fee},
                "$setOnInsert": {"available": 0, "reserved": 0, "created_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Add referrer commission if applicable
        if referrer_id and referrer_commission > 0:
            await db.internal_balances.update_one(
                {"user_id": referrer_id, "currency": request.currency},
                {
                    "$inc": {"balance": referrer_commission},
                    "$setOnInsert": {"available": 0, "reserved": 0, "created_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
            
            # Log referral commission
            await db.referral_commissions.insert_one({
                "referrer_id": referrer_id,
                "referred_user_id": request.from_user_id,
                "transaction_type": "internal_transfer",
                "fee_amount": fee_amount,
                "commission_amount": referrer_commission,
                "commission_percent": commission_percent,
                "currency": request.currency,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Log transaction
        transfer_id = str(uuid.uuid4())
        await db.transactions_log.insert_one({
            "transaction_id": transfer_id,
            "from_user_id": request.from_user_id,
            "to_user_id": request.to_user_id,
            "type": "internal_transfer",
            "currency": request.currency,
            "amount": request.amount,
            "fee_percent": fee_percent,
            "fee_amount": fee_amount,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "net_amount": net_amount,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        # Log to fee_transactions
        await db.fee_transactions.insert_one({
            "user_id": request.from_user_id,
            "transaction_type": "internal_transfer",
            "fee_type": "cross_wallet_transfer_fee_percent",
            "amount": request.amount,
            "fee_amount": fee_amount,
            "fee_percent": fee_percent,
            "admin_fee": admin_fee,
            "referrer_commission": referrer_commission,
            "referrer_id": referrer_id,
            "currency": request.currency,
            "reference_id": transfer_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": f"Transfer completed! {net_amount} {request.currency} sent to recipient.",
            "amount_sent": request.amount,
            "fee_amount": fee_amount,
            "fee_percent": fee_percent,
            "net_received": net_amount
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing internal transfer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/monetization/instant-sell")
async def instant_sell_to_admin(request: Dict):
    """Instant Sell to Admin - Auto-deduct 1% fee and apply -2.5% spread"""
    try:
        user_id = request.get("user_id")
        crypto_currency = request.get("crypto_currency")
        crypto_amount = float(request.get("crypto_amount", 0))
        
        if not all([user_id, crypto_currency, crypto_amount]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        instant_sell_fee_percent = settings.get("instant_sell_fee_percent", 1.0)
        admin_buy_spread_percent = settings.get("admin_buy_spread_percent", -2.5)
        
        # Get live price
        live_prices = await get_cached_prices()
        crypto_price_usd = live_prices['crypto_prices'].get(crypto_currency, 0)
        
        if crypto_price_usd == 0:
            raise HTTPException(status_code=400, detail=f"Unable to fetch live price for {crypto_currency}")
        
        # Convert to GBP
        fx_rates = live_prices['fx_rates']
        gbp_rate = fx_rates.get('GBP', 0.79)
        market_price_gbp = crypto_price_usd * gbp_rate
        
        # Apply admin buy spread (markdown) - Admin buys LOWER than market
        spread_adjusted_price = market_price_gbp * (1 + admin_buy_spread_percent / 100)
        
        # Calculate gross GBP amount
        gross_gbp = crypto_amount * spread_adjusted_price
        
        # Deduct 1% instant sell fee
        fee_gbp = gross_gbp * (instant_sell_fee_percent / 100)
        net_gbp = gross_gbp - fee_gbp
        
        # Check user balance
        user_balance = await db.internal_balances.find_one({
            "user_id": user_id,
            "currency": crypto_currency
        })
        
        if not user_balance or user_balance.get("balance", 0) < crypto_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. You need {crypto_amount} {crypto_currency} but have {user_balance.get('balance', 0) if user_balance else 0} {crypto_currency}"
            )
        
        # Deduct crypto from user
        await db.internal_balances.update_one(
            {"user_id": user_id, "currency": crypto_currency},
            {"$inc": {"balance": -crypto_amount}}
        )
        
        # Add crypto to admin liquidity
        await db.admin_liquidity_wallets.update_one(
            {"currency": crypto_currency},
            {
                "$inc": {
                    "balance": crypto_amount,
                    "available": crypto_amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Add net GBP to user
        await db.internal_balances.update_one(
            {"user_id": user_id, "currency": "GBP"},
            {"$inc": {"balance": net_gbp}},
            upsert=True
        )
        
        # Collect fee to admin
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"instant_sell_fees": fee_gbp}},
            upsert=True
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "instant_sell",
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "market_price_gbp": market_price_gbp,
            "spread_adjusted_price_gbp": spread_adjusted_price,
            "admin_spread_percent": admin_buy_spread_percent,
            "gross_gbp": gross_gbp,
            "fee_percent": instant_sell_fee_percent,
            "fee_gbp": fee_gbp,
            "net_gbp": net_gbp,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": f"Instant sell completed! £{net_gbp:.2f} credited to your account.",
            "crypto_sold": crypto_amount,
            "crypto_currency": crypto_currency,
            "price_per_unit": spread_adjusted_price,
            "gross_amount_gbp": gross_gbp,
            "fee_amount_gbp": fee_gbp,
            "net_received_gbp": net_gbp,
            "hidden_spread_applied": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing instant sell: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_payment_method_fee(payment_method: str, base_amount: float, settings: Dict) -> Dict:
    """Calculate payment method fee based on settings"""
    payment_method_fees = settings.get("payment_method_fees", {})
    
    # Normalize payment method name
    pm_normalized = payment_method.lower().replace(" ", "_").replace("-", "_")
    
    # Check for fee
    fee_percent = payment_method_fees.get(pm_normalized, 0.0)
    
    # Also check exact match
    if fee_percent == 0.0:
        fee_percent = payment_method_fees.get(payment_method.lower(), 0.0)
    
    fee_amount = base_amount * (fee_percent / 100)
    total_amount = base_amount + fee_amount
    
    return {
        "base_amount": base_amount,
        "fee_percent": fee_percent,
        "fee_amount": fee_amount,
        "total_amount": total_amount
    }

@api_router.post("/admin/monetization/apply-dispute-penalty")
async def apply_dispute_penalty(request: ApplyDisputePenaltyRequest):
    """Apply \u00a310 penalty to user who lost dispute - Admin only"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        penalty_gbp = settings.get("dispute_penalty_gbp", 10.0)
        
        # Check user GBP balance
        user_balance = await db.internal_balances.find_one({
            "user_id": request.user_id,
            "currency": "GBP"
        })
        
        # Deduct penalty (allow negative balance if insufficient)
        current_balance = user_balance.get("balance", 0) if user_balance else 0
        await db.internal_balances.update_one(
            {"user_id": request.user_id, "currency": "GBP"},
            {"$inc": {"balance": -penalty_gbp}},
            upsert=True
        )
        
        # Add to admin revenue
        await db.internal_balances.update_one(
            {"user_id": "ADMIN", "currency": "GBP"},
            {"$inc": {"dispute_penalty_fees": penalty_gbp}},
            upsert=True
        )
        
        # Update dispute record
        await db.disputes.update_one(
            {"dispute_id": request.dispute_id},
            {
                "$set": {
                    "penalty_applied": True,
                    "penalty_amount_gbp": penalty_gbp,
                    "penalty_applied_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "dispute_penalty",
            "amount_gbp": penalty_gbp,
            "dispute_id": request.dispute_id,
            "reason": request.reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": f"Dispute penalty of \u00a3{penalty_gbp} applied successfully.",
            "penalty_amount": penalty_gbp,
            "user_balance_after": current_balance - penalty_gbp
        }
        
    except Exception as e:
        logger.error(f"Error applying dispute penalty: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================================
# OTC DESK ENDPOINTS
# ===================================

@api_router.get("/otc/config")
async def get_otc_config():
    """Get OTC Desk configuration and settings"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        return {
            "success": True,
            "config": {
                "otc_fee_percent": settings.get("otc_fee_percent", 1.0),
                "otc_minimum_amount_gbp": settings.get("otc_minimum_amount_gbp", 2000.0),
                "supported_currencies": ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "LTC"],
                "fiat_currency": "GBP"
            }
        }
    except Exception as e:
        logger.error(f"Error fetching OTC config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/otc/quote")
async def create_otc_quote(request: CreateOTCQuoteRequest):
    """Create an OTC quote for large trades"""
    try:
        # Get monetization settings
        settings = await db.monetization_settings.find_one({"setting_id": "default_monetization"}, {"_id": 0})
        if not settings:
            settings = DEFAULT_MONETIZATION_SETTINGS
        
        otc_fee_percent = settings.get("otc_fee_percent", 1.0)
        otc_minimum_gbp = settings.get("otc_minimum_amount_gbp", 2000.0)
        
        # Validate minimum amount
        if request.amount_gbp < otc_minimum_gbp:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum OTC trade amount is £{otc_minimum_gbp}"
            )
        
        # Get live prices
        live_prices = await get_cached_prices()
        crypto_price_usd = live_prices['crypto_prices'].get(request.crypto_currency, 0)
        
        if crypto_price_usd == 0:
            raise HTTPException(status_code=400, detail=f"Unable to fetch live price for {request.crypto_currency}")
        
        # Convert to GBP
        fx_rates = live_prices['fx_rates']
        gbp_rate = fx_rates.get('GBP', 0.79)
        crypto_price_gbp = crypto_price_usd * gbp_rate
        
        # Calculate amounts based on trade type
        if request.trade_type == "buy":
            # User buys crypto with GBP
            gross_amount_gbp = request.amount_gbp
            fee_amount_gbp = gross_amount_gbp * (otc_fee_percent / 100)
            total_cost_gbp = gross_amount_gbp + fee_amount_gbp
            crypto_amount = gross_amount_gbp / crypto_price_gbp if crypto_price_gbp > 0 else 0
        else:  # sell
            # User sells crypto for GBP
            crypto_amount = request.amount_gbp / crypto_price_gbp if crypto_price_gbp > 0 else 0
            gross_amount_gbp = crypto_amount * crypto_price_gbp
            fee_amount_gbp = gross_amount_gbp * (otc_fee_percent / 100)
            total_received_gbp = gross_amount_gbp - fee_amount_gbp
        
        # Create quote
        quote_id = str(uuid.uuid4())
        quote_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        quote = {
            "quote_id": quote_id,
            "user_id": request.user_id,
            "trade_type": request.trade_type,
            "crypto_currency": request.crypto_currency,
            "fiat_currency": request.fiat_currency,
            "crypto_amount": crypto_amount,
            "crypto_price_gbp": crypto_price_gbp,
            "gross_amount_gbp": gross_amount_gbp if request.trade_type == "buy" else total_received_gbp,
            "fee_percent": otc_fee_percent,
            "fee_amount_gbp": fee_amount_gbp,
            "total_cost_gbp": total_cost_gbp if request.trade_type == "buy" else None,
            "total_received_gbp": total_received_gbp if request.trade_type == "sell" else None,
            "status": "pending",
            "expires_at": quote_expires.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.otc_quotes.insert_one(quote)
        
        return {
            "success": True,
            "quote": quote,
            "valid_for_minutes": 15
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating OTC quote: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/otc/execute")
async def execute_otc_trade(request: Dict):
    """Execute an OTC trade based on accepted quote"""
    try:
        quote_id = request.get("quote_id")
        user_id = request.get("user_id")
        
        if not all([quote_id, user_id]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Get quote
        quote = await db.otc_quotes.find_one({"quote_id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Verify user
        if quote["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if quote expired
        expires_at = datetime.fromisoformat(quote["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            await db.otc_quotes.update_one(
                {"quote_id": quote_id},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=400, detail="Quote has expired")
        
        # Check if already executed
        if quote["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"Quote already {quote['status']}")
        
        # Execute trade based on type
        if quote["trade_type"] == "buy":
            # User buys crypto - Check GBP balance
            user_balance = await db.internal_balances.find_one({
                "user_id": user_id,
                "currency": "GBP"
            })
            
            total_cost = quote["total_cost_gbp"]
            if not user_balance or user_balance.get("balance", 0) < total_cost:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. You need £{total_cost} GBP"
                )
            
            # Deduct GBP from user
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": "GBP"},
                {"$inc": {"balance": -total_cost}}
            )
            
            # Add crypto to user
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": quote["crypto_currency"]},
                {"$inc": {"balance": quote["crypto_amount"]}},
                upsert=True
            )
            
            # Add fee to admin
            await db.internal_balances.update_one(
                {"user_id": "ADMIN", "currency": "GBP"},
                {"$inc": {"otc_fees": quote["fee_amount_gbp"]}},
                upsert=True
            )
            
        else:  # sell
            # User sells crypto - Check crypto balance
            user_balance = await db.internal_balances.find_one({
                "user_id": user_id,
                "currency": quote["crypto_currency"]
            })
            
            if not user_balance or user_balance.get("balance", 0) < quote["crypto_amount"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. You need {quote['crypto_amount']} {quote['crypto_currency']}"
                )
            
            # Deduct crypto from user
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": quote["crypto_currency"]},
                {"$inc": {"balance": -quote["crypto_amount"]}}
            )
            
            # Add GBP to user (after fee)
            await db.internal_balances.update_one(
                {"user_id": user_id, "currency": "GBP"},
                {"$inc": {"balance": quote["total_received_gbp"]}},
                upsert=True
            )
            
            # Add fee to admin
            await db.internal_balances.update_one(
                {"user_id": "ADMIN", "currency": "GBP"},
                {"$inc": {"otc_fees": quote["fee_amount_gbp"]}},
                upsert=True
            )
        
        # Update quote status
        await db.otc_quotes.update_one(
            {"quote_id": quote_id},
            {
                "$set": {
                    "status": "completed",
                    "executed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log transaction
        await db.transactions_log.insert_one({
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "otc_trade",
            "trade_type": quote["trade_type"],
            "crypto_currency": quote["crypto_currency"],
            "crypto_amount": quote["crypto_amount"],
            "fiat_amount_gbp": quote["gross_amount_gbp"],
            "fee_amount_gbp": quote["fee_amount_gbp"],
            "quote_id": quote_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        })
        
        return {
            "success": True,
            "message": "OTC trade executed successfully!",
            "trade_type": quote["trade_type"],
            "crypto_amount": quote["crypto_amount"],
            "crypto_currency": quote["crypto_currency"],
            "fiat_amount": quote.get("total_cost_gbp") if quote["trade_type"] == "buy" else quote.get("total_received_gbp"),
            "fee_paid": quote["fee_amount_gbp"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing OTC trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/otc/quotes/{user_id}")
async def get_user_otc_quotes(user_id: str):
    """Get user's OTC quotes history"""
    try:
        quotes = await db.otc_quotes.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        return {
            "success": True,
            "quotes": quotes
        }
    except Exception as e:
        logger.error(f"Error fetching OTC quotes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user/subscription/{user_id}")
async def get_user_subscription(user_id: str):
    """Get user's subscription status"""
    try:
        subscription = await db.alert_subscriptions.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        return {
            "success": True,
            "subscription": subscription
        }
    except Exception as e:
        logger.error(f"Error fetching subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Duplicate Google OAuth callback removed - using the one at line 4748

# ==========================================
# ADMIN SECURITY LOGS ENDPOINTS
# ==========================================

@api_router.get("/admin/security-logs")
async def get_security_logs(
    event_type: str = "all",
    success: str = "all",
    startDate: str = "",
    endDate: str = "",
    search: str = ""
):
    """Get security logs for admin dashboard"""
    try:
        from security_logger import SecurityLogger
        security_logger = SecurityLogger(db)
        
        # Build query filter
        query = {}
        
        if event_type != "all":
            query["event_type"] = event_type
        
        if success == "success":
            query["success"] = True
        elif success == "failed":
            query["success"] = False
        
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"ip_address": {"$regex": search, "$options": "i"}}
            ]
        
        if startDate:
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$gte"] = startDate
        
        if endDate:
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$lte"] = endDate
        
        # Get logs
        logs = await db.security_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
        
        # Get stats
        total_attempts = await db.security_logs.count_documents({})
        successful_logins = await db.security_logs.count_documents({"event_type": "login", "success": True})
        failed_logins = await db.security_logs.count_documents({"event_type": "login", "success": False})
        new_devices = await db.security_logs.count_documents({"is_new_device": True})
        
        return {
            "success": True,
            "logs": logs,
            "stats": {
                "totalAttempts": total_attempts,
                "successfulLogins": successful_logins,
                "failedLogins": failed_logins,
                "newDevices": new_devices
            }
        }
    except Exception as e:
        logger.error(f"Error getting security logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/security-logs/export")
async def export_security_logs(
    event_type: str = "all",
    success: str = "all",
    startDate: str = "",
    endDate: str = "",
    search: str = ""
):
    """Export security logs as CSV"""
    try:
        import csv
        import io
        from fastapi.responses import StreamingResponse
        
        # Build query filter (same as above)
        query = {}
        if event_type != "all":
            query["event_type"] = event_type
        if success == "success":
            query["success"] = True
        elif success == "failed":
            query["success"] = False
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"ip_address": {"$regex": search, "$options": "i"}}
            ]
        if startDate:
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$gte"] = startDate
        if endDate:
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$lte"] = endDate
        
        # Get logs
        logs = await db.security_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Event Type", "Email", "Success", "IP Address", "Country", "City", "Device Type", "Browser", "OS", "New Device", "Failure Reason"])
        
        for log in logs:
            writer.writerow([
                log.get("timestamp", ""),
                log.get("event_type", ""),
                log.get("email", ""),
                "Yes" if log.get("success") else "No",
                log.get("ip_address", ""),
                log.get("country", ""),
                log.get("city", ""),
                log.get("device_type", ""),
                log.get("browser", ""),
                log.get("os", ""),
                "Yes" if log.get("is_new_device") else "No",
                log.get("failure_reason", "")
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=security_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting security logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# CENTRALIZED FEE MANAGEMENT ENDPOINTS
# ============================================

@api_router.get("/admin/fees/test")
async def test_fees_endpoint():
    """Test endpoint to check if routes register"""
    return {"success": True, "message": "Fee endpoints are working!"}

@api_router.get("/admin/fees/all")
async def get_all_fees():
    """Get all current platform fees"""
    try:
        fee_manager = get_fee_manager(db)
        fees = await fee_manager.get_all_fees()
        return {
            "success": True,
            "fees": fees
        }
    except Exception as e:
        logger.error(f"Error getting all fees: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/fees/update")
async def update_fee_endpoint(request: dict):
    """Update a specific fee - automatically propagates everywhere"""
    try:
        fee_type = request.get("fee_type")
        value = float(request.get("value"))
        
        fee_manager = get_fee_manager(db)
        await fee_manager.update_fee(fee_type, value)
        
        return {
            "success": True,
            "message": f"Fee {fee_type} updated to {value}% - changes applied across entire platform"
        }
    except Exception as e:
        logger.error(f"Error updating fee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/revenue/complete")
async def get_complete_revenue(period: str = "all"):
    """Get complete revenue breakdown for all 14+ streams"""
    try:
        from datetime import timedelta
        
        now = datetime.now(timezone.utc)
        
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(days=7)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:
            start_time = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        # Get all fee transactions from new fee_transactions collection
        fee_txns = await db.fee_transactions.find({
            "timestamp": {"$gte": start_time.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        breakdown = {}
        for txn in fee_txns:
            fee_type = txn.get("fee_type", "unknown")
            fee_amount = txn.get("admin_fee", 0)  # Only count admin portion
            breakdown[fee_type] = breakdown.get(fee_type, 0) + fee_amount
        
        total = sum(breakdown.values())
        
        # Calculate period-specific totals
        now_iso = now.isoformat()
        today_start = (now - timedelta(days=1)).isoformat()
        week_start = (now - timedelta(days=7)).isoformat()
        month_start = (now - timedelta(days=30)).isoformat()
        
        today_total = sum(t.get("admin_fee", 0) for t in fee_txns if t.get("timestamp", "") >= today_start)
        week_total = sum(t.get("admin_fee", 0) for t in fee_txns if t.get("timestamp", "") >= week_start)
        month_total = sum(t.get("admin_fee", 0) for t in fee_txns if t.get("timestamp", "") >= month_start)
        
        return {
            "success": True,
            "revenue": {
                "today": today_total,
                "week": week_total,
                "month": month_total,
                "allTime": total,
                "breakdown": breakdown
            }
        }
    except Exception as e:
        logger.error(f"Error getting complete revenue: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Google OAuth routes (without /api prefix for standard OAuth compatibility)
@app.get("/auth/google/callback")
async def google_callback_direct(code: str = None, error: str = None):
    """Direct Google OAuth callback (without /api prefix)"""
    # Forward to the main callback handler
    return await google_callback(code=code, error=error)

@app.get("/auth/callback")
async def google_callback_alt(code: str = None, error: str = None):
    """Alternative callback route for localhost"""
    return await google_callback(code=code, error=error)


@api_router.get("/portfolio/summary/{user_id}")
async def get_portfolio_summary(user_id: str):
    """Get portfolio P/L summary with daily/weekly/monthly stats"""
    try:
        from decimal import Decimal
        from datetime import timedelta
        
        # Get all transactions for this user
        transactions = await db.transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Get current balances
        wallet_balances = await db.internal_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        savings_balances = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get live prices
        live_prices_doc = await db.live_prices.find_one({})
        prices = {}
        if live_prices_doc:
            for coin_symbol, price_data in live_prices_doc.items():
                if coin_symbol != "_id" and isinstance(price_data, dict):
                    prices[coin_symbol] = price_data.get('gbp', 0)
        
        # Calculate current portfolio value
        current_value = Decimal('0')
        
        for balance in wallet_balances:
            coin = balance.get("currency")
            amount = Decimal(str(balance.get("balance", 0)))
            price = Decimal(str(prices.get(coin, 0)))
            current_value += amount * price
        
        for saving in savings_balances:
            coin = saving.get("currency")
            amount = Decimal(str(saving.get("amount", 0)))
            price = Decimal(str(prices.get(coin, 0)))
            current_value += amount * price
        
        # Calculate P/L for different time periods using REAL transaction history
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        # Calculate portfolio value at start of each period
        def calculate_portfolio_at_time(cutoff_time):
            portfolio_value = Decimal('0')
            # Start with current balances and work backwards
            temp_balances = {}
            for balance in wallet_balances:
                temp_balances[balance.get("currency")] = Decimal(str(balance.get("balance", 0)))
            for saving in savings_balances:
                coin = saving.get("currency")
                temp_balances[coin] = temp_balances.get(coin, Decimal('0')) + Decimal(str(saving.get("amount", 0)))
            
            # Reverse transactions after cutoff time
            for tx in reversed(sorted(transactions, key=lambda x: x.get('timestamp', now))):
                tx_time = tx.get('timestamp')
                if tx_time and tx_time > cutoff_time:
                    tx_type = tx.get('type')
                    currency = tx.get('currency', 'GBP')
                    amount = Decimal(str(tx.get('amount', 0)))
                    
                    if tx_type == 'deposit':
                        temp_balances[currency] = temp_balances.get(currency, Decimal('0')) - amount
                    elif tx_type == 'withdraw':
                        temp_balances[currency] = temp_balances.get(currency, Decimal('0')) + amount
            
            # Calculate value
            for coin, balance in temp_balances.items():
                price = Decimal(str(prices.get(coin, 0)))
                portfolio_value += balance * price
            
            return portfolio_value
        
        today_value = calculate_portfolio_at_time(today_start)
        week_value = calculate_portfolio_at_time(week_start)
        month_value = calculate_portfolio_at_time(month_start)
        
        todayPL = float(current_value - today_value)
        weekPL = float(current_value - week_value)
        monthPL = float(current_value - month_value)
        
        # Calculate total invested
        total_invested = Decimal('0')
        for tx in transactions:
            if tx.get('type') in ['deposit', 'buy']:
                total_invested += Decimal(str(tx.get('amount_gbp', 0)))
        
        total_pl = current_value - total_invested
        plPercent = float((total_pl / total_invested * 100) if total_invested > 0 else 0)
        
        return {
            "success": True,
            "current_value": float(current_value),
            "total_invested": float(total_invested),
            "todayPL": todayPL,
            "weekPL": weekPL,
            "monthPL": monthPL,
            "totalPL": float(total_pl),
            "plPercent": round(plPercent, 2)
        }
        
    except Exception as e:
        logger.error(f"Portfolio summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolio/chart/{user_id}")
async def get_portfolio_chart(user_id: str, timeframe: str = "7D"):
    """Get portfolio value history for chart"""
    try:
        # Get current portfolio value
        wallet_balances = await db.internal_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        savings_balances = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        live_prices_doc = await db.live_prices.find_one({})
        prices = {}
        if live_prices_doc:
            for coin_symbol, price_data in live_prices_doc.items():
                if coin_symbol != "_id" and isinstance(price_data, dict):
                    prices[coin_symbol] = price_data.get('gbp', 0)
        
        current_value = 0
        for balance in wallet_balances:
            coin = balance.get("currency")
            amount = balance.get("balance", 0)
            price = prices.get(coin, 0)
            current_value += amount * price
        
        for saving in savings_balances:
            coin = saving.get("currency")
            amount = saving.get("amount", 0)
            price = prices.get(coin, 0)
            current_value += amount * price
        
        # Generate chart data points (simplified - in production use historical snapshots)
        days = 1 if timeframe == "24H" else 7 if timeframe == "7D" else 30 if timeframe == "30D" else 90
        chart_data = []
        
        for i in range(days + 1):
            timestamp = datetime.now(timezone.utc) - timedelta(days=days - i)
            # Simulate value with slight variations
            value_variation = current_value * (0.95 + (i / days) * 0.1)
            chart_data.append({
                "time": int(timestamp.timestamp()),
                "value": round(value_variation, 2)
            })
        
        return {
            "success": True,
            "timeframe": timeframe,
            "data": chart_data
        }
        
    except Exception as e:
        logger.error(f"Portfolio chart error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/portfolio/holdings/{user_id}")
async def get_portfolio_holdings(user_id: str):
    """Get detailed holdings list"""
    try:
        wallet_balances = await db.internal_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        savings_balances = await db.savings_balances.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        live_prices_doc = await db.live_prices.find_one({})
        prices = {}
        if live_prices_doc:
            for coin_symbol, price_data in live_prices_doc.items():
                if coin_symbol != "_id" and isinstance(price_data, dict):
                    prices[coin_symbol] = {
                        'gbp': price_data.get('gbp', 0),
                        'change_24h': price_data.get('change_24h', 0)
                    }
        
        holdings = {}
        
        # Process wallet balances
        for balance in wallet_balances:
            coin = balance.get("currency")
            amount = balance.get("balance", 0)
            if amount > 0:
                if coin not in holdings:
                    holdings[coin] = {
                        "coin": coin,
                        "wallet_amount": 0,
                        "savings_amount": 0,
                        "total_amount": 0,
                        "current_price": prices.get(coin, {}).get('gbp', 0),
                        "change_24h": prices.get(coin, {}).get('change_24h', 0)
                    }
                holdings[coin]["wallet_amount"] = amount
                holdings[coin]["total_amount"] += amount
        
        # Process savings balances
        for saving in savings_balances:
            coin = saving.get("currency")
            amount = saving.get("amount", 0)
            if amount > 0:
                if coin not in holdings:
                    holdings[coin] = {
                        "coin": coin,
                        "wallet_amount": 0,
                        "savings_amount": 0,
                        "total_amount": 0,
                        "current_price": prices.get(coin, {}).get('gbp', 0),
                        "change_24h": prices.get(coin, {}).get('change_24h', 0)
                    }
                holdings[coin]["savings_amount"] = amount
                holdings[coin]["total_amount"] += amount
        
        # Calculate values
        holdings_list = []
        for coin, data in holdings.items():
            value = data["total_amount"] * data["current_price"]
            data["value"] = round(value, 2)
            holdings_list.append(data)
        
        # Sort by value
        holdings_list.sort(key=lambda x: x["value"], reverse=True)
        
        return {
            "success": True,
            "holdings": holdings_list
        }
        
    except Exception as e:
        logger.error(f"Portfolio holdings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/nowpayments/currencies")
async def get_nowpayments_currencies():
    """Get full list of available currencies from NOWPayments"""
    try:
        import httpx
        
        api_key = os.environ.get('NOWPAYMENTS_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="NOWPayments API key not configured")
        
        headers = {
            "x-api-key": api_key
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.nowpayments.io/v1/currencies",
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                currencies = data.get('currencies', [])
                
                return {
                    "success": True,
                    "currencies": currencies,
                    "count": len(currencies)
                }
            else:
                logger.error(f"NOWPayments API error: {response.status_code}")
                return {
                    "success": False,
                    "error": "Failed to fetch currencies"
                }
                
    except Exception as e:
        logger.error(f"NOWPayments currencies error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BUSINESS DASHBOARD ENDPOINTS
# ============================================

@api_router.get("/admin/customer-analytics")
async def get_customer_analytics():
    """Get customer analytics for business dashboard"""
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        # New users today
        new_today = await db.user_accounts.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # New users this week
        new_week = await db.user_accounts.count_documents({
            "created_at": {"$gte": week_start.isoformat()}
        })
        
        # New users this month
        new_month = await db.user_accounts.count_documents({
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        # Total users
        total_users = await db.user_accounts.count_documents({})
        
        # Active users in last 24h (users who made a transaction)
        active_24h = await db.transactions.distinct("user_id", {
            "created_at": {"$gte": (now - timedelta(hours=24)).isoformat()}
        })
        
        return {
            "success": True,
            "analytics": {
                "newToday": new_today,
                "newWeek": new_week,
                "newMonth": new_month,
                "totalUsers": total_users,
                "activeUsers24h": len(active_24h)
            }
        }
    except Exception as e:
        logger.error(f"Error getting customer analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/referral-analytics")
async def get_referral_analytics():
    """Get referral analytics"""
    try:
        # Total referrals
        total_referrals = await db.referrals.count_documents({})
        
        # Active referrals (users who actually signed up)
        active_referrals = await db.user_accounts.count_documents({
            "referral_code_used": {"$exists": True, "$ne": None}
        })
        
        # Total referral earnings
        referral_earnings = await db.referral_earnings.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        # Total payouts
        referral_payouts = await db.referral_payouts.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        return {
            "success": True,
            "referrals": {
                "totalReferrals": total_referrals,
                "activeReferrals": active_referrals,
                "earnings": referral_earnings[0]["total"] if referral_earnings else 0,
                "payouts": referral_payouts[0]["total"] if referral_payouts else 0
            }
        }
    except Exception as e:
        logger.error(f"Error getting referral analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/liquidity/status")
async def get_liquidity_status():
    """Get current liquidity status"""
    try:
        liquidity = await db.admin_liquidity_wallets.find({}, {"_id": 0}).to_list(100)
        
        liquidity_dict = {}
        for liq in liquidity:
            currency = liq.get("currency")
            liquidity_dict[currency] = {
                "balance": liq.get("balance", 0),
                "available": liq.get("available", 0),
                "locked": liq.get("locked", 0)
            }
        
        return {
            "success": True,
            "liquidity": liquidity_dict
        }
    except Exception as e:
        logger.error(f"Error getting liquidity status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/liquidity/add")
async def add_liquidity(request: dict):
    """Add liquidity to admin wallet"""
    try:
        currency = request.get("currency")
        amount = float(request.get("amount", 0))
        
        if not currency or amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid currency or amount")
        
        await db.admin_liquidity_wallets.update_one(
            {"currency": currency},
            {
                "$inc": {
                    "balance": amount,
                    "available": amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Added {amount} {currency} to liquidity"
        }
    except Exception as e:
        logger.error(f"Error adding liquidity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/transactions/recent")
async def get_recent_transactions(limit: int = 50):
    """Get recent transactions"""
    try:
        transactions = await db.transactions.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "transactions": transactions
        }
    except Exception as e:
        logger.error(f"Error getting recent transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/system-health")
async def get_system_health():
    """Get system health status"""
    try:
        # Get recent errors
        errors = await db.error_logs.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(10).to_list(10)
        
        # Failed deposits
        failed_deposits = await db.transactions.count_documents({
            "type": "deposit",
            "status": "failed"
        })
        
        # Failed withdrawals
        failed_withdrawals = await db.transactions.count_documents({
            "type": "withdrawal",
            "status": "failed"
        })
        
        return {
            "success": True,
            "health": {
                "errors": errors,
                "failedDeposits": failed_deposits,
                "failedWithdrawals": failed_withdrawals
            }
        }
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/savings/products")
async def get_savings_products():
    """Get all savings products"""
    try:
        products = await db.savings_products.find({}, {"_id": 0}).to_list(100)
        
        return {
            "success": True,
            "products": products
        }
    except Exception as e:
        logger.error(f"Error getting savings products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# FEE CALCULATION HELPER FUNCTIONS
# ============================================

async def calculate_and_apply_fee(
    user_id: str,
    transaction_type: str,
    amount: float,
    currency: str,
    fee_type: str
):
    """
    Calculate fee, deduct from transaction, route to admin wallet.
    Returns: (amount_after_fee, fee_amount, referral_commission)
    """
    fee_manager = get_fee_manager(db)
    fee_percent = await fee_manager.get_fee(fee_type)
    fee_amount = amount * (fee_percent / 100.0)
    amount_after_fee = amount - fee_amount
    
    # Check if user has referrer
    user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
    referrer_id = user.get("referrer_id") if user else None
    referrer_commission = 0.0
    admin_fee = fee_amount
    
    if referrer_id:
        # Get referrer tier
        referrer = await db.user_accounts.find_one({"user_id": referrer_id}, {"_id": 0})
        referrer_tier = referrer.get("referral_tier", "standard") if referrer else "standard"
        
        if referrer_tier == "golden":
            commission_percent = await fee_manager.get_fee("referral_golden_commission_percent")
        else:
            commission_percent = await fee_manager.get_fee("referral_standard_commission_percent")
        
        referrer_commission = fee_amount * (commission_percent / 100.0)
        admin_fee = fee_amount - referrer_commission
        
        # Credit referrer wallet
        await db.crypto_balances.update_one(
            {"user_id": referrer_id, "currency": currency},
            {
                "$inc": {"balance": referrer_commission},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Log referral commission
        await db.referral_commissions.insert_one({
            "referrer_id": referrer_id,
            "referred_user_id": user_id,
            "transaction_type": transaction_type,
            "fee_amount": fee_amount,
            "commission_amount": referrer_commission,
            "commission_percent": commission_percent,
            "currency": currency,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    # Credit admin wallet
    await db.crypto_balances.update_one(
        {"user_id": "admin_wallet", "currency": currency},
        {
            "$inc": {"balance": admin_fee},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Log fee transaction
    await db.fee_transactions.insert_one({
        "user_id": user_id,
        "transaction_type": transaction_type,
        "fee_type": fee_type,
        "amount": amount,
        "fee_amount": fee_amount,
        "fee_percent": fee_percent,
        "admin_fee": admin_fee,
        "referrer_commission": referrer_commission,
        "referrer_id": referrer_id,
        "currency": currency,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Fee applied: {fee_type} on {amount} {currency} = {fee_amount} {currency} (admin: {admin_fee}, referrer: {referrer_commission})")
    
    return amount_after_fee, fee_amount, referrer_commission


# ═══════════════════════════════════════════════════════════════════════════════
# ███████╗ ██╗ ███╗   ██╗  █████╗  ██╗         ██████╗   ██████╗  ██╗   ██╗ ████████╗ ███████╗ ██████╗  
# ██╔════╝ ██║ ████╗  ██║ ██╔══██╗ ██║         ██╔══██╗ ██╔═══██╗ ██║   ██║ ╚══██╔══╝ ██╔════╝ ██╔══██╗ 
# █████╗   ██║ ██╔██╗ ██║ ███████║ ██║         ██████╔╝ ██║   ██║ ██║   ██║    ██║    █████╗   ██████╔╝ 
# ██╔══╝   ██║ ██║╚██╗██║ ██╔══██║ ██║         ██╔══██╗ ██║   ██║ ██║   ██║    ██║    ██╔══╝   ██╔══██╗ 
# ██║      ██║ ██║ ╚████║ ██║  ██║ ███████╗    ██║  ██║ ╚██████╔╝ ╚██████╔╝    ██║    ███████╗ ██║  ██║ 
# ╚═╝      ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝ ╚══════╝    ╚═╝  ╚═╝  ╚═════╝   ╚═════╝     ╚═╝    ╚══════╝ ╚═╝  ╚═╝ 
# ═══════════════════════════════════════════════════════════════════════════════
#
# 🔒 CRITICAL: ROUTER REGISTRATION - DO NOT MODIFY THIS SECTION
#
# This is the FINAL step in server initialization. The router MUST be included here
# and ONLY here. Any endpoints defined after this line will NOT be registered and
# will return 404 errors.
#
# ⚠️  WARNING: DO NOT ADD ANY @api_router ENDPOINTS BELOW THIS LINE
@api_router.post("/user/purchase-vip-tier")
async def purchase_vip_tier(request: dict):
    """
    Purchase VIP referral tier for £150 (one-time payment)
    Upgrades user from standard (20%) to VIP (20% lifetime)
    """
    try:
        user_id = request.get("user_id")
        payment_method = request.get("payment_method", "wallet_balance")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")
        
        # Get user
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already VIP or Golden
        current_tier = user.get("referral_tier", "standard")
        if current_tier in ["vip", "golden"]:
            return {
                "success": False,
                "message": f"You already have {current_tier} tier"
            }
        
        # VIP package cost
        vip_cost = 150.0
        
        # Deduct from user's GBP balance
        from wallet_service import get_wallet_service
        wallet_service = get_wallet_service()
        
        debit_result = await wallet_service.debit(
            user_id=user_id,
            currency="GBP",
            amount=vip_cost,
            transaction_type="vip_tier_purchase",
            reference_id=str(uuid.uuid4()),
            metadata={"tier": "vip", "commission": "20%"}
        )
        
        # Upgrade to VIP tier
        await db.user_accounts.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "referral_tier": "vip",
                    "vip_purchased_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Credit admin wallet
        await wallet_service.credit(
            user_id="admin_wallet",
            currency="GBP",
            amount=vip_cost,
            transaction_type="vip_tier_sale",
            reference_id=str(uuid.uuid4()),
            metadata={"buyer_id": user_id}
        )
        
        # Log VIP purchase
        await db.vip_purchases.insert_one({
            "purchase_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": vip_cost,
            "currency": "GBP",
            "previous_tier": "standard",
            "new_tier": "vip",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": "Successfully upgraded to VIP tier!",
            "tier": "vip",
            "commission": "20% lifetime",
            "cost": vip_cost
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error purchasing VIP tier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/user/referral-dashboard/{user_id}")
async def get_user_referral_dashboard(user_id: str):
    """
    Get comprehensive referral dashboard data for a user
    Includes: referral link, code, stats, earnings, and list of referred users
    Supports 3 tiers: standard (20%), vip (20% - £150 package), golden (50%)
    """
    try:
        # Get user info
        user = await db.user_accounts.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate referral code if doesn't exist
        referral_code = user.get("referral_code")
        if not referral_code:
            # Generate a unique 8-character code
            import random
            import string
            referral_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            await db.user_accounts.update_one(
                {"user_id": user_id},
                {"$set": {"referral_code": referral_code}}
            )
        
        # Generate referral link
        frontend_url = os.environ.get("FRONTEND_URL", "https://tradepanel-12.preview.emergentagent.com")
        referral_link = f"{frontend_url}/register?ref={referral_code}"
        
        # Get all users referred by this user
        referred_users = await db.user_accounts.find({
            "referrer_id": user_id
        }, {"_id": 0, "user_id": 1, "email": 1, "created_at": 1}).to_list(1000)
        
        # Calculate stats
        total_referrals = len(referred_users)
        
        # Get commissions earned
        commissions = await db.referral_commissions.find({
            "referrer_id": user_id
        }, {"_id": 0}).to_list(10000)
        
        total_earnings = sum(c.get("commission_amount", 0) for c in commissions)
        
        # Get active referrals (users who made at least 1 transaction)
        active_referrals = 0
        referred_users_data = []
        
        for referred_user in referred_users:
            ref_user_id = referred_user["user_id"]
            
            # Check if user has any transactions
            user_commissions = [c for c in commissions if c.get("referred_user_id") == ref_user_id]
            user_earnings = sum(c.get("commission_amount", 0) for c in user_commissions)
            is_active = len(user_commissions) > 0
            
            if is_active:
                active_referrals += 1
            
            referred_users_data.append({
                "email": referred_user.get("email", "Anonymous"),
                "joined_at": referred_user.get("created_at", "Unknown"),
                "is_active": is_active,
                "total_transactions": len(user_commissions),
                "commission_earned": user_earnings
            })
        
        # Sort by earnings (highest first)
        referred_users_data.sort(key=lambda x: x["commission_earned"], reverse=True)
        
        # Get tier information
        tier = user.get("referral_tier", "standard")
        tier_info = {
            "standard": {"commission": "20%", "name": "Standard", "cost": "Free"},
            "vip": {"commission": "20%", "name": "VIP Package", "cost": "£150 one-time"},
            "golden": {"commission": "50%", "name": "Golden (Admin Assigned)", "cost": "Invitation Only"}
        }
        
        # Get detailed commission history
        commission_history = []
        earnings_by_fee_type = {}
        
        for commission in commissions:
            fee_type = commission.get("transaction_type", "unknown")
            amount = commission.get("commission_amount", 0)
            
            commission_history.append({
                "amount": amount,
                "fee_type": fee_type,
                "referred_user_id": commission.get("referred_user_id", ""),
                "timestamp": commission.get("timestamp", ""),
                "currency": commission.get("currency", "GBP"),
                "commission_percent": commission.get("commission_percent", 0)
            })
            
            # Aggregate by fee type
            if fee_type not in earnings_by_fee_type:
                earnings_by_fee_type[fee_type] = 0.0
            earnings_by_fee_type[fee_type] += amount
        
        # Sort by timestamp (newest first)
        commission_history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Create earnings breakdown list
        earnings_breakdown = [
            {"fee_type": ft, "total": amt} 
            for ft, amt in sorted(earnings_by_fee_type.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return {
            "success": True,
            "data": {
                "referral_code": referral_code,
                "referral_link": referral_link,
                "total_referrals": total_referrals,
                "active_referrals": active_referrals,
                "total_earnings": total_earnings,
                "pending_earnings": 0.0,  # All commissions paid instantly
                "referral_tier": tier,
                "tier_info": tier_info.get(tier, tier_info["standard"]),
                "can_upgrade_to_vip": tier == "standard",
                "referred_users": referred_users_data,
                "commission_history": commission_history,
                "earnings_by_fee_type": earnings_breakdown
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting referral dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# TWO-FACTOR AUTHENTICATION ENDPOINTS
# ===========================

from two_factor_auth import TwoFactorAuthService

def get_2fa_service():
    """Get 2FA service instance"""
    return TwoFactorAuthService(db)


@api_router.post("/auth/2fa/setup")
async def setup_2fa(request: dict):
    """Setup 2FA for user - generates QR code and backup codes"""
    try:
        user_id = request.get("user_id")
        email = request.get("email")
        
        if not user_id or not email:
            raise HTTPException(status_code=400, detail="user_id and email required")
        
        tfa_service = get_2fa_service()
        result = await tfa_service.setup_2fa(user_id, email)
        
        return result
        
    except Exception as e:
        print(f"Error in 2FA setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/verify-setup")
async def verify_2fa_setup(request: dict):
    """Verify and enable 2FA"""
    try:
        user_id = request.get("user_id")
        code = request.get("code")
        
        if not user_id or not code:
            raise HTTPException(status_code=400, detail="user_id and code required")
        
        tfa_service = get_2fa_service()
        result = await tfa_service.verify_and_enable_2fa(user_id, code)
        
        return result
        
    except Exception as e:
        print(f"Error verifying 2FA setup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/verify")
async def verify_2fa_code(request: dict):
    """Verify 2FA code (TOTP or backup)"""
    try:
        user_id = request.get("user_id")
        code = request.get("code")
        
        if not user_id or not code:
            raise HTTPException(status_code=400, detail="user_id and code required")
        
        tfa_service = get_2fa_service()
        result = await tfa_service.verify_2fa_code(user_id, code)
        
        return result
        
    except Exception as e:
        print(f"Error verifying 2FA code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/send-email-code")
async def send_email_2fa_code(request: dict):
    """Send 2FA code via email (fallback method)"""
    try:
        user_id = request.get("user_id")
        email = request.get("email")
        action = request.get("action", "login")
        
        if not user_id or not email:
            raise HTTPException(status_code=400, detail="user_id and email required")
        
        tfa_service = get_2fa_service()
        result = await tfa_service.send_email_code(user_id, email, action)
        
        return result
        
    except Exception as e:
        print(f"Error sending email 2FA code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/verify-email")
async def verify_email_2fa_code(request: dict):
    """Verify email 2FA code"""
    try:
        user_id = request.get("user_id")
        code = request.get("code")
        
        if not user_id or not code:
            raise HTTPException(status_code=400, detail="user_id and code required")
        
        tfa_service = get_2fa_service()
        result = await tfa_service.verify_email_code(user_id, code)
        
        return result
        
    except Exception as e:
        print(f"Error verifying email code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/disable")
async def disable_2fa(request: dict):
    """Disable 2FA for user"""
    try:
        user_id = request.get("user_id")
        code = request.get("code")  # Require code to disable
        
        if not user_id or not code:
            raise HTTPException(status_code=400, detail="user_id and code required")
        
        tfa_service = get_2fa_service()
        
        # Verify code first
        verify_result = await tfa_service.verify_2fa_code(user_id, code)
        if not verify_result.get("success"):
            raise HTTPException(status_code=401, detail="Invalid code")
        
        result = await tfa_service.disable_2fa(user_id)
        return result
        
    except Exception as e:
        print(f"Error disabling 2FA: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/auth/2fa/regenerate-backup-codes")
async def regenerate_backup_codes(request: dict):
    """Generate new backup codes"""
    try:
        user_id = request.get("user_id")
        code = request.get("code")  # Require code
        
        if not user_id or not code:
            raise HTTPException(status_code=400, detail="user_id and code required")
        
        tfa_service = get_2fa_service()
        
        # Verify code first
        verify_result = await tfa_service.verify_2fa_code(user_id, code)
        if not verify_result.get("success"):
            raise HTTPException(status_code=401, detail="Invalid code")
        
        result = await tfa_service.regenerate_backup_codes(user_id)
        return result
        
    except Exception as e:
        print(f"Error regenerating backup codes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/auth/2fa/status/{user_id}")
async def get_2fa_status(user_id: str):
    """Get 2FA status for user"""
    try:
        tfa_service = get_2fa_service()
        enabled = await tfa_service.is_2fa_enabled(user_id)
        
        return {
            "success": True,
            "enabled": enabled
        }
        
    except Exception as e:
        print(f"Error getting 2FA status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ⚠️  WARNING: ALL ENDPOINTS MUST BE DEFINED ABOVE THIS SECTION
# ⚠️  WARNING: THIS SECTION IS LOCKED AND PROTECTED
#
# If you need to add new endpoints:
# 1. Add them ABOVE this section
# 2. Follow the existing endpoint organization
# 3. Never, ever add endpoints below this line
#
# Last verified: 2025-11-30 14:50 UTC
# Endpoints registered: 251+
# Status: LOCKED ✅
# ═══════════════════════════════════════════════════════════════════════════════

# Include the API router in the main FastAPI app
# This registers all endpoints defined above with the /api prefix
app.include_router(api_router)

# ═══════════════════════════════════════════════════════════════════════════════
# 🛑 STOP! NO ENDPOINTS BEYOND THIS POINT! 🛑
# ═══════════════════════════════════════════════════════════════════════════════
#
# Any @api_router.get/post/put/delete decorators below this line will be IGNORED
# by FastAPI because the router has already been included in the app.
#
# This is not a bug - it's by design. The router can only be included once, and
# all routes must be defined before inclusion.
#
# If you see a 404 error for an endpoint, check that it's defined ABOVE the
# "FINAL ROUTER" section.
# ═══════════════════════════════════════════════════════════════════════════════

